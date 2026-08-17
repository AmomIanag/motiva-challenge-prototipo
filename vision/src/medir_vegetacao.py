import argparse
import json
import math
import sys
from dataclasses import dataclass, replace
from pathlib import Path

import cv2
import numpy as np

from configuracao import CONFIGURACAO, ConfiguracaoVisao, RegiaoRelativa


class ErroMedicao(Exception):
    pass


Ponto = tuple[int, int]
Segmento = tuple[Ponto, Ponto]


@dataclass(frozen=True)
class CandidatoRegua:
    ponto_superior: Ponto
    ponto_inferior: Ponto
    pontuacao: float
    modo_validacao: str
    quantidade_marcas: int
    continuidade_bordas: float
    estabilidade_largura: float
    contraste_local: float


@dataclass(frozen=True)
class DeteccaoRegua:
    ponto_superior: Ponto
    ponto_inferior: Ponto
    candidatos: tuple[Segmento, ...]
    regiao_busca: tuple[int, int, int, int]
    pontuacao: float
    modo_validacao: str
    quantidade_marcas: int
    proporcao_neutra: float
    proporcao_largura: float
    continuidade_bordas: float
    estabilidade_largura: float
    contraste_local: float
    candidatos_pontuados: tuple[CandidatoRegua, ...]


@dataclass(frozen=True)
class MarcadorCalibracao:
    cor: str
    centro: Ponto
    caixa: tuple[int, int, int, int]
    area: int
    preenchimento: float
    compactacao: float
    matiz_mediano: float
    saturacao_mediana: float
    contraste_local: float
    qualidade_cor: float
    margem_borda_relativa: float


@dataclass(frozen=True)
class ParMarcadoresCalibracao:
    azul: MarcadorCalibracao
    amarelo: MarcadorCalibracao
    distancia_pixels: float
    pontuacao: float
    alinhamento: float
    proporcao_tamanho: float
    qualidade_cor: float
    qualidade_contraste: float
    qualidade_borda: float
    deslocamento_horizontal_relativo: float
    angulo_vertical_graus: float
    continuidade_estrutural: float
    contraste_estrutural: float
    suporte_estrutural: float
    confiavel: bool = False
    motivos_baixa_confianca: tuple[str, ...] = ()


@dataclass(frozen=True)
class MetricasSuporteMarcadores:
    continuidade: float
    contraste_mediano: float
    brilho_central_mediano: float
    suporte: float


@dataclass(frozen=True)
class DeteccaoMarcadores:
    azul: MarcadorCalibracao
    amarelo: MarcadorCalibracao
    distancia_pixels: float
    pontuacao_par: float
    mascara_azul: np.ndarray
    mascara_amarela: np.ndarray
    candidatos_azuis: tuple[MarcadorCalibracao, ...]
    candidatos_amarelos: tuple[MarcadorCalibracao, ...]
    pares_validos: tuple[ParMarcadoresCalibracao, ...]
    confianca_aprovada: bool


class ErroParMarcadoresSemConfianca(ErroMedicao):
    def __init__(
        self, mensagem: str, deteccao: DeteccaoMarcadores
    ) -> None:
        super().__init__(mensagem)
        self.deteccao = deteccao


@dataclass(frozen=True)
class ResultadoMedicao:
    pixels_por_cm: float
    altura_cm: float
    topo_y: int
    base_y: int
    x_medicao: int
    mascara_candidata_vegetacao: np.ndarray
    mascara_vegetacao: np.ndarray
    regiao_busca_vegetacao: tuple[int, int, int, int]
    regioes_busca_vegetacao: tuple[tuple[int, int, int, int], ...]
    candidatos_vegetacao: tuple["CandidatoVegetal", ...]
    lado_vegetacao: str
    deteccao_regua: DeteccaoRegua
    deteccao_marcadores: DeteccaoMarcadores | None = None


@dataclass(frozen=True)
class ComponenteVegetal:
    rotulo: int
    x: int
    y: int
    largura: int
    altura: int
    area: int

    @property
    def direita(self) -> int:
        return self.x + self.largura

    @property
    def inferior(self) -> int:
        return self.y + self.altura


@dataclass(frozen=True)
class CandidatoVegetal:
    lado: str
    pontuacao: float
    mascara: np.ndarray
    regiao_busca: tuple[int, int, int, int]
    continuidade_vertical: float
    largura_copa_relativa: float
    distancia_base_relativa: float
    textura_media: float
    proporcao_linhas_horizontais: float
    bordas_tocadas: int
    aceito_por_coerencia_bordas: bool


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


@dataclass(frozen=True)
class MetricasEstruturaisRegua:
    extremos_contraste: tuple[int, int] | None
    continuidade_bordas: float
    variacao_relativa_largura: float
    estabilidade_largura: float
    contraste_mediano: float


def converter_regiao_relativa(
    regiao: RegiaoRelativa, largura: int, altura: int
) -> tuple[int, int, int, int]:
    x_inicial = max(0, min(largura, round(regiao[0] * largura)))
    y_inicial = max(0, min(altura, round(regiao[1] * altura)))
    x_final = max(0, min(largura, round(regiao[2] * largura)))
    y_final = max(0, min(altura, round(regiao[3] * altura)))
    return x_inicial, y_inicial, x_final, y_final


def _segmentar_cor_marcador(
    imagem: np.ndarray,
    imagem_hsv: np.ndarray,
    cor: str,
    limite_inferior: tuple[int, int, int],
    limite_superior: tuple[int, int, int],
    configuracao: ConfiguracaoVisao,
) -> np.ndarray:
    mascara = cv2.inRange(
        imagem_hsv,
        np.array(limite_inferior, dtype=np.uint8),
        np.array(limite_superior, dtype=np.uint8),
    )
    azul, verde, vermelho = cv2.split(imagem.astype(np.int16))
    if cor == "azul":
        saturacao = imagem_hsv[:, :, 1]
        mascara_canais = (
            (
                azul
                >= vermelho
                + configuracao.vantagem_azul_sobre_vermelho_marcador
            )
            & (
                (saturacao >= configuracao.saturacao_marcador_forte)
                | (
                    verde
                    >= vermelho
                    + configuracao.vantagem_verde_sobre_vermelho_marcador_azul
                )
            )
        )
        mascara_nucleo = (
            (saturacao >= configuracao.saturacao_nucleo_marcador_azul)
            & (
                azul
                >= vermelho
                + configuracao.vantagem_azul_sobre_vermelho_nucleo
            )
        )
    else:
        saturacao = imagem_hsv[:, :, 1]
        mascara_canais = (
            (
                verde
                >= azul
                + configuracao.vantagem_verde_sobre_azul_marcador_amarelo
            )
            & (
                vermelho
                >= azul
                + configuracao.vantagem_vermelho_sobre_azul_marcador_amarelo
            )
        )
        mascara_nucleo = (
            (saturacao >= configuracao.saturacao_nucleo_marcador_amarelo)
            & (
                np.abs(verde - vermelho)
                <= configuracao.tolerancia_equilibrio_amarelo_nucleo
            )
            & (
                np.abs(
                    imagem_hsv[:, :, 0].astype(np.int16)
                    - configuracao.matiz_referencia_marcador_amarelo
                )
                <= configuracao.tolerancia_matiz_nucleo_amarelo
            )
            & (
                verde
                >= azul + configuracao.vantagem_canais_amarelo_nucleo
            )
            & (
                vermelho
                >= azul + configuracao.vantagem_canais_amarelo_nucleo
            )
        )
    mascara = cv2.bitwise_and(
        mascara,
        (mascara_canais & mascara_nucleo).astype(np.uint8) * 255,
    )
    tamanho = configuracao.tamanho_kernel_marcadores
    kernel = np.ones((tamanho, tamanho), dtype=np.uint8)
    mascara = cv2.morphologyEx(
        mascara,
        cv2.MORPH_OPEN,
        kernel,
        iterations=configuracao.iteracoes_abertura_marcadores,
    )
    return cv2.morphologyEx(
        mascara,
        cv2.MORPH_CLOSE,
        kernel,
        iterations=configuracao.iteracoes_fechamento_marcadores,
    )


