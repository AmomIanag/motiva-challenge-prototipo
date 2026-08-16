import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from configuracao import CONFIGURACAO, ConfiguracaoVisao, RegiaoRelativa


class ErroMedicao(Exception):
    pass


Ponto = tuple[int, int]
Segmento = tuple[Ponto, Ponto]


@dataclass(frozen=True)
class DeteccaoRegua:
    ponto_superior: Ponto
    ponto_inferior: Ponto
    candidatos: tuple[Segmento, ...]
    regiao_busca: tuple[int, int, int, int]


@dataclass(frozen=True)
class ResultadoMedicao:
    pixels_por_cm: float
    altura_cm: float
    topo_y: int
    base_y: int
    x_medicao: int
    mascara_vegetacao: np.ndarray
    deteccao_regua: DeteccaoRegua


@dataclass(frozen=True)
class LinhaVertical:
    ponto_inicial: Ponto
    ponto_final: Ponto
    inclinacao_graus: float

    @property
    def y_minimo(self) -> int:
        return min(self.ponto_inicial[1], self.ponto_final[1])

    @property
    def y_maximo(self) -> int:
        return max(self.ponto_inicial[1], self.ponto_final[1])

    @property
    def comprimento(self) -> float:
        return math.dist(self.ponto_inicial, self.ponto_final)

    def x_em(self, y: float) -> float:
        x1, y1 = self.ponto_inicial
        x2, y2 = self.ponto_final
        if y2 == y1:
            return float((x1 + x2) / 2)
        return x1 + (y - y1) * (x2 - x1) / (y2 - y1)


def converter_regiao_relativa(
    regiao: RegiaoRelativa, largura: int, altura: int
) -> tuple[int, int, int, int]:
    x_inicial = max(0, min(largura, round(regiao[0] * largura)))
    y_inicial = max(0, min(altura, round(regiao[1] * altura)))
    x_final = max(0, min(largura, round(regiao[2] * largura)))
    y_final = max(0, min(altura, round(regiao[3] * altura)))
    return x_inicial, y_inicial, x_final, y_final


def carregar_imagem(caminho_imagem: Path) -> np.ndarray:
    if not caminho_imagem.is_file():
        raise ErroMedicao(f"Imagem não encontrada: {caminho_imagem}")

    imagem = cv2.imread(str(caminho_imagem))
    if imagem is None:
        raise ErroMedicao("O arquivo informado não pôde ser lido como imagem.")

    return imagem


def _normalizar_linha(
    valores: np.ndarray, deslocamento_x: int, deslocamento_y: int
) -> LinhaVertical:
    x1, y1, x2, y2 = (int(valor) for valor in valores)
    if y1 > y2:
        x1, y1, x2, y2 = x2, y2, x1, y1
    inclinacao = math.degrees(math.atan2(x2 - x1, max(1, y2 - y1)))
    return LinhaVertical(
        (x1 + deslocamento_x, y1 + deslocamento_y),
        (x2 + deslocamento_x, y2 + deslocamento_y),
        inclinacao,
    )


def _detectar_marcas_regua(
    bordas: np.ndarray,
    esquerda: int,
    direita: int,
    y_inicial: int,
    y_final: int,
    configuracao: ConfiguracaoVisao,
) -> tuple[int, ...]:
    margem = max(2, round((direita - esquerda) * 0.12))
    largura_regua = max(1, direita - esquerda)
    recorte = bordas[
        max(0, y_inicial) : min(bordas.shape[0], y_final + 1),
        max(0, esquerda - margem) : min(bordas.shape[1], direita + margem + 1),
    ]
    if recorte.size == 0:
        return ()
    minimo = max(
        configuracao.pixels_minimos_marca_regua,
        round(largura_regua * configuracao.proporcao_minima_comprimento_marca),
    )
    centros_y = (
        np.flatnonzero(np.count_nonzero(recorte, axis=1) >= minimo)
        + max(0, y_inicial)
    ).tolist()

    centros_y.sort()
    unicos: list[int] = []
    for centro_y in centros_y:
        if not unicos or centro_y - unicos[-1] > 3:
            unicos.append(centro_y)
        else:
            unicos[-1] = round((unicos[-1] + centro_y) / 2)
    return tuple(unicos)


def _agrupar_linhas_verticais(
    linhas: tuple[LinhaVertical, ...],
    largura: int,
    configuracao: ConfiguracaoVisao,
) -> tuple[LinhaVertical, ...]:
    tolerancia_x = max(
        3, round(largura * configuracao.tolerancia_agrupamento_vertical_regua)
    )
    grupos: list[list[LinhaVertical]] = []
    for linha in sorted(linhas, key=lambda item: item.comprimento, reverse=True):
        centro_y = (linha.y_minimo + linha.y_maximo) / 2
        centro_x = linha.x_em(centro_y)
        grupo_encontrado: list[LinhaVertical] | None = None
        for grupo in grupos:
            referencia = grupo[0]
            centro_referencia_y = (
                referencia.y_minimo + referencia.y_maximo
            ) / 2
            if (
                abs(referencia.x_em(centro_referencia_y) - centro_x)
                <= tolerancia_x
                and abs(referencia.inclinacao_graus - linha.inclinacao_graus)
                <= 3.0
            ):
                grupo_encontrado = grupo
                break
        if grupo_encontrado is None:
            grupos.append([linha])
        else:
            grupo_encontrado.append(linha)

    representantes: list[tuple[float, LinhaVertical]] = []
    for grupo in grupos:
        pontos = np.array(
            [ponto for linha in grupo for ponto in (linha.ponto_inicial, linha.ponto_final)],
            dtype=np.float32,
        )
        vetor_x, vetor_y, origem_x, origem_y = (
            float(valor.item())
            for valor in cv2.fitLine(pontos, cv2.DIST_L2, 0, 0.01, 0.01)
        )
        y_minimo = min(linha.y_minimo for linha in grupo)
        y_maximo = max(linha.y_maximo for linha in grupo)
        if abs(vetor_y) < 1e-6:
            continue
        x_minimo = round(origem_x + (y_minimo - origem_y) * vetor_x / vetor_y)
        x_maximo = round(origem_x + (y_maximo - origem_y) * vetor_x / vetor_y)
        inclinacao = math.degrees(math.atan2(vetor_x, vetor_y))
        representante = LinhaVertical(
            (x_minimo, y_minimo), (x_maximo, y_maximo), inclinacao
        )
        soma_comprimentos = sum(linha.comprimento for linha in grupo)
        representantes.append((soma_comprimentos, representante))

    representantes.sort(key=lambda item: item[0], reverse=True)
    return tuple(
        linha
        for _, linha in representantes[
            : configuracao.quantidade_maxima_linhas_verticais
        ]
    )


def _calcular_proporcao_neutra(
    imagem_hsv: np.ndarray,
    esquerda: int,
    direita: int,
    y_inicial: int,
    y_final: int,
    configuracao: ConfiguracaoVisao,
) -> float:
    recorte = imagem_hsv[
        max(0, y_inicial) : min(imagem_hsv.shape[0], y_final + 1),
        max(0, esquerda) : min(imagem_hsv.shape[1], direita + 1),
    ]
    if recorte.size == 0:
        return 0.0
    saturacao = recorte[:, :, 1]
    brilho = recorte[:, :, 2]
    pixels_neutros = (
        (saturacao <= configuracao.saturacao_maxima_regua)
        & (brilho >= configuracao.brilho_minimo_regua)
        & (brilho <= configuracao.brilho_maximo_regua)
    )
    return float(np.count_nonzero(pixels_neutros) / pixels_neutros.size)