def _encontrar_marcadores(
    mascara: np.ndarray,
    imagem: np.ndarray,
    imagem_hsv: np.ndarray,
    cor: str,
    configuracao: ConfiguracaoVisao,
) -> tuple[MarcadorCalibracao, ...]:
    altura, largura = mascara.shape
    area_imagem = altura * largura
    area_minima = max(
        configuracao.area_minima_marcador_px,
        round(area_imagem * configuracao.proporcao_area_minima_marcador),
    )
    area_maxima = round(
        area_imagem * configuracao.proporcao_area_maxima_marcador
    )
    quantidade, rotulos, estatisticas, centroides = cv2.connectedComponentsWithStats(
        mascara, connectivity=8
    )
    candidatos: list[MarcadorCalibracao] = []
    for rotulo in range(1, quantidade):
        x, y, largura_caixa, altura_caixa, area = (
            int(valor) for valor in estatisticas[rotulo]
        )
        if not area_minima <= area <= area_maxima:
            continue
        if min(largura_caixa, altura_caixa) < configuracao.dimensao_minima_marcador_px:
            continue
        preenchimento = area / max(1, largura_caixa * altura_caixa)
        if preenchimento < configuracao.preenchimento_minimo_marcador:
            continue
        razao_aspecto = max(
            largura_caixa / max(1, altura_caixa),
            altura_caixa / max(1, largura_caixa),
        )
        if razao_aspecto > configuracao.razao_aspecto_maxima_marcador:
            continue
        pixels_componente = rotulos == rotulo
        contornos, _ = cv2.findContours(
            pixels_componente.astype(np.uint8) * 255,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE,
        )
        perimetro = sum(
            cv2.arcLength(contorno, True) for contorno in contornos
        )
        compactacao = min(
            1.0,
            4.0 * math.pi * area / max(1.0, perimetro * perimetro),
        )
        valores_hsv = imagem_hsv[pixels_componente]
        matiz_mediano, saturacao_mediana, _ = np.median(
            valores_hsv, axis=0
        )
        valores_bgr = imagem[pixels_componente].astype(np.float32)
        media_bgr = np.mean(valores_bgr, axis=0)
        margem_entorno = max(4, round(min(largura_caixa, altura_caixa) * 0.6))
        x_entorno = max(0, x - margem_entorno)
        y_entorno = max(0, y - margem_entorno)
        direita_entorno = min(largura, x + largura_caixa + margem_entorno)
        inferior_entorno = min(altura, y + altura_caixa + margem_entorno)
        entorno = imagem[
            y_entorno:inferior_entorno, x_entorno:direita_entorno
        ]
        mascara_entorno = np.ones(entorno.shape[:2], dtype=bool)
        mascara_entorno[
            y - y_entorno : y + altura_caixa - y_entorno,
            x - x_entorno : x + largura_caixa - x_entorno,
        ] = False
        pixels_entorno = entorno[mascara_entorno].astype(np.float32)
        contraste_local = (
            float(
                np.linalg.norm(
                    media_bgr - np.median(pixels_entorno, axis=0)
                )
            )
            if pixels_entorno.size
            else 0.0
        )
        azul_medio, verde_medio, vermelho_medio = media_bgr
        if cor == "azul":
            matiz_referencia = configuracao.matiz_referencia_marcador_azul
            tolerancia_matiz = configuracao.tolerancia_matiz_marcador_azul
            dominancia = max(0.0, azul_medio - vermelho_medio)
            referencia_dominancia = 30.0
        else:
            matiz_referencia = configuracao.matiz_referencia_marcador_amarelo
            tolerancia_matiz = configuracao.tolerancia_matiz_marcador_amarelo
            dominancia = max(
                0.0,
                min(
                    verde_medio - azul_medio,
                    vermelho_medio - azul_medio,
                ),
            )
            referencia_dominancia = 20.0
        qualidade_matiz = max(
            0.0,
            1.0
            - abs(float(matiz_mediano) - matiz_referencia)
            / max(1, tolerancia_matiz),
        )
        qualidade_saturacao = min(1.0, float(saturacao_mediana) / 40.0)
        qualidade_dominancia = min(
            1.0, dominancia / referencia_dominancia
        )
        qualidade_cor = (
            0.45 * qualidade_matiz
            + 0.25 * qualidade_saturacao
            + 0.30 * qualidade_dominancia
        )
        margem_borda = min(
            x,
            y,
            largura - (x + largura_caixa),
            altura - (y + altura_caixa),
        )
        margem_borda_relativa = margem_borda / max(1, min(largura, altura))
        centro_x, centro_y = centroides[rotulo]
        candidatos.append(
            MarcadorCalibracao(
                cor=cor,
                centro=(round(float(centro_x)), round(float(centro_y))),
                caixa=(x, y, x + largura_caixa, y + altura_caixa),
                area=area,
                preenchimento=preenchimento,
                compactacao=compactacao,
                matiz_mediano=float(matiz_mediano),
                saturacao_mediana=float(saturacao_mediana),
                contraste_local=contraste_local,
                qualidade_cor=qualidade_cor,
                margem_borda_relativa=margem_borda_relativa,
            )
        )
    return tuple(candidatos)


def _avaliar_suporte_entre_marcadores(
    imagem_hsv: np.ndarray,
    azul: MarcadorCalibracao,
    amarelo: MarcadorCalibracao,
    configuracao: ConfiguracaoVisao,
) -> MetricasSuporteMarcadores:
    valor = imagem_hsv[:, :, 2].astype(np.float32)
    altura, largura = valor.shape
    x1, y1 = azul.centro
    x2, y2 = amarelo.centro
    dx = x2 - x1
    dy = y2 - y1
    comprimento = math.hypot(dx, dy)
    if comprimento <= 0:
        return MetricasSuporteMarcadores(0.0, 0.0, 255.0, 0.0)

    dimensao_azul = min(
        azul.caixa[2] - azul.caixa[0], azul.caixa[3] - azul.caixa[1]
    )
    dimensao_amarela = min(
        amarelo.caixa[2] - amarelo.caixa[0],
        amarelo.caixa[3] - amarelo.caixa[1],
    )
    meia_largura = max(
        configuracao.meia_largura_minima_suporte_marcadores_px,
        round(
            (dimensao_azul + dimensao_amarela)
            / 2
            * configuracao.proporcao_meia_largura_suporte_marcadores
        ),
    )
    afastamento = configuracao.afastamento_entorno_suporte_marcadores_px
    largura_entorno = configuracao.largura_entorno_suporte_marcadores_px
    normal_x = -dy / comprimento
    normal_y = dx / comprimento
    contrastes: list[float] = []
    brilhos_centrais: list[float] = []
    evidencias: list[bool] = []

    margem = configuracao.margem_extremos_suporte_marcadores
    for proporcao in np.linspace(
        margem,
        1.0 - margem,
        configuracao.quantidade_amostras_suporte_marcadores,
    ):
        centro_x = x1 + float(proporcao) * dx
        centro_y = y1 + float(proporcao) * dy

        def amostrar(inicio: int, fim: int) -> np.ndarray:
            pontos = []
            for deslocamento in range(inicio, fim + 1):
                x = round(centro_x + deslocamento * normal_x)
                y = round(centro_y + deslocamento * normal_y)
                if 0 <= x < largura and 0 <= y < altura:
                    pontos.append(valor[y, x])
            return np.asarray(pontos, dtype=np.float32)

        centro = amostrar(-meia_largura, meia_largura)
        esquerda = amostrar(
            -meia_largura - afastamento - largura_entorno + 1,
            -meia_largura - afastamento,
        )
        direita = amostrar(
            meia_largura + afastamento,
            meia_largura + afastamento + largura_entorno - 1,
        )
        if centro.size == 0 or esquerda.size + direita.size == 0:
            continue
        entorno = np.concatenate((esquerda, direita))
        brilho_central = float(np.median(centro))
        contraste = float(np.median(entorno)) - brilho_central
        brilhos_centrais.append(brilho_central)
        contrastes.append(contraste)
        evidencias.append(
            contraste
            >= configuracao.contraste_minimo_suporte_marcadores
            and brilho_central
            <= configuracao.brilho_maximo_suporte_marcadores
        )

    if not evidencias:
        return MetricasSuporteMarcadores(0.0, 0.0, 255.0, 0.0)
    continuidade = float(np.mean(evidencias))
    contraste_mediano = float(np.median(contrastes))
    qualidade_contraste = min(
        1.0,
        max(0.0, contraste_mediano)
        / configuracao.contraste_referencia_suporte_marcadores,
    )
    peso_continuidade = configuracao.peso_continuidade_suporte_marcadores
    suporte = (
        peso_continuidade * continuidade
        + (1.0 - peso_continuidade) * qualidade_contraste
    )
    return MetricasSuporteMarcadores(
        continuidade=continuidade,
        contraste_mediano=contraste_mediano,
        brilho_central_mediano=float(np.median(brilhos_centrais)),
        suporte=suporte,
    )


def _motivos_baixa_confianca_par(
    par: ParMarcadoresCalibracao,
    configuracao: ConfiguracaoVisao,
) -> tuple[str, ...]:
    motivos = []
    if par.pontuacao < configuracao.pontuacao_minima_par_confiavel:
        motivos.append("score abaixo do mínimo")
    if par.alinhamento < configuracao.alinhamento_minimo_par_confiavel:
        motivos.append("alinhamento insuficiente")
    if (
        par.suporte_estrutural
        < configuracao.suporte_estrutural_minimo_par_confiavel
    ):
        motivos.append("suporte estrutural insuficiente")
    if par.qualidade_cor < configuracao.qualidade_cor_minima_par_confiavel:
        motivos.append("evidência cromática insuficiente")
    return tuple(motivos)


def _selecionar_primeiro_par_confiavel(
    pares: tuple[ParMarcadoresCalibracao, ...],
) -> ParMarcadoresCalibracao | None:
    return next((par for par in pares if par.confiavel), None)


def detectar_marcadores_calibracao(
    imagem: np.ndarray,
    configuracao: ConfiguracaoVisao,
) -> DeteccaoMarcadores:
    altura, largura = imagem.shape[:2]
    imagem_hsv = cv2.cvtColor(imagem, cv2.COLOR_BGR2HSV)
    mascara_azul = _segmentar_cor_marcador(
        imagem,
        imagem_hsv,
        "azul",
        configuracao.hsv_marcador_azul_inferior,
        configuracao.hsv_marcador_azul_superior,
        configuracao,
    )
    mascara_amarela = _segmentar_cor_marcador(
        imagem,
        imagem_hsv,
        "amarelo",
        configuracao.hsv_marcador_amarelo_inferior,
        configuracao.hsv_marcador_amarelo_superior,
        configuracao,
    )
    candidatos_azuis = _encontrar_marcadores(
        mascara_azul, imagem, imagem_hsv, "azul", configuracao
    )
    candidatos_amarelos = _encontrar_marcadores(
        mascara_amarela, imagem, imagem_hsv, "amarelo", configuracao
    )
    if not candidatos_azuis:
        raise ErroMedicao("Marcador azul de 60 cm não detectado.")
    if not candidatos_amarelos:
        raise ErroMedicao("Marcador amarelo de 0 cm não detectado.")

    distancia_minima = (
        altura * configuracao.proporcao_distancia_minima_marcadores
    )
    distancia_maxima = (
        altura * configuracao.proporcao_distancia_maxima_marcadores
    )
    encontrou_distancia_insuficiente = False
    pares: list[ParMarcadoresCalibracao] = []
    for azul in candidatos_azuis:
        for amarelo in candidatos_amarelos:
            dx = abs(amarelo.centro[0] - azul.centro[0])
            dy = amarelo.centro[1] - azul.centro[1]
            if dy <= 0:
                continue
            distancia = math.dist(azul.centro, amarelo.centro)
            if distancia < distancia_minima:
                encontrou_distancia_insuficiente = True
                continue
            if distancia > distancia_maxima:
                continue
            if dx > dy * configuracao.proporcao_desalinhamento_horizontal_maximo:
                continue
            proporcao_tamanho = min(azul.area, amarelo.area) / max(
                azul.area, amarelo.area
            )
            if (
                proporcao_tamanho
                < configuracao.proporcao_tamanho_minima_entre_marcadores
            ):
                continue
            alinhamento = 1.0 - dx / max(
                1.0,
                dy * configuracao.proporcao_desalinhamento_horizontal_maximo,
            )
            preenchimento = (
                azul.preenchimento + amarelo.preenchimento
            ) / 2
            compactacao = (azul.compactacao + amarelo.compactacao) / 2
            qualidade_cor = (azul.qualidade_cor + amarelo.qualidade_cor) / 2
            qualidade_contraste = (
                min(
                    1.0,
                    azul.contraste_local
                    / configuracao.contraste_referencia_marcador,
                )
                + min(
                    1.0,
                    amarelo.contraste_local
                    / configuracao.contraste_referencia_marcador,
                )
            ) / 2
            qualidade_borda = (
                min(
                    1.0,
                    azul.margem_borda_relativa
                    / configuracao.margem_borda_referencia_marcador,
                )
                + min(
                    1.0,
                    amarelo.margem_borda_relativa
                    / configuracao.margem_borda_referencia_marcador,
                )
            ) / 2
            qualidade_distancia = min(
                1.0, distancia / max(1.0, altura * 0.55)
            )
            deslocamento_horizontal_relativo = dx / max(1.0, dy)
            angulo_vertical_graus = math.degrees(
                math.atan2(dx, dy)
            )
            metricas_suporte = _avaliar_suporte_entre_marcadores(
                imagem_hsv, azul, amarelo, configuracao
            )
            pontuacao = (
                1.5 * qualidade_distancia
                + 2.0 * alinhamento
                + configuracao.peso_colinearidade_reforcada_par
                * alinhamento**2
                + 1.5 * proporcao_tamanho
                + 0.75 * preenchimento
                + 0.75 * compactacao
                + 1.5 * qualidade_cor
                + 0.75 * qualidade_contraste
                + 0.5 * qualidade_borda
                + configuracao.peso_suporte_estrutural_par
                * metricas_suporte.suporte
            )
            pares.append(
                ParMarcadoresCalibracao(
                    azul=azul,
                    amarelo=amarelo,
                    distancia_pixels=distancia,
                    pontuacao=pontuacao,
                    alinhamento=alinhamento,
                    proporcao_tamanho=proporcao_tamanho,
                    qualidade_cor=qualidade_cor,
                    qualidade_contraste=qualidade_contraste,
                    qualidade_borda=qualidade_borda,
                    deslocamento_horizontal_relativo=(
                        deslocamento_horizontal_relativo
                    ),
                    angulo_vertical_graus=angulo_vertical_graus,
                    continuidade_estrutural=metricas_suporte.continuidade,
                    contraste_estrutural=(
                        metricas_suporte.contraste_mediano
                    ),
                    suporte_estrutural=metricas_suporte.suporte,
                )
            )

    if not pares:
        if encontrou_distancia_insuficiente:
            raise ErroMedicao(
                "Distância entre marcadores insuficiente para calibração."
            )
        raise ErroMedicao(
            "Marcadores de calibração em posição inválida."
        )
    pares_pontuados = tuple(
        sorted(pares, key=lambda par: par.pontuacao, reverse=True)
    )
    pares_ordenados = tuple(
        replace(
            par,
            confiavel=not (
                motivos := _motivos_baixa_confianca_par(
                    par, configuracao
                )
            ),
            motivos_baixa_confianca=motivos,
        )
        for par in pares_pontuados
    )
    par_confiavel = _selecionar_primeiro_par_confiavel(pares_ordenados)
    confianca_aprovada = par_confiavel is not None
    escolhido = par_confiavel or pares_ordenados[0]
    deteccao = DeteccaoMarcadores(
        azul=escolhido.azul,
        amarelo=escolhido.amarelo,
        distancia_pixels=escolhido.distancia_pixels,
        pontuacao_par=escolhido.pontuacao,
        mascara_azul=mascara_azul,
        mascara_amarela=mascara_amarela,
        candidatos_azuis=candidatos_azuis,
        candidatos_amarelos=candidatos_amarelos,
        pares_validos=pares_ordenados,
        confianca_aprovada=confianca_aprovada,
    )
    if not confianca_aprovada:
        raise ErroParMarcadoresSemConfianca(
            "Marcadores detectados, mas nenhum par de calibração "
            "confiável foi identificado.",
            deteccao,
        )
    return deteccao


def _converter_marcadores_em_referencia_regua(
    deteccao: DeteccaoMarcadores,
    imagem: np.ndarray,
) -> DeteccaoRegua:
    altura, largura = imagem.shape[:2]
    segmento = (deteccao.azul.centro, deteccao.amarelo.centro)
    return DeteccaoRegua(
        ponto_superior=deteccao.azul.centro,
        ponto_inferior=deteccao.amarelo.centro,
        candidatos=(segmento,),
        regiao_busca=(0, 0, largura, altura),
        pontuacao=deteccao.pontuacao_par,
        modo_validacao="marcadores",
        quantidade_marcas=2,
        proporcao_neutra=0.0,
        proporcao_largura=0.0,
        continuidade_bordas=1.0,
        estabilidade_largura=1.0,
        contraste_local=0.0,
        candidatos_pontuados=(),
    )


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


def _detectar_extremos_por_contraste_local(
    imagem_cinza: np.ndarray,
    esquerda: LinhaVertical,
    direita: LinhaVertical,
    configuracao: ConfiguracaoVisao,
) -> tuple[int, int] | None:
    y_inicial = max(0, min(esquerda.y_minimo, direita.y_minimo))
    y_final = min(
        imagem_cinza.shape[0] - 1,
        max(esquerda.y_maximo, direita.y_maximo),
    )
    if y_final <= y_inicial:
        return None

    linhas_com_contraste: list[bool] = []
    for y in range(y_inicial, y_final + 1):
        x_esquerda = round(min(esquerda.x_em(y), direita.x_em(y)))
        x_direita = round(max(esquerda.x_em(y), direita.x_em(y)))
        largura_regua = max(1, x_direita - x_esquerda)
        x_interior_1 = max(0, x_esquerda)
        x_interior_2 = min(imagem_cinza.shape[1], x_direita + 1)
        faixas_externas = (
            imagem_cinza[
                y, max(0, x_esquerda - largura_regua) : x_interior_1
            ],
            imagem_cinza[
                y,
                x_interior_2 : min(
                    imagem_cinza.shape[1],
                    x_direita + largura_regua + 1,
                ),
            ],
        )
        interior = imagem_cinza[y, x_interior_1:x_interior_2]
        faixas_validas = tuple(
            faixa for faixa in faixas_externas if faixa.size > 0
        )
        if interior.size == 0 or not faixas_validas:
            linhas_com_contraste.append(False)
            continue
        exterior = np.concatenate(faixas_validas)
        contraste = float(np.median(exterior) - np.median(interior))
        linhas_com_contraste.append(
            contraste
            >= configuracao.contraste_local_minimo_regua_alternativa
        )

    mascara_vertical = np.array(linhas_com_contraste, dtype=np.uint8).reshape(
        -1, 1
    )
    tamanho_fechamento = max(
        3,
        round(
            imagem_cinza.shape[0]
            * configuracao.falha_maxima_contraste_regua_alternativa
        ),
    )
    if tamanho_fechamento % 2 == 0:
        tamanho_fechamento += 1
    mascara_vertical = cv2.morphologyEx(
        mascara_vertical,
        cv2.MORPH_CLOSE,
        np.ones((tamanho_fechamento, 1), dtype=np.uint8),
    ).ravel()

    melhor_intervalo: tuple[int, int] | None = None
    inicio: int | None = None
    for indice, ativa in enumerate(mascara_vertical):
        if ativa and inicio is None:
            inicio = indice
        if inicio is None:
            continue
        if ativa and indice < len(mascara_vertical) - 1:
            continue
        fim = indice if ativa else indice - 1
        intervalo = (y_inicial + inicio, y_inicial + fim)
        if melhor_intervalo is None or (
            intervalo[1] - intervalo[0]
            > melhor_intervalo[1] - melhor_intervalo[0]
        ):
            melhor_intervalo = intervalo
        inicio = None
    return melhor_intervalo