def detectar_regua(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> DeteccaoRegua:
    altura, largura = imagem.shape[:2]
    regiao_busca = converter_regiao_relativa(
        configuracao.regiao_busca_regua, largura, altura
    )
    x1_roi, y1_roi, x2_roi, y2_roi = regiao_busca
    recorte = imagem[y1_roi:y2_roi, x1_roi:x2_roi]
    if recorte.size == 0:
        raise ErroMedicao("Régua não detectada.")

    cinza = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY)
    cinza = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(cinza)
    cinza = cv2.GaussianBlur(cinza, (5, 5), 0)
    bordas_roi = cv2.Canny(
        cinza,
        configuracao.limiar_canny_regua_inferior,
        configuracao.limiar_canny_regua_superior,
    )
    comprimento_minimo = max(
        20, round(altura * configuracao.proporcao_minima_segmento_regua)
    )
    linhas_hough = cv2.HoughLinesP(
        bordas_roi,
        1,
        np.pi / 180,
        threshold=configuracao.limiar_hough_regua,
        minLineLength=comprimento_minimo,
        maxLineGap=round(
            altura * configuracao.falha_maxima_linha_regua_proporcao
        ),
    )
    if linhas_hough is None:
        raise ErroMedicao("Régua não detectada.")

    linhas_verticais = tuple(
        linha
        for linha in (
            _normalizar_linha(valores, x1_roi, y1_roi)
            for valores in linhas_hough.reshape(-1, 4)
        )
        if abs(linha.inclinacao_graus)
        <= configuracao.inclinacao_maxima_regua_graus
    )
    if len(linhas_verticais) < 2:
        raise ErroMedicao("Régua não detectada.")

    linhas_verticais = _agrupar_linhas_verticais(
        linhas_verticais, largura, configuracao
    )
    bordas = np.zeros((altura, largura), dtype=np.uint8)
    bordas[y1_roi:y2_roi, x1_roi:x2_roi] = bordas_roi
    imagem_hsv = cv2.cvtColor(imagem, cv2.COLOR_BGR2HSV)

    melhor: tuple[
        float, LinhaVertical, LinhaVertical, tuple[int, ...]
    ] | None = None

    for indice, primeira in enumerate(linhas_verticais):
        for segunda in linhas_verticais[indice + 1 :]:
            if abs(primeira.inclinacao_graus - segunda.inclinacao_graus) > (
                configuracao.diferenca_inclinacao_bordas_graus
            ):
                continue

            y_sobreposicao_inicial = max(primeira.y_minimo, segunda.y_minimo)
            y_sobreposicao_final = min(primeira.y_maximo, segunda.y_maximo)
            sobreposicao = y_sobreposicao_final - y_sobreposicao_inicial
            if sobreposicao < altura * configuracao.sobreposicao_vertical_minima_regua:
                continue

            centro_y = (y_sobreposicao_inicial + y_sobreposicao_final) / 2
            x_primeira = primeira.x_em(centro_y)
            x_segunda = segunda.x_em(centro_y)
            largura_candidata = abs(x_segunda - x_primeira)
            proporcao_largura = largura_candidata / largura
            if not (
                configuracao.proporcao_largura_minima_regua
                <= proporcao_largura
                <= configuracao.proporcao_largura_maxima_regua
            ):
                continue
            if sobreposicao / max(1.0, largura_candidata) < (
                configuracao.razao_aspecto_minima_regua
            ):
                continue

            esquerda = round(min(x_primeira, x_segunda))
            direita = round(max(x_primeira, x_segunda))
            proporcao_neutra = _calcular_proporcao_neutra(
                imagem_hsv,
                esquerda,
                direita,
                min(primeira.y_minimo, segunda.y_minimo),
                max(primeira.y_maximo, segunda.y_maximo),
                configuracao,
            )
            if proporcao_neutra < configuracao.proporcao_neutra_minima_regua:
                continue
            margem_busca_y = round(
                altura * configuracao.margem_busca_extremos_regua_proporcao
            )
            marcas = _detectar_marcas_regua(
                bordas,
                esquerda,
                direita,
                max(
                    y1_roi,
                    min(primeira.y_minimo, segunda.y_minimo) - margem_busca_y,
                ),
                min(
                    y2_roi - 1,
                    max(primeira.y_maximo, segunda.y_maximo) + margem_busca_y,
                ),
                configuracao,
            )
            if len(marcas) < configuracao.quantidade_minima_marcas_regua:
                continue
            extensao_marcas = marcas[-1] - marcas[0]
            if extensao_marcas < (
                altura * configuracao.proporcao_minima_comprimento_regua
            ):
                continue

            distancia_largura_esperada = abs(
                proporcao_largura - configuracao.proporcao_largura_esperada_regua
            )
            centro_x_relativo = ((esquerda + direita) / 2) / largura
            distancia_posicao = abs(
                centro_x_relativo
                - configuracao.posicao_horizontal_esperada_regua
            )
            pontuacao = (
                2.0 * sobreposicao / altura
                + 7.0 * extensao_marcas / altura
                + 2.0 * len(marcas) / max(1, extensao_marcas)
                + 4.0 * proporcao_neutra
                - 8.0 * distancia_posicao
                - 18.0 * distancia_largura_esperada
            )
            if melhor is None or pontuacao > melhor[0]:
                esquerda_linha, direita_linha = (
                    (primeira, segunda)
                    if x_primeira <= x_segunda
                    else (segunda, primeira)
                )
                melhor = (
                    pontuacao,
                    esquerda_linha,
                    direita_linha,
                    marcas,
                )

    if melhor is None:
        raise ErroMedicao("Régua não detectada.")

    _, esquerda, direita, marcas = melhor
    margem_extremos = round(
        altura * configuracao.margem_extremos_regua_proporcao
    )
    y_superior = max(y1_roi, marcas[0] - margem_extremos)
    y_inferior = min(y2_roi - 1, marcas[-1] + margem_extremos)
    centro_superior = round(
        (esquerda.x_em(y_superior) + direita.x_em(y_superior)) / 2
    )
    centro_inferior = round(
        (esquerda.x_em(y_inferior) + direita.x_em(y_inferior)) / 2
    )
    ponto_superior = (centro_superior, y_superior)
    ponto_inferior = (centro_inferior, y_inferior)
    comprimento = math.dist(ponto_superior, ponto_inferior)
    if not (
        altura * configuracao.proporcao_minima_comprimento_regua
        <= comprimento
        <= altura * configuracao.proporcao_maxima_comprimento_regua
    ):
        raise ErroMedicao(
            "Régua detectada, mas não foi possível estimar a escala."
        )

    candidatos = tuple(
        (linha.ponto_inicial, linha.ponto_final) for linha in linhas_verticais
    )
    return DeteccaoRegua(
        ponto_superior=ponto_superior,
        ponto_inferior=ponto_inferior,
        candidatos=candidatos,
        regiao_busca=regiao_busca,
    )