def _calcular_metricas_estruturais_regua(
    imagem_cinza: np.ndarray,
    bordas: np.ndarray,
    primeira: LinhaVertical,
    segunda: LinhaVertical,
    configuracao: ConfiguracaoVisao,
) -> MetricasEstruturaisRegua:
    extremos_contraste = _detectar_extremos_por_contraste_local(
        imagem_cinza, primeira, segunda, configuracao
    )
    y_inicial = max(0, primeira.y_minimo, segunda.y_minimo)
    y_final = min(
        imagem_cinza.shape[0] - 1,
        primeira.y_maximo,
        segunda.y_maximo,
    )
    if y_final <= y_inicial:
        return MetricasEstruturaisRegua(
            extremos_contraste=extremos_contraste,
            continuidade_bordas=0.0,
            variacao_relativa_largura=1.0,
            estabilidade_largura=0.0,
            contraste_mediano=0.0,
        )

    larguras: list[float] = []
    contrastes: list[float] = []
    linhas_com_duas_bordas = 0
    quantidade_linhas = y_final - y_inicial + 1
    raio = configuracao.raio_suporte_bordas_regua_px
    for y in range(y_inicial, y_final + 1):
        x_esquerda = round(min(primeira.x_em(y), segunda.x_em(y)))
        x_direita = round(max(primeira.x_em(y), segunda.x_em(y)))
        largura_regua = max(1, x_direita - x_esquerda)
        larguras.append(float(largura_regua))
        apoio_esquerda = np.any(
            bordas[
                y,
                max(0, x_esquerda - raio) : min(
                    bordas.shape[1], x_esquerda + raio + 1
                ),
            ]
        )
        apoio_direita = np.any(
            bordas[
                y,
                max(0, x_direita - raio) : min(
                    bordas.shape[1], x_direita + raio + 1
                ),
            ]
        )
        if apoio_esquerda and apoio_direita:
            linhas_com_duas_bordas += 1

        interior = imagem_cinza[
            y, max(0, x_esquerda) : min(imagem_cinza.shape[1], x_direita + 1)
        ]
        faixas_externas = (
            imagem_cinza[
                y, max(0, x_esquerda - largura_regua) : max(0, x_esquerda)
            ],
            imagem_cinza[
                y,
                min(imagem_cinza.shape[1], x_direita + 1) : min(
                    imagem_cinza.shape[1],
                    x_direita + largura_regua + 1,
                ),
            ],
        )
        faixas_validas = tuple(
            faixa for faixa in faixas_externas if faixa.size > 0
        )
        if interior.size > 0 and faixas_validas:
            exterior = np.concatenate(faixas_validas)
            contrastes.append(
                float(np.median(exterior) - np.median(interior))
            )

    largura_media = float(np.mean(larguras))
    variacao_relativa_largura = float(
        np.std(larguras) / max(1.0, largura_media)
    )
    estabilidade_largura = max(
        0.0,
        1.0
        - variacao_relativa_largura
        / configuracao.variacao_referencia_largura_regua,
    )
    return MetricasEstruturaisRegua(
        extremos_contraste=extremos_contraste,
        continuidade_bordas=linhas_com_duas_bordas / quantidade_linhas,
        variacao_relativa_largura=variacao_relativa_largura,
        estabilidade_largura=estabilidade_largura,
        contraste_mediano=(
            float(np.median(contrastes)) if contrastes else 0.0
        ),
    )


def _tem_evidencia_estrutural_regua_padrao(
    proporcao_neutra: float,
    metricas: MetricasEstruturaisRegua,
    configuracao: ConfiguracaoVisao,
) -> bool:
    return bool(
        proporcao_neutra
        >= configuracao.neutralidade_minima_estrutura_regua_padrao
        or metricas.contraste_mediano
        >= configuracao.contraste_minimo_estrutura_regua_padrao
        or metricas.continuidade_bordas
        >= configuracao.continuidade_minima_estrutura_regua_padrao
        or metricas.estabilidade_largura
        >= configuracao.estabilidade_minima_estrutura_regua_padrao
    )


def _detectar_regua_na_regiao(
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
    imagem_cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)

    melhor: tuple[
        float,
        LinhaVertical,
        LinhaVertical,
        tuple[int, ...],
        str,
        float,
        float,
        tuple[int, int] | None,
        MetricasEstruturaisRegua,
    ] | None = None
    candidatos_pontuados: list[CandidatoRegua] = []

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
                configuracao.proporcao_largura_minima_regua_alternativa
                <= proporcao_largura
                <= configuracao.proporcao_largura_maxima_regua
            ):
                continue
            razao_aspecto = sobreposicao / max(1.0, largura_candidata)
            metricas_estruturais = _calcular_metricas_estruturais_regua(
                imagem_cinza,
                bordas,
                primeira,
                segunda,
                configuracao,
            )
            extensao_contraste_estrutural = (
                metricas_estruturais.extremos_contraste[1]
                - metricas_estruturais.extremos_contraste[0]
                if metricas_estruturais.extremos_contraste is not None
                else 0
            )
            aspecto_recuperado_por_estrutura = (
                extensao_contraste_estrutural
                >= altura
                * configuracao.proporcao_comprimento_bordas_regua_alternativa
                and metricas_estruturais.continuidade_bordas
                >= configuracao.continuidade_minima_bordas_regua
                and metricas_estruturais.variacao_relativa_largura
                <= configuracao.variacao_maxima_largura_regua
                and metricas_estruturais.contraste_mediano
                >= configuracao.contraste_mediano_minimo_regua
                and abs(
                    primeira.inclinacao_graus - segunda.inclinacao_graus
                )
                <= configuracao.diferenca_inclinacao_maxima_recuperacao_regua
            )
            if (
                razao_aspecto < configuracao.razao_aspecto_minima_regua
                and not aspecto_recuperado_por_estrutura
            ):
                continue
            usa_recuperacao_estrutural = (
                razao_aspecto < configuracao.razao_aspecto_minima_regua
                and aspecto_recuperado_por_estrutura
            )

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
            if len(marcas) < min(
                configuracao.quantidade_minima_marcas_regua,
                configuracao.quantidade_minima_marcas_regua_alternativa,
            ):
                continue
            extensao_marcas = marcas[-1] - marcas[0]
            extremos_contraste = metricas_estruturais.extremos_contraste
            extensao_contraste = (
                extremos_contraste[1] - extremos_contraste[0]
                if extremos_contraste is not None
                else 0
            )
            validacao_padrao = (
                proporcao_largura
                >= configuracao.proporcao_largura_minima_regua
                and len(marcas) >= configuracao.quantidade_minima_marcas_regua
                and extensao_marcas
                >= altura * configuracao.proporcao_minima_comprimento_regua
            )
            validacao_alternativa = (
                proporcao_largura
                <= configuracao.proporcao_largura_maxima_regua_alternativa
                and proporcao_neutra
                >= configuracao.proporcao_neutra_minima_regua_alternativa
                and len(marcas)
                >= configuracao.quantidade_minima_marcas_regua_alternativa
                and extensao_contraste
                >= altura
                * configuracao.proporcao_comprimento_bordas_regua_alternativa
                and sobreposicao
                >= altura
                * configuracao.proporcao_sobreposicao_regua_alternativa
                and (
                    razao_aspecto
                    >= configuracao.razao_aspecto_minima_regua_alternativa
                    or aspecto_recuperado_por_estrutura
                )
            )
            if not (validacao_padrao or validacao_alternativa):
                continue
            modo_validacao = (
                "padrao" if validacao_padrao else "alternativa_restrita"
            )
            extensao_referencia = (
                extensao_marcas if validacao_padrao else extensao_contraste
            )

            distancia_largura_esperada = abs(
                proporcao_largura - configuracao.proporcao_largura_esperada_regua
            )
            centro_x_relativo = ((esquerda + direita) / 2) / largura
            distancia_posicao = abs(
                centro_x_relativo
                - configuracao.posicao_horizontal_esperada_regua
            )
            qualidade_contraste = min(
                1.0,
                max(0.0, metricas_estruturais.contraste_mediano)
                / configuracao.contraste_referencia_regua,
            )
            pontuacao = (
                2.0 * sobreposicao / altura
                + 7.0 * extensao_referencia / altura
                + 2.0 * len(marcas) / max(1, extensao_marcas)
                + 4.0 * proporcao_neutra
                - configuracao.peso_posicao_horizontal_regua
                * distancia_posicao
                - 18.0 * distancia_largura_esperada
                + usa_recuperacao_estrutural
                * configuracao.peso_continuidade_bordas_regua
                * metricas_estruturais.continuidade_bordas
                + usa_recuperacao_estrutural
                * configuracao.peso_estabilidade_largura_regua
                * metricas_estruturais.estabilidade_largura
                + usa_recuperacao_estrutural
                * configuracao.peso_contraste_local_regua
                * qualidade_contraste
                - (
                    configuracao.penalidade_pontuacao_regua_alternativa
                    if modo_validacao == "alternativa_restrita"
                    else 0.0
                )
            )
            margem_extremos_candidato = round(
                altura * configuracao.margem_extremos_regua_proporcao
            )
            if modo_validacao == "padrao":
                y_candidato_superior = marcas[0]
                y_candidato_inferior = marcas[-1]
            else:
                if extremos_contraste is None:
                    continue
                y_candidato_superior, y_candidato_inferior = extremos_contraste
            y_candidato_superior = max(
                y1_roi, y_candidato_superior - margem_extremos_candidato
            )
            y_candidato_inferior = min(
                y2_roi - 1,
                y_candidato_inferior + margem_extremos_candidato,
            )
            candidatos_pontuados.append(
                CandidatoRegua(
                    ponto_superior=(
                        round(
                            (
                                primeira.x_em(y_candidato_superior)
                                + segunda.x_em(y_candidato_superior)
                            )
                            / 2
                        ),
                        y_candidato_superior,
                    ),
                    ponto_inferior=(
                        round(
                            (
                                primeira.x_em(y_candidato_inferior)
                                + segunda.x_em(y_candidato_inferior)
                            )
                            / 2
                        ),
                        y_candidato_inferior,
                    ),
                    pontuacao=pontuacao,
                    modo_validacao=modo_validacao,
                    quantidade_marcas=len(marcas),
                    continuidade_bordas=(
                        metricas_estruturais.continuidade_bordas
                    ),
                    estabilidade_largura=(
                        metricas_estruturais.estabilidade_largura
                    ),
                    contraste_local=metricas_estruturais.contraste_mediano,
                )
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
                    modo_validacao,
                    proporcao_neutra,
                    proporcao_largura,
                    extremos_contraste,
                    metricas_estruturais,
                )

    if melhor is None:
        raise ErroMedicao("Régua não detectada.")

    (
        pontuacao,
        esquerda,
        direita,
        marcas,
        modo_validacao,
        proporcao_neutra,
        proporcao_largura,
        extremos_contraste,
        metricas_estruturais,
    ) = melhor
    margem_extremos = round(
        altura * configuracao.margem_extremos_regua_proporcao
    )
    if modo_validacao == "padrao":
        y_referencia_superior = marcas[0]
        y_referencia_inferior = marcas[-1]
        proporcao_minima_comprimento = (
            configuracao.proporcao_minima_comprimento_regua
        )
    else:
        if extremos_contraste is None:
            raise ErroMedicao("Régua não detectada.")
        y_referencia_superior, y_referencia_inferior = extremos_contraste
        proporcao_minima_comprimento = (
            configuracao.proporcao_comprimento_bordas_regua_alternativa
        )
    y_superior = max(y1_roi, y_referencia_superior - margem_extremos)
    y_inferior = min(y2_roi - 1, y_referencia_inferior + margem_extremos)
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
        altura * proporcao_minima_comprimento
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
        pontuacao=pontuacao,
        modo_validacao=modo_validacao,
        quantidade_marcas=len(marcas),
        proporcao_neutra=proporcao_neutra,
        proporcao_largura=proporcao_largura,
        continuidade_bordas=metricas_estruturais.continuidade_bordas,
        estabilidade_largura=metricas_estruturais.estabilidade_largura,
        contraste_local=metricas_estruturais.contraste_mediano,
        candidatos_pontuados=tuple(
            sorted(
                candidatos_pontuados,
                key=lambda candidato: candidato.pontuacao,
                reverse=True,
            )[:4]
        ),
    )


def _deteccao_padrao_tem_evidencia_estrutural(
    deteccao: DeteccaoRegua,
    configuracao: ConfiguracaoVisao,
) -> bool:
    return _tem_evidencia_estrutural_regua_padrao(
        deteccao.proporcao_neutra,
        MetricasEstruturaisRegua(
            extremos_contraste=None,
            continuidade_bordas=deteccao.continuidade_bordas,
            variacao_relativa_largura=0.0,
            estabilidade_largura=deteccao.estabilidade_largura,
            contraste_mediano=deteccao.contraste_local,
        ),
        configuracao,
    )


def _deteccao_regua_tem_estrutura_forte(
    deteccao: DeteccaoRegua,
    configuracao: ConfiguracaoVisao,
) -> bool:
    return bool(
        deteccao.proporcao_neutra
        >= configuracao.neutralidade_minima_estrutura_regua_padrao
        and deteccao.continuidade_bordas
        >= configuracao.continuidade_minima_bordas_regua
        and deteccao.contraste_local
        >= configuracao.contraste_mediano_minimo_regua
    )


def detectar_regua(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> DeteccaoRegua:
    deteccao_primaria = _detectar_regua_na_regiao(imagem, configuracao)
    if (
        deteccao_primaria.modo_validacao != "padrao"
        or _deteccao_padrao_tem_evidencia_estrutural(
            deteccao_primaria, configuracao
        )
    ):
        return deteccao_primaria

    configuracao_ampliada = replace(
        configuracao,
        regiao_busca_regua=configuracao.regiao_busca_regua_ampliada,
        peso_posicao_horizontal_regua=0.0,
    )
    try:
        deteccao_ampliada = _detectar_regua_na_regiao(
            imagem, configuracao_ampliada
        )
    except ErroMedicao as erro:
        raise ErroMedicao("Régua não detectada.") from erro
    if _deteccao_regua_tem_estrutura_forte(
        deteccao_ampliada, configuracao
    ):
        return deteccao_ampliada
    raise ErroMedicao("Régua não detectada.")


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


def processar_mascara_vegetacao(
    mascara: np.ndarray,
    area_minima: int,
    configuracao: ConfiguracaoVisao,
) -> np.ndarray:
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
    return filtrar_componentes(mascara, area_minima)


def segmentar_vegetacao(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> np.ndarray:
    altura, largura = imagem.shape[:2]
    x_inicial, y_inicial, x_final, y_final = converter_regiao_relativa(
        configuracao.regiao_vegetacao, largura, altura
    )
    hsv = cv2.cvtColor(imagem, cv2.COLOR_BGR2HSV)
    mascara_hsv_confiavel = cv2.inRange(
        hsv,
        np.array(configuracao.hsv_verde_inferior, dtype=np.uint8),
        np.array(configuracao.hsv_verde_superior, dtype=np.uint8),
    )
    mascara_regiao = np.zeros_like(mascara_hsv_confiavel)
    mascara_regiao[y_inicial:y_final, x_inicial:x_final] = 255
    mascara_hsv_confiavel = cv2.bitwise_and(
        mascara_hsv_confiavel, mascara_regiao
    )

    mascara_hsv_tolerante = cv2.inRange(
        hsv,
        np.array(configuracao.hsv_verde_tolerante_inferior, dtype=np.uint8),
        np.array(configuracao.hsv_verde_tolerante_superior, dtype=np.uint8),
    )
    azul, verde, vermelho = cv2.split(imagem.astype(np.int16))
    excesso_verde = 2 * verde - vermelho - azul
    vantagem = configuracao.vantagem_canal_verde_minima
    mascara_dominancia_absoluta = (
        (verde >= vermelho + vantagem)
        & (verde >= azul + vantagem)
        & (excesso_verde >= configuracao.excesso_verde_minimo)
    ).astype(np.uint8) * 255

    kernel_proximidade = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (configuracao.tamanho_kernel_proximidade_verde,) * 2,
    )
    vizinhanca_confiavel = cv2.dilate(
        mascara_hsv_confiavel, kernel_proximidade
    )
    mascara_tolerante_validacao = cv2.bitwise_and(
        mascara_hsv_tolerante, mascara_dominancia_absoluta
    )
    mascara_tolerante_validacao = cv2.bitwise_and(
        mascara_tolerante_validacao, vizinhanca_confiavel
    )
    mascara_tolerante_validacao = cv2.bitwise_and(
        mascara_tolerante_validacao, mascara_regiao
    )
    area_minima = max(
        configuracao.area_minima_componente_px,
        round(altura * largura * configuracao.proporcao_area_minima_componente),
    )
    mascara_validacao = cv2.bitwise_or(
        mascara_hsv_confiavel, mascara_tolerante_validacao
    )
    mascara_validacao = processar_mascara_vegetacao(
        mascara_validacao, area_minima, configuracao
    )
    if np.count_nonzero(mascara_validacao) / mascara_validacao.size > (
        configuracao.proporcao_maxima_mascara_vegetacao
    ):
        raise ErroMedicao("Vegetação não identificada.")

    pixels_base_exg = (
        (mascara_regiao > 0)
        & (hsv[:, :, 2] >= configuracao.hsv_verde_tolerante_inferior[2])
    )
    base_excesso_verde = (
        float(np.median(excesso_verde[pixels_base_exg]))
        if np.any(pixels_base_exg)
        else 0.0
    )
    limite_excesso_relativo = (
        base_excesso_verde + configuracao.margem_excesso_verde_relativo
    )
    pixels_semente = (
        (hsv[:, :, 1] >= configuracao.saturacao_semente_verde)
        | (excesso_verde >= limite_excesso_relativo)
    ).astype(np.uint8) * 255
    mascara_semente = cv2.bitwise_and(
        mascara_hsv_confiavel, pixels_semente
    )
    mascara_dominancia_relativa = (
        (verde >= vermelho + vantagem)
        & (verde >= azul + vantagem)
        & (excesso_verde >= limite_excesso_relativo)
    ).astype(np.uint8) * 255
    vizinhanca_semente = cv2.dilate(mascara_semente, kernel_proximidade)
    mascara_tolerante_proxima = cv2.bitwise_and(
        mascara_hsv_tolerante, mascara_dominancia_relativa
    )
    mascara_tolerante_proxima = cv2.bitwise_and(
        mascara_tolerante_proxima, vizinhanca_semente
    )
    mascara_tolerante_proxima = cv2.bitwise_and(
        mascara_tolerante_proxima, mascara_regiao
    )
    mascara = cv2.bitwise_or(mascara_semente, mascara_tolerante_proxima)
    mascara = processar_mascara_vegetacao(
        mascara, area_minima, configuracao
    )
    if np.count_nonzero(mascara) == 0:
        raise ErroMedicao("Vegetação não identificada.")

    pixels_por_linha = np.count_nonzero(mascara, axis=1)
    inicio_supressao = round(
        altura * configuracao.inicio_supressao_fundo_inferior
    )
    limite_linha_larga = round(
        largura * configuracao.proporcao_maxima_pixels_linha_inferior
    )
    linhas = np.arange(altura)
    linhas_de_fundo = (
        (linhas >= inicio_supressao)
        & (pixels_por_linha > limite_linha_larga)
    )
    mascara[linhas_de_fundo] = 0
    mascara = filtrar_componentes(mascara, area_minima)
    if np.count_nonzero(mascara) == 0:
        raise ErroMedicao("Vegetação não identificada.")
    return mascara


def _componentes_da_regiao(
    mascara: np.ndarray,
    regiao: tuple[int, int, int, int],
    area_minima: int,
) -> tuple[np.ndarray, tuple[ComponenteVegetal, ...]]:
    x1, y1, x2, y2 = regiao
    recorte = mascara[y1:y2, x1:x2]
    quantidade, rotulos, estatisticas, _ = cv2.connectedComponentsWithStats(
        recorte, connectivity=8
    )
    componentes: list[ComponenteVegetal] = []
    for rotulo in range(1, quantidade):
        x, y, largura, altura, area = (
            int(valor) for valor in estatisticas[rotulo]
        )
        if area < area_minima:
            continue
        componentes.append(
            ComponenteVegetal(
                rotulo=rotulo,
                x=x + x1,
                y=y + y1,
                largura=largura,
                altura=altura,
                area=area,
            )
        )
    return rotulos, tuple(componentes)


def _componentes_proximos(
    primeiro: ComponenteVegetal,
    segundo: ComponenteVegetal,
    distancia_vertical: int,
    distancia_horizontal: int,
) -> bool:
    separacao_vertical = max(
        0,
        max(primeiro.y, segundo.y) - min(primeiro.inferior, segundo.inferior),
    )
    separacao_horizontal = max(
        0,
        max(primeiro.x, segundo.x) - min(primeiro.direita, segundo.direita),
    )
    return (
        separacao_vertical <= distancia_vertical
        and separacao_horizontal <= distancia_horizontal
    )


def _avaliar_lado_vegetacao(
    imagem: np.ndarray,
    mascara_candidata: np.ndarray,
    lado: str,
    regiao: tuple[int, int, int, int],
    referencia_base_y: int,
    comprimento_regua: float,
    area_minima: int,
    configuracao: ConfiguracaoVisao,
) -> CandidatoVegetal | None:
    rotulos, componentes = _componentes_da_regiao(
        mascara_candidata, regiao, area_minima
    )
    if not componentes:
        return None

    distancia_base = round(
        comprimento_regua * configuracao.distancia_maxima_componente_base
    )
    sementes = tuple(
        componente
        for componente in componentes
        if abs(referencia_base_y - componente.inferior) <= distancia_base
    )
    if not sementes:
        return None

    distancia_vertical = round(
        comprimento_regua * configuracao.distancia_maxima_uniao_vertical
    )
    distancia_horizontal = round(
        comprimento_regua * configuracao.distancia_maxima_uniao_horizontal
    )
    selecionados = set(sementes)
    alterado = True
    while alterado:
        alterado = False
        for componente in componentes:
            if componente in selecionados:
                continue
            if any(
                _componentes_proximos(
                    componente,
                    selecionado,
                    distancia_vertical,
                    distancia_horizontal,
                )
                for selecionado in selecionados
            ):
                selecionados.add(componente)
                alterado = True

    x1, y1, x2, y2 = regiao
    mascara_selecionada = np.zeros_like(mascara_candidata)
    recorte_selecionado = mascara_selecionada[y1:y2, x1:x2]
    for componente in selecionados:
        recorte_selecionado[rotulos == componente.rotulo] = 255

    pontos = cv2.findNonZero(mascara_selecionada)
    if pontos is None:
        return None
    x, y, largura, altura = cv2.boundingRect(pontos)
    area = int(np.count_nonzero(mascara_selecionada))
    preenchimento = area / max(1, largura * altura)
    cobertura_roi = area / max(1, (x2 - x1) * (y2 - y1))
    largura_relativa = largura / comprimento_regua
    altura_relativa = altura / comprimento_regua
    if (
        largura_relativa < configuracao.largura_minima_componente_vegetal
        or altura_relativa < configuracao.altura_minima_componente_vegetal
        or preenchimento
        > configuracao.preenchimento_maximo_componente_vegetal
        or cobertura_roi > configuracao.cobertura_maxima_roi_vegetacao
    ):
        return None

    bordas_tocadas = sum(
        (
            x <= x1,
            x + largura >= x2,
            y <= y1,
            y + altura >= y2,
        )
    )

    distancia_inferior = abs(referencia_base_y - (y + altura))
    distancia_base_relativa = distancia_inferior / comprimento_regua
    recorte_componente = mascara_selecionada[y : y + altura, x : x + largura]
    faixas = np.array_split(
        recorte_componente,
        configuracao.quantidade_faixas_estrutura_vertical,
        axis=0,
    )
    faixas_ativas = sum(
        np.count_nonzero(faixa) / max(1, faixa.size)
        >= configuracao.densidade_minima_faixa_ativa
        for faixa in faixas
    )
    continuidade_vertical = faixas_ativas / len(faixas)
    if continuidade_vertical < configuracao.proporcao_minima_faixas_ativas:
        return None

    fim_copa = max(1, round(altura * 0.60))
    colunas_copa = np.flatnonzero(
        np.count_nonzero(recorte_componente[:fim_copa], axis=0)
    )
    largura_copa = (
        int(colunas_copa[-1] - colunas_copa[0] + 1)
        if colunas_copa.size
        else 0
    )
    largura_copa_relativa = largura_copa / comprimento_regua

    cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)
    gradiente_x = cv2.Sobel(cinza, cv2.CV_32F, 1, 0, ksize=3)
    gradiente_y = cv2.Sobel(cinza, cv2.CV_32F, 0, 1, ksize=3)
    magnitude_gradiente = cv2.magnitude(gradiente_x, gradiente_y)
    borda_mascara = cv2.morphologyEx(
        mascara_selecionada,
        cv2.MORPH_GRADIENT,
        cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)),
    )
    pixels_borda_interna = (borda_mascara > 0) & (mascara_selecionada > 0)
    textura_media = (
        float(np.mean(magnitude_gradiente[pixels_borda_interna]))
        if np.any(pixels_borda_interna)
        else 0.0
    )
    if textura_media < configuracao.gradiente_borda_minimo_vegetacao:
        return None

    pixels_por_linha_roi = np.count_nonzero(
        mascara_selecionada[y1:y2, x1:x2], axis=1
    )
    linhas_horizontais = pixels_por_linha_roi >= round(
        (x2 - x1) * configuracao.proporcao_linha_horizontal_extensa
    )
    proporcao_linhas_horizontais = float(np.mean(linhas_horizontais))
    textura_normalizada = min(1.0, textura_media / 100.0)
    evidencia_area = min(
        1.0, area / max(1.0, comprimento_regua**2 * 0.12)
    )
    pontuacao = (
        3.2 * altura_relativa
        + 1.6 * largura_relativa
        + 1.2 * continuidade_vertical
        + 0.8 * largura_copa_relativa
        + 0.8 * textura_normalizada
        + 1.2 * evidencia_area
        - 1.2 * preenchimento
        - 0.8 * cobertura_roi
        - 1.6 * distancia_base_relativa
        - 1.4 * proporcao_linhas_horizontais
        - 0.4 * bordas_tocadas
    )
    aceito_por_coerencia_bordas = bool(
        bordas_tocadas == 3
        and distancia_base_relativa
        <= configuracao.distancia_base_maxima_excecao_tres_bordas
        and continuidade_vertical
        >= configuracao.continuidade_minima_excecao_tres_bordas
        and textura_media
        >= configuracao.gradiente_minimo_excecao_tres_bordas
        and cobertura_roi
        <= configuracao.cobertura_maxima_excecao_tres_bordas
        and preenchimento
        <= configuracao.preenchimento_maximo_excecao_tres_bordas
        and altura_relativa
        >= configuracao.altura_minima_excecao_tres_bordas
        and largura_copa_relativa
        >= configuracao.largura_copa_minima_excecao_tres_bordas
        and proporcao_linhas_horizontais
        <= configuracao.proporcao_maxima_linhas_excecao_tres_bordas
        and pontuacao
        >= configuracao.pontuacao_minima_excecao_tres_bordas
    )
    if bordas_tocadas >= 3 and not aceito_por_coerencia_bordas:
        return None
    return CandidatoVegetal(
        lado=lado,
        pontuacao=pontuacao,
        mascara=mascara_selecionada,
        regiao_busca=regiao,
        continuidade_vertical=continuidade_vertical,
        largura_copa_relativa=largura_copa_relativa,
        distancia_base_relativa=distancia_base_relativa,
        textura_media=textura_media,
        proporcao_linhas_horizontais=proporcao_linhas_horizontais,
        bordas_tocadas=bordas_tocadas,
        aceito_por_coerencia_bordas=aceito_por_coerencia_bordas,
    )