def calcular_escala(
    deteccao: DeteccaoRegua, configuracao: ConfiguracaoVisao
) -> float:
    comprimento_regua_px = math.dist(
        deteccao.ponto_superior, deteccao.ponto_inferior
    )
    if comprimento_regua_px <= 0 or configuracao.comprimento_regua_cm <= 0:
        raise ErroMedicao(
            "Régua detectada, mas não foi possível estimar a escala."
        )
    return comprimento_regua_px / configuracao.comprimento_regua_cm


def filtrar_componentes(
    mascara: np.ndarray, area_minima: int
) -> np.ndarray:
    quantidade, rotulos, estatisticas, _ = cv2.connectedComponentsWithStats(
        mascara, connectivity=8
    )
    mascara_filtrada = np.zeros_like(mascara)
    for rotulo in range(1, quantidade):
        if estatisticas[rotulo, cv2.CC_STAT_AREA] >= area_minima:
            mascara_filtrada[rotulos == rotulo] = 255
    return mascara_filtrada


def segmentar_vegetacao(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> np.ndarray:
    altura, largura = imagem.shape[:2]
    x_inicial, y_inicial, x_final, y_final = converter_regiao_relativa(
        configuracao.regiao_vegetacao, largura, altura
    )
    hsv = cv2.cvtColor(imagem, cv2.COLOR_BGR2HSV)
    mascara_hsv = cv2.inRange(
        hsv,
        np.array(configuracao.hsv_verde_inferior, dtype=np.uint8),
        np.array(configuracao.hsv_verde_superior, dtype=np.uint8),
    )
    mascara_regiao = np.zeros_like(mascara_hsv)
    mascara_regiao[y_inicial:y_final, x_inicial:x_final] = 255
    mascara = cv2.bitwise_and(mascara_hsv, mascara_regiao)

    kernel_abertura = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (configuracao.tamanho_kernel_abertura,) * 2
    )
    kernel_fechamento = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (configuracao.tamanho_kernel_fechamento,) * 2
    )
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, kernel_abertura)
    mascara = cv2.morphologyEx(
        mascara,
        cv2.MORPH_CLOSE,
        kernel_fechamento,
        iterations=configuracao.iteracoes_fechamento,
    )
    area_minima = max(
        configuracao.area_minima_componente_px,
        round(altura * largura * configuracao.proporcao_area_minima_componente),
    )
    mascara = filtrar_componentes(mascara, area_minima)
    if np.count_nonzero(mascara) / mascara.size > (
        configuracao.proporcao_maxima_mascara_vegetacao
    ):
        raise ErroMedicao("Vegetação não detectada.")
    return mascara