def selecionar_componente_vegetal(
    imagem: np.ndarray,
    mascara_candidata: np.ndarray,
    deteccao_regua: DeteccaoRegua,
    configuracao: ConfiguracaoVisao,
) -> tuple[
    np.ndarray,
    tuple[int, int, int, int],
    tuple[tuple[int, int, int, int], ...],
    tuple[CandidatoVegetal, ...],
    str,
]:
    altura, largura = mascara_candidata.shape
    comprimento_regua = math.dist(
        deteccao_regua.ponto_superior, deteccao_regua.ponto_inferior
    )
    x_regua = round(
        (deteccao_regua.ponto_superior[0] + deteccao_regua.ponto_inferior[0])
        / 2
    )
    margem_vertical = round(
        comprimento_regua * configuracao.margem_vertical_roi_vegetacao
    )
    y1 = max(0, deteccao_regua.ponto_superior[1] - margem_vertical)
    y2 = min(altura, deteccao_regua.ponto_inferior[1] + margem_vertical)
    afastamento = round(
        comprimento_regua * configuracao.afastamento_interno_roi_vegetacao
    )
    alcance = round(
        comprimento_regua * configuracao.alcance_externo_roi_vegetacao
    )
    regioes = (
        (max(0, x_regua - alcance), y1, max(0, x_regua - afastamento), y2),
        (min(largura, x_regua + afastamento), y1, min(largura, x_regua + alcance), y2),
    )
    area_minima = max(
        configuracao.area_minima_componente_px,
        round(altura * largura * configuracao.proporcao_area_minima_componente),
    )
    candidatos = tuple(
        candidato
        for lado, regiao in zip(("esquerda", "direita"), regioes, strict=True)
        if regiao[2] > regiao[0] and regiao[3] > regiao[1]
        for candidato in (
            _avaliar_lado_vegetacao(
                imagem,
                mascara_candidata,
                lado,
                regiao,
                deteccao_regua.ponto_inferior[1],
                comprimento_regua,
                area_minima,
                configuracao,
            ),
        )
        if candidato is not None
    )
    if not candidatos:
        raise ErroMedicao("Vegetação não identificada.")
    melhor = max(candidatos, key=lambda candidato: candidato.pontuacao)
    return (
        melhor.mascara,
        melhor.regiao_busca,
        regioes,
        candidatos,
        melhor.lado,
    )