def detectar_topo(mascara: np.ndarray, pixels_minimos_linha: int) -> int:
    pixels_por_linha = np.count_nonzero(mascara, axis=1)
    linhas_validas = np.flatnonzero(pixels_por_linha >= pixels_minimos_linha)
    if linhas_validas.size == 0:
        raise ErroMedicao("Vegetação não detectada.")
    return int(linhas_validas[0])


def detectar_base(
    mascara: np.ndarray,
    referencia_regua_y: int,
    topo_y: int,
    configuracao: ConfiguracaoVisao,
) -> int:
    altura, largura = mascara.shape
    pixels_por_linha = np.count_nonzero(mascara, axis=1)
    minimo_linha = max(
        configuracao.pixels_minimos_linha_base,
        round(largura * configuracao.proporcao_pixels_linha_base),
    )
    linhas_validas = pixels_por_linha >= minimo_linha
    janela = configuracao.janela_densidade_base_px
    densidade_janela = np.convolve(
        linhas_validas.astype(np.uint8), np.ones(janela, dtype=np.uint8), mode="same"
    )
    distancia_maxima = round(
        altura * configuracao.distancia_maxima_evidencia_base_proporcao
    )
    inicio_busca = max(topo_y + 1, referencia_regua_y - distancia_maxima)
    fim_busca = min(altura, referencia_regua_y + distancia_maxima + 1)
    evidencias = np.flatnonzero(
        densidade_janela[inicio_busca:fim_busca]
        >= configuracao.linhas_validas_janela_base
    )
    if evidencias.size == 0:
        raise ErroMedicao("Base da vegetação não identificada.")

    ultima_evidencia = int(evidencias[-1] + inicio_busca)
    base_por_mascara = ultima_evidencia + round(
        altura * configuracao.margem_base_apos_vegetacao_proporcao
    )
    ajuste_maximo = round(altura * configuracao.ajuste_maximo_base_proporcao)
    base_por_mascara = max(
        referencia_regua_y - ajuste_maximo,
        min(referencia_regua_y + ajuste_maximo, base_por_mascara),
    )
    peso_regua = configuracao.peso_referencia_regua_base
    base_y = round(
        peso_regua * referencia_regua_y + (1.0 - peso_regua) * base_por_mascara
    )
    if base_y <= topo_y or base_y >= altura:
        raise ErroMedicao("Base da vegetação não identificada.")
    return base_y