def detectar_topo(
    mascara: np.ndarray,
    pixels_minimos_linha: int,
    configuracao: ConfiguracaoVisao,
) -> int:
    pixels_por_linha = np.count_nonzero(mascara, axis=1)
    linhas_com_mascara = pixels_por_linha >= pixels_minimos_linha
    densidade = np.convolve(
        linhas_com_mascara.astype(np.uint8),
        np.ones(configuracao.janela_topo_px, dtype=np.uint8),
        mode="same",
    )
    linhas_validas = np.flatnonzero(
        linhas_com_mascara
        & (densidade >= configuracao.linhas_validas_janela_topo)
    )
    if linhas_validas.size == 0:
        raise ErroMedicao("Vegetação não identificada.")
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

    # O marco de 0 cm está alinhado à superfície do solo. A máscara serve para
    # validar que há estrutura vegetal próxima, mas não desloca a base física.
    base_y = referencia_regua_y
    if base_y <= topo_y or base_y >= altura:
        raise ErroMedicao("Base da vegetação não identificada.")
    return base_y


def _medir_com_referencia_regua(
    imagem: np.ndarray,
    configuracao: ConfiguracaoVisao,
    deteccao_regua: DeteccaoRegua,
    deteccao_marcadores: DeteccaoMarcadores | None,
) -> ResultadoMedicao:
    pixels_por_cm = calcular_escala(deteccao_regua, configuracao)
    mascara_candidata = segmentar_vegetacao(imagem, configuracao)
    (
        mascara,
        regiao_busca_vegetacao,
        regioes_busca_vegetacao,
        candidatos_vegetacao,
        lado_vegetacao,
    ) = selecionar_componente_vegetal(
        imagem, mascara_candidata, deteccao_regua, configuracao
    )
    topo_y = detectar_topo(
        mascara, configuracao.pixels_minimos_linha_topo, configuracao
    )
    base_y = detectar_base(
        mascara, deteccao_regua.ponto_inferior[1], topo_y, configuracao
    )
    altura_vegetacao_px = base_y - topo_y
    if altura_vegetacao_px <= 0 or pixels_por_cm <= 0:
        raise ErroMedicao("Medição inválida.")

    colunas_vegetacao = np.flatnonzero(np.count_nonzero(mascara, axis=0))
    x_medicao = int(np.median(colunas_vegetacao))
    return ResultadoMedicao(
        pixels_por_cm=pixels_por_cm,
        altura_cm=altura_vegetacao_px / pixels_por_cm,
        topo_y=topo_y,
        base_y=base_y,
        x_medicao=x_medicao,
        mascara_candidata_vegetacao=mascara_candidata,
        mascara_vegetacao=mascara,
        regiao_busca_vegetacao=regiao_busca_vegetacao,
        regioes_busca_vegetacao=regioes_busca_vegetacao,
        candidatos_vegetacao=candidatos_vegetacao,
        lado_vegetacao=lado_vegetacao,
        deteccao_regua=deteccao_regua,
        deteccao_marcadores=deteccao_marcadores,
    )