def medir_vegetacao(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> ResultadoMedicao:
    deteccao_regua = detectar_regua(imagem, configuracao)
    pixels_por_cm = calcular_escala(deteccao_regua, configuracao)
    mascara = segmentar_vegetacao(imagem, configuracao)
    topo_y = detectar_topo(mascara, configuracao.pixels_minimos_linha_topo)
    base_y = detectar_base(
        mascara, deteccao_regua.ponto_inferior[1], topo_y, configuracao
    )
    altura_vegetacao_px = base_y - topo_y
    if altura_vegetacao_px <= 0 or pixels_por_cm <= 0:
        raise ErroMedicao("Medição inválida.")

    x_medicao = max(
        0,
        min(
            imagem.shape[1] - 1,
            round(deteccao_regua.ponto_inferior[0] + imagem.shape[1] * 0.08),
        ),
    )
    return ResultadoMedicao(
        pixels_por_cm=pixels_por_cm,
        altura_cm=altura_vegetacao_px / pixels_por_cm,
        topo_y=topo_y,
        base_y=base_y,
        x_medicao=x_medicao,
        mascara_vegetacao=mascara,
        deteccao_regua=deteccao_regua,
    )


def desenhar_rotulo(
    imagem: np.ndarray,
    texto: str,
    origem: Ponto,
    configuracao: ConfiguracaoVisao,
) -> None:
    fonte = cv2.FONT_HERSHEY_SIMPLEX
    escala = 0.65
    espessura = 2
    (largura_texto, altura_texto), _ = cv2.getTextSize(
        texto, fonte, escala, espessura
    )
    x = max(8, min(origem[0], imagem.shape[1] - largura_texto - 10))
    y = max(altura_texto + 12, min(origem[1], imagem.shape[0] - 8))
    cv2.rectangle(
        imagem,
        (x - 8, y - altura_texto - 10),
        (x + largura_texto + 8, y + 7),
        configuracao.cor_fundo_texto_bgr,
        -1,
    )
    cv2.putText(
        imagem,
        texto,
        (x, y),
        fonte,
        escala,
        configuracao.cor_texto_bgr,
        espessura,
        cv2.LINE_AA,
    )


def gerar_diagnostico(
    imagem: np.ndarray,
    resultado: ResultadoMedicao,
    caminho_saida: Path,
    configuracao: ConfiguracaoVisao,
) -> None:
    diagnostico = imagem.copy()
    sobreposicao = diagnostico.copy()
    sobreposicao[resultado.mascara_vegetacao > 0] = configuracao.cor_vegetacao_bgr
    diagnostico = cv2.addWeighted(sobreposicao, 0.28, diagnostico, 0.72, 0)

    x1_roi, y1_roi, x2_roi, y2_roi = resultado.deteccao_regua.regiao_busca
    cv2.rectangle(
        diagnostico,
        (x1_roi, y1_roi),
        (x2_roi, y2_roi),
        configuracao.cor_regiao_busca_bgr,
        1,
    )
    x_regua = (
        resultado.deteccao_regua.ponto_superior[0]
        + resultado.deteccao_regua.ponto_inferior[0]
    ) / 2
    limite_distancia = (
        diagnostico.shape[1]
        * configuracao.distancia_candidato_diagnostico_proporcao
    )
    candidatos_proximos = sorted(
        (
            segmento
            for segmento in resultado.deteccao_regua.candidatos
            if abs(
                (segmento[0][0] + segmento[1][0]) / 2 - x_regua
            )
            <= limite_distancia
        ),
        key=lambda segmento: math.dist(segmento[0], segmento[1]),
        reverse=True,
    )[: configuracao.quantidade_candidatos_diagnostico]
    for ponto_inicial, ponto_final in candidatos_proximos:
        cv2.line(
            diagnostico,
            ponto_inicial,
            ponto_final,
            configuracao.cor_candidato_regua_bgr,
            1,
        )

    superior = resultado.deteccao_regua.ponto_superior
    inferior = resultado.deteccao_regua.ponto_inferior
    cv2.line(diagnostico, superior, inferior, configuracao.cor_regua_bgr, 4)
    cv2.circle(diagnostico, superior, 7, configuracao.cor_regua_bgr, -1)
    cv2.circle(diagnostico, inferior, 7, configuracao.cor_regua_bgr, -1)

    x_medicao = resultado.x_medicao
    cv2.line(
        diagnostico,
        (x_medicao, resultado.topo_y),
        (x_medicao, resultado.base_y),
        configuracao.cor_medicao_bgr,
        4,
    )
    cv2.circle(
        diagnostico,
        (x_medicao, resultado.topo_y),
        7,
        configuracao.cor_topo_bgr,
        -1,
    )
    cv2.circle(
        diagnostico,
        (x_medicao, resultado.base_y),
        7,
        configuracao.cor_base_bgr,
        -1,
    )

    desenhar_rotulo(
        diagnostico,
        f"Escala: {resultado.pixels_por_cm:.2f} px/cm",
        (24, 38),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        f"Altura estimada: {resultado.altura_cm:.1f} cm",
        (24, 78),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        "Regua detectada (60 cm)",
        (superior[0] - 225, max(superior[1] + 24, 118)),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        "Topo detectado",
        (x_medicao + 20, resultado.topo_y + 34),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        "Base estimada",
        (x_medicao + 14, resultado.base_y),
        configuracao,
    )

    caminho_saida.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(caminho_saida), diagnostico):
        raise ErroMedicao(
            f"Não foi possível salvar o diagnóstico em {caminho_saida}."
        )