def medir_vegetacao_legado(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> ResultadoMedicao:
    return _medir_com_referencia_regua(
        imagem,
        configuracao,
        detectar_regua(imagem, configuracao),
        None,
    )


def medir_vegetacao(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> ResultadoMedicao:
    deteccao_marcadores = detectar_marcadores_calibracao(
        imagem, configuracao
    )
    return _medir_com_referencia_regua(
        imagem,
        configuracao,
        _converter_marcadores_em_referencia_regua(
            deteccao_marcadores, imagem
        ),
        deteccao_marcadores,
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


def _obter_par_escolhido(
    deteccao: DeteccaoMarcadores,
) -> ParMarcadoresCalibracao:
    return next(
        par
        for par in deteccao.pares_validos
        if par.azul.centro == deteccao.azul.centro
        and par.amarelo.centro == deteccao.amarelo.centro
    )


def desenhar_candidatos_marcadores(
    imagem: np.ndarray,
    deteccao: DeteccaoMarcadores,
    configuracao: ConfiguracaoVisao,
) -> None:
    for prefixo, candidatos, cor in (
        ("B", deteccao.candidatos_azuis, configuracao.cor_marcador_azul_bgr),
        (
            "A",
            deteccao.candidatos_amarelos,
            configuracao.cor_marcador_amarelo_bgr,
        ),
    ):
        selecionado = (
            deteccao.azul if prefixo == "B" else deteccao.amarelo
        )
        candidatos_diagnostico = sorted(
            candidatos,
            key=lambda marcador: (
                marcador.centro == selecionado.centro,
                marcador.qualidade_cor
                + min(
                    1.0,
                    marcador.contraste_local
                    / configuracao.contraste_referencia_marcador,
                )
                + marcador.compactacao,
            ),
            reverse=True,
        )[: configuracao.quantidade_candidatos_marcadores_diagnostico]
        for indice, marcador in enumerate(
            candidatos_diagnostico, start=1
        ):
            x1, y1, x2, y2 = marcador.caixa
            cv2.rectangle(imagem, (x1, y1), (x2, y2), cor, 1)
            cv2.putText(
                imagem,
                f"{prefixo}{indice}",
                (max(0, x1), max(14, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.38,
                cor,
                1,
                cv2.LINE_AA,
            )

    for indice, par in enumerate(deteccao.pares_validos[:3], start=1):
        escolhido = (
            deteccao.confianca_aprovada
            and par.azul.centro == deteccao.azul.centro
            and par.amarelo.centro == deteccao.amarelo.centro
        )
        cor = (
            configuracao.cor_linha_calibracao_bgr
            if escolhido
            else configuracao.cor_candidato_regua_bgr
        )
        cv2.line(
            imagem,
            par.azul.centro,
            par.amarelo.centro,
            cor,
            3 if escolhido else 1,
        )
        meio = (
            round((par.azul.centro[0] + par.amarelo.centro[0]) / 2),
            round((par.azul.centro[1] + par.amarelo.centro[1]) / 2),
        )
        cv2.putText(
            imagem,
            (
                f"P{indice} {par.pontuacao:.2f} "
                f"a{par.alinhamento * 100:.0f}% "
                f"e{par.suporte_estrutural * 100:.0f}% "
                f"{'OK' if par.confiavel else 'X'}"
            ),
            (max(0, meio[0] + 5), max(14, meio[1])),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            cor,
            1,
            cv2.LINE_AA,
        )


def gerar_diagnostico_marcadores_rejeitada(
    imagem: np.ndarray,
    deteccao: DeteccaoMarcadores,
    motivo: str,
    caminho_saida: Path,
    configuracao: ConfiguracaoVisao,
) -> None:
    diagnostico = imagem.copy()
    desenhar_candidatos_marcadores(
        diagnostico, deteccao, configuracao
    )
    cor_referencia = (
        configuracao.cor_linha_calibracao_bgr
        if deteccao.confianca_aprovada
        else configuracao.cor_candidato_regua_bgr
    )
    cv2.line(
        diagnostico,
        deteccao.azul.centro,
        deteccao.amarelo.centro,
        cor_referencia,
        4 if deteccao.confianca_aprovada else 2,
    )
    for marcador, cor in (
        (deteccao.azul, configuracao.cor_marcador_azul_bgr),
        (deteccao.amarelo, configuracao.cor_marcador_amarelo_bgr),
    ):
        x1, y1, x2, y2 = marcador.caixa
        cv2.rectangle(diagnostico, (x1, y1), (x2, y2), cor, 3)
        cv2.circle(diagnostico, marcador.centro, 8, cor, -1)
    desenhar_rotulo(
        diagnostico,
        (
            "Calibracao por marcadores valida"
            if deteccao.confianca_aprovada
            else "Calibracao por marcadores rejeitada"
        ),
        (24, 38),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        "Referencia: 60 cm",
        (24, 78),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        f"Motivo: {motivo}",
        (24, 118),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        f"Score do par: {deteccao.pontuacao_par:.2f}",
        (24, 158),
        configuracao,
    )
    par_escolhido = _obter_par_escolhido(deteccao)
    desenhar_rotulo(
        diagnostico,
        (
            f"Alinhamento: {par_escolhido.alinhamento * 100:.0f}% | "
            f"suporte: {par_escolhido.suporte_estrutural * 100:.0f}%"
        ),
        (24, 198),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        (
            "Confianca: APROVADA"
            if deteccao.confianca_aprovada
            else "Confianca: REPROVADA"
        ),
        (24, 238),
        configuracao,
    )
    caminho_saida.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(caminho_saida), diagnostico):
        raise ErroMedicao(
            f"Não foi possível salvar o diagnóstico em {caminho_saida}."
        )


def gerar_diagnostico_regua_rejeitada(
    imagem: np.ndarray,
    deteccao: DeteccaoRegua,
    motivo: str,
    caminho_saida: Path,
    configuracao: ConfiguracaoVisao,
) -> None:
    diagnostico = imagem.copy()
    x1_roi, y1_roi, x2_roi, y2_roi = deteccao.regiao_busca
    cv2.rectangle(
        diagnostico,
        (x1_roi, y1_roi),
        (x2_roi, y2_roi),
        configuracao.cor_regiao_busca_bgr,
        2,
    )
    x_regua = (deteccao.ponto_superior[0] + deteccao.ponto_inferior[0]) / 2
    limite_distancia = (
        diagnostico.shape[1]
        * configuracao.distancia_candidato_diagnostico_proporcao
    )
    candidatos_proximos = sorted(
        (
            segmento
            for segmento in deteccao.candidatos
            if abs((segmento[0][0] + segmento[1][0]) / 2 - x_regua)
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

    for indice, candidato in enumerate(
        deteccao.candidatos_pontuados[
            : configuracao.quantidade_candidatos_pontuados_diagnostico
        ],
        start=1,
    ):
        cor = (
            configuracao.cor_regua_bgr
            if candidato.ponto_superior
            == deteccao.ponto_superior
            and candidato.ponto_inferior
            == deteccao.ponto_inferior
            else configuracao.cor_candidato_regua_bgr
        )
        cv2.line(
            diagnostico,
            candidato.ponto_superior,
            candidato.ponto_inferior,
            cor,
            2,
        )
        texto_candidato = (
            f"R{indice} {candidato.pontuacao:.2f} "
            f"{candidato.modo_validacao} m{candidato.quantidade_marcas}"
        )
        posicao_texto = (
            min(diagnostico.shape[1] - 250, candidato.ponto_superior[0] + 8),
            max(18, candidato.ponto_superior[1] + 20),
        )
        cv2.putText(
            diagnostico,
            texto_candidato,
            posicao_texto,
            cv2.FONT_HERSHEY_SIMPLEX,
            0.48,
            (20, 18, 24),
            3,
            cv2.LINE_AA,
        )
        cv2.putText(
            diagnostico,
            texto_candidato,
            posicao_texto,
            cv2.FONT_HERSHEY_SIMPLEX,
            0.48,
            cor,
            1,
            cv2.LINE_AA,
        )

    cv2.line(
        diagnostico,
        deteccao.ponto_superior,
        deteccao.ponto_inferior,
        configuracao.cor_regua_bgr,
        4,
    )
    cv2.circle(
        diagnostico,
        deteccao.ponto_superior,
        7,
        configuracao.cor_regua_bgr,
        -1,
    )
    cv2.circle(
        diagnostico,
        deteccao.ponto_inferior,
        7,
        configuracao.cor_regua_bgr,
        -1,
    )
    desenhar_rotulo(
        diagnostico,
        "Regua detectada; processamento posterior rejeitado",
        (24, 38),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        (
            f"Modo {deteccao.modo_validacao} | score {deteccao.pontuacao:.2f} | "
            f"marcas {deteccao.quantidade_marcas}"
        ),
        (24, 78),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        f"Motivo: {motivo}",
        (24, 118),
        configuracao,
    )
    caminho_saida.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(caminho_saida), diagnostico):
        raise ErroMedicao(
            f"Não foi possível salvar o diagnóstico em {caminho_saida}."
        )


def gerar_diagnostico(
    imagem: np.ndarray,
    resultado: ResultadoMedicao,
    caminho_saida: Path,
    configuracao: ConfiguracaoVisao,
) -> None:
    diagnostico = imagem.copy()
    sobreposicao_candidata = diagnostico.copy()
    sobreposicao_candidata[
        resultado.mascara_candidata_vegetacao > 0
    ] = configuracao.cor_candidata_vegetacao_bgr
    diagnostico = cv2.addWeighted(
        sobreposicao_candidata, 0.18, diagnostico, 0.82, 0
    )
    cores_lado = {
        "esquerda": configuracao.cor_roi_esquerda_bgr,
        "direita": configuracao.cor_roi_direita_bgr,
    }
    for candidato in resultado.candidatos_vegetacao:
        sobreposicao_lado = diagnostico.copy()
        sobreposicao_lado[candidato.mascara > 0] = cores_lado[candidato.lado]
        diagnostico = cv2.addWeighted(
            sobreposicao_lado, 0.16, diagnostico, 0.84, 0
        )
    sobreposicao = diagnostico.copy()
    sobreposicao[resultado.mascara_vegetacao > 0] = configuracao.cor_vegetacao_bgr
    diagnostico = cv2.addWeighted(sobreposicao, 0.38, diagnostico, 0.62, 0)
    contornos_vegetacao, _ = cv2.findContours(
        resultado.mascara_vegetacao,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )
    cv2.drawContours(
        diagnostico,
        contornos_vegetacao,
        -1,
        configuracao.cor_vegetacao_bgr,
        1,
    )

    for lado, regiao in zip(
        ("esquerda", "direita"),
        resultado.regioes_busca_vegetacao,
        strict=True,
    ):
        x1_vegetacao, y1_vegetacao, x2_vegetacao, y2_vegetacao = regiao
        cv2.rectangle(
            diagnostico,
            (x1_vegetacao, y1_vegetacao),
            (x2_vegetacao, y2_vegetacao),
            cores_lado[lado],
            1,
        )
    x1_selecionada, y1_selecionada, x2_selecionada, y2_selecionada = (
        resultado.regiao_busca_vegetacao
    )
    cv2.rectangle(
        diagnostico,
        (x1_selecionada, y1_selecionada),
        (x2_selecionada, y2_selecionada),
        configuracao.cor_roi_vegetacao_bgr,
        3,
    )

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
    if resultado.deteccao_marcadores is not None:
        marcadores = resultado.deteccao_marcadores
        desenhar_candidatos_marcadores(
            diagnostico, marcadores, configuracao
        )
        cv2.line(
            diagnostico,
            marcadores.azul.centro,
            marcadores.amarelo.centro,
            configuracao.cor_linha_calibracao_bgr,
            4,
        )
        for marcador, cor in (
            (marcadores.azul, configuracao.cor_marcador_azul_bgr),
            (marcadores.amarelo, configuracao.cor_marcador_amarelo_bgr),
        ):
            x1, y1, x2, y2 = marcador.caixa
            cv2.rectangle(diagnostico, (x1, y1), (x2, y2), cor, 3)
            cv2.circle(diagnostico, marcador.centro, 8, cor, -1)

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

    cobertura_vegetal = (
        np.count_nonzero(resultado.mascara_vegetacao)
        / resultado.mascara_vegetacao.size
        * 100
    )
    candidatos_por_lado = {
        candidato.lado: candidato
        for candidato in resultado.candidatos_vegetacao
    }
    if resultado.deteccao_marcadores is not None:
        par_marcadores_escolhido = _obter_par_escolhido(
            resultado.deteccao_marcadores
        )
        for texto, y in (
            ("Calibracao: marcadores", 38),
            (f"Escala: {resultado.pixels_por_cm:.2f} px/cm", 78),
            ("Referencia: 60 cm", 118),
            (f"Altura estimada: {resultado.altura_cm:.1f} cm", 158),
            (f"Mascara selecionada: {cobertura_vegetal:.1f}%", 198),
            (f"Selecionado: {resultado.lado_vegetacao}", 238),
            (
                f"Score do par: "
                f"{resultado.deteccao_marcadores.pontuacao_par:.2f}",
                278,
            ),
            (
                "Alinhamento/suporte: "
                f"{par_marcadores_escolhido.alinhamento * 100:.0f}%/"
                f"{par_marcadores_escolhido.suporte_estrutural * 100:.0f}%",
                318,
            ),
            ("Confianca: APROVADA", 358),
        ):
            desenhar_rotulo(
                diagnostico, texto, (24, y), configuracao
            )
        desenhar_rotulo(
            diagnostico,
            "Marcador azul: 60 cm",
            (
                resultado.deteccao_marcadores.azul.centro[0] + 18,
                resultado.deteccao_marcadores.azul.centro[1] + 5,
            ),
            configuracao,
        )
        desenhar_rotulo(
            diagnostico,
            "Base 0 cm",
            (
                resultado.deteccao_marcadores.amarelo.centro[0] + 18,
                resultado.deteccao_marcadores.amarelo.centro[1],
            ),
            configuracao,
        )
        desenhar_rotulo(
            diagnostico,
            "Topo detectado",
            (x_medicao + 20, resultado.topo_y + 34),
            configuracao,
        )
        caminho_saida.parent.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(caminho_saida), diagnostico):
            raise ErroMedicao(
                f"Não foi possível salvar o diagnóstico em {caminho_saida}."
            )
        return

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
        f"Mascara selecionada: {cobertura_vegetal:.1f}%",
        (24, 118),
        configuracao,
    )
    for indice, lado in enumerate(("esquerda", "direita")):
        candidato = candidatos_por_lado.get(lado)
        valor = f"{candidato.pontuacao:.2f}" if candidato else "invalido"
        desenhar_rotulo(
            diagnostico,
            f"Score {lado}: {valor}",
            (24, 158 + indice * 40),
            configuracao,
        )
    desenhar_rotulo(
        diagnostico,
        f"Selecionado: {resultado.lado_vegetacao}",
        (24, 238),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        (
            f"Regua: {resultado.deteccao_regua.modo_validacao} | "
            f"score {resultado.deteccao_regua.pontuacao:.2f} | "
            f"marcas {resultado.deteccao_regua.quantidade_marcas}"
        ),
        (24, 278),
        configuracao,
    )
    candidato_selecionado = candidatos_por_lado.get(
        resultado.lado_vegetacao
    )
    desenhar_rotulo(
        diagnostico,
        (
            "Estrutura regua: "
            f"bordas {resultado.deteccao_regua.continuidade_bordas * 100:.0f}% | "
            f"largura {resultado.deteccao_regua.estabilidade_largura * 100:.0f}% | "
            f"contraste {resultado.deteccao_regua.contraste_local:.0f}"
        ),
        (24, 318),
        configuracao,
    )
    if (
        candidato_selecionado is not None
        and candidato_selecionado.aceito_por_coerencia_bordas
    ):
        desenhar_rotulo(
            diagnostico,
            (
                f"Bordas: {candidato_selecionado.bordas_tocadas} - "
                "aceito por coerencia estrutural"
            ),
            (24, 358),
            configuracao,
        )
    desenhar_rotulo(
        diagnostico,
        "Regua detectada (60 cm)",
        (superior[0] - 225, max(superior[1] + 24, 398)),
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
    imagem: np.ndarray | None = None
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
        if imagem is not None and not argumentos.sem_diagnostico:
            try:
                deteccao_marcadores = (
                    erro.deteccao
                    if isinstance(erro, ErroParMarcadoresSemConfianca)
                    else detectar_marcadores_calibracao(
                        imagem, CONFIGURACAO
                    )
                )
                gerar_diagnostico_marcadores_rejeitada(
                    imagem,
                    deteccao_marcadores,
                    str(erro),
                    argumentos.saida,
                    CONFIGURACAO,
                )
            except ErroMedicao:
                pass
        print(f"Erro: {erro}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(executar())