def criar_argumentos() -> argparse.Namespace:
    raiz_vision = Path(__file__).resolve().parents[1]
    analisador = argparse.ArgumentParser(
        description="Estima a altura da vegetação usando uma régua de 60 cm."
    )
    analisador.add_argument(
        "--imagem", type=Path, required=True, help="Caminho da fotografia analisada."
    )
    analisador.add_argument(
        "--saida",
        type=Path,
        default=raiz_vision / "saida" / "diagnostico.jpg",
        help="Caminho da imagem de diagnóstico.",
    )
    analisador.add_argument(
        "--referencia-manual",
        type=float,
        help="Altura manual opcional, usada somente para calcular o erro.",
    )
    analisador.add_argument(
        "--formato-json",
        action="store_true",
        help="Retorna somente o resultado estruturado em JSON.",
    )
    analisador.add_argument(
        "--sem-diagnostico",
        action="store_true",
        help="Não gera a imagem de diagnóstico.",
    )
    return analisador.parse_args()


def executar() -> int:
    argumentos = criar_argumentos()
    try:
        imagem = carregar_imagem(argumentos.imagem)
        resultado = medir_vegetacao(imagem, CONFIGURACAO)
        if not argumentos.sem_diagnostico:
            gerar_diagnostico(imagem, resultado, argumentos.saida, CONFIGURACAO)

        if argumentos.formato_json:
            print(
                json.dumps(
                    {
                        "alturaCm": round(resultado.altura_cm, 2),
                        "escalaPixelsPorCm": round(resultado.pixels_por_cm, 2),
                    },
                    ensure_ascii=False,
                )
            )
            return 0

        print(f"Imagem analisada: {argumentos.imagem.name}")
        print(f"Escala estimada: {resultado.pixels_por_cm:.2f} pixels/cm")
        print(f"Altura estimada: {resultado.altura_cm:.2f} cm")
        if argumentos.referencia_manual is not None:
            if argumentos.referencia_manual <= 0:
                raise ErroMedicao("A referência manual deve ser maior que zero.")
            erro_absoluto = abs(resultado.altura_cm - argumentos.referencia_manual)
            erro_percentual = erro_absoluto / argumentos.referencia_manual * 100
            print(f"Referência manual: ~{argumentos.referencia_manual:.2f} cm")
            print(f"Erro absoluto: {erro_absoluto:.2f} cm")
            print(f"Erro percentual: {erro_percentual:.2f}%")
        if not argumentos.sem_diagnostico:
            print(f"Diagnóstico salvo em: {argumentos.saida}")
        return 0
    except ErroMedicao as erro:
        print(f"Erro: {erro}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(executar())
