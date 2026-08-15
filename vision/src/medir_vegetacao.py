import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from configuracao import CONFIGURACAO, ConfiguracaoVisao, PontoRelativo, RegiaoRelativa


class ErroMedicao(Exception):
    pass


@dataclass(frozen=True)
class ResultadoMedicao:
    pixels_por_cm: float
    altura_cm: float
    topo_y: int
    base_y: int
    mascara_vegetacao: np.ndarray


def converter_ponto_relativo(
    ponto: PontoRelativo, largura: int, altura: int
) -> tuple[int, int]:
    x = round(ponto[0] * largura)
    y = round(ponto[1] * altura)
    return x, y


def converter_regiao_relativa(
    regiao: RegiaoRelativa, largura: int, altura: int
) -> tuple[int, int, int, int]:
    x_inicial = round(regiao[0] * largura)
    y_inicial = round(regiao[1] * altura)
    x_final = round(regiao[2] * largura)
    y_final = round(regiao[3] * altura)
    return x_inicial, y_inicial, x_final, y_final


def carregar_imagem(caminho_imagem: Path) -> np.ndarray:
    if not caminho_imagem.is_file():
        raise ErroMedicao(f"Imagem não encontrada: {caminho_imagem}")

    imagem = cv2.imread(str(caminho_imagem))
    if imagem is None:
        raise ErroMedicao("O arquivo informado não pôde ser lido como imagem.")

    return imagem


def calcular_escala(
    largura: int, altura: int, configuracao: ConfiguracaoVisao
) -> float:
    ponto_superior = converter_ponto_relativo(
        configuracao.ponto_regua_superior, largura, altura
    )
    ponto_inferior = converter_ponto_relativo(
        configuracao.ponto_regua_inferior, largura, altura
    )
    comprimento_regua_px = math.dist(ponto_superior, ponto_inferior)

    if comprimento_regua_px <= 0 or configuracao.comprimento_regua_cm <= 0:
        raise ErroMedicao("Não foi possível calcular a escala da régua.")

    return comprimento_regua_px / configuracao.comprimento_regua_cm


def validar_regiao_regua(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> None:
    altura, largura = imagem.shape[:2]
    x_inicial, y_inicial, x_final, y_final = converter_regiao_relativa(
        configuracao.regiao_regua, largura, altura
    )
    regiao_regua = imagem[y_inicial:y_final, x_inicial:x_final]

    if regiao_regua.size == 0:
        raise ErroMedicao("A região configurada para a régua é inválida.")

    cinza = cv2.cvtColor(regiao_regua, cv2.COLOR_BGR2GRAY)
    bordas = cv2.Canny(
        cinza,
        configuracao.limiar_canny_regua_inferior,
        configuracao.limiar_canny_regua_superior,
    )
    comprimento_minimo = round(
        regiao_regua.shape[0] * configuracao.proporcao_minima_linha_regua
    )
    linhas = cv2.HoughLinesP(
        bordas,
        1,
        np.pi / 180,
        threshold=50,
        minLineLength=comprimento_minimo,
        maxLineGap=configuracao.falha_maxima_linha_regua_px,
    )

    if linhas is None:
        raise ErroMedicao("Régua não detectada na região de calibração.")

    linhas_normalizadas = linhas.reshape(-1, 4)
    possui_linha_vertical = any(
        abs(int(x_final_linha) - int(x_inicial_linha))
        <= configuracao.desvio_vertical_maximo_px
        for x_inicial_linha, _, x_final_linha, _ in linhas_normalizadas
    )

    if not possui_linha_vertical:
        raise ErroMedicao("Régua não detectada na região de calibração.")


def filtrar_componentes(mascara: np.ndarray, area_minima: int) -> np.ndarray:
    quantidade, rotulos, estatisticas, _ = cv2.connectedComponentsWithStats(
        mascara, connectivity=8
    )
    mascara_filtrada = np.zeros_like(mascara)

    for rotulo in range(1, quantidade):
        area = estatisticas[rotulo, cv2.CC_STAT_AREA]
        if area >= area_minima:
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
        cv2.MORPH_ELLIPSE,
        (configuracao.tamanho_kernel_abertura,) * 2,
    )
    kernel_fechamento = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (configuracao.tamanho_kernel_fechamento,) * 2,
    )
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, kernel_abertura)
    mascara = cv2.morphologyEx(
        mascara,
        cv2.MORPH_CLOSE,
        kernel_fechamento,
        iterations=configuracao.iteracoes_fechamento,
    )

    return filtrar_componentes(mascara, configuracao.area_minima_componente_px)


def detectar_topo(mascara: np.ndarray, pixels_minimos_linha: int) -> int:
    pixels_por_linha = np.count_nonzero(mascara, axis=1)
    linhas_validas = np.flatnonzero(pixels_por_linha >= pixels_minimos_linha)

    if linhas_validas.size == 0:
        raise ErroMedicao("Vegetação não encontrada na região configurada.")

    return int(linhas_validas[0])


def medir_vegetacao(
    imagem: np.ndarray, configuracao: ConfiguracaoVisao
) -> ResultadoMedicao:
    altura_imagem, largura_imagem = imagem.shape[:2]
    validar_regiao_regua(imagem, configuracao)
    pixels_por_cm = calcular_escala(
        largura_imagem, altura_imagem, configuracao
    )
    mascara = segmentar_vegetacao(imagem, configuracao)
    topo_y = detectar_topo(mascara, configuracao.pixels_minimos_linha_topo)
    base_y = round(configuracao.base_planta_y * altura_imagem)
    altura_vegetacao_px = base_y - topo_y

    if altura_vegetacao_px <= 0 or pixels_por_cm <= 0:
        raise ErroMedicao("A geometria detectada não permite calcular a altura.")

    return ResultadoMedicao(
        pixels_por_cm=pixels_por_cm,
        altura_cm=altura_vegetacao_px / pixels_por_cm,
        topo_y=topo_y,
        base_y=base_y,
        mascara_vegetacao=mascara,
    )


def desenhar_rotulo(
    imagem: np.ndarray,
    texto: str,
    origem: tuple[int, int],
    configuracao: ConfiguracaoVisao,
) -> None:
    fonte = cv2.FONT_HERSHEY_SIMPLEX
    escala = 0.65
    espessura = 2
    (largura_texto, altura_texto), _ = cv2.getTextSize(
        texto, fonte, escala, espessura
    )
    x, y = origem
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
    altura, largura = imagem.shape[:2]
    diagnostico = imagem.copy()

    sobreposicao = diagnostico.copy()
    sobreposicao[resultado.mascara_vegetacao > 0] = configuracao.cor_vegetacao_bgr
    diagnostico = cv2.addWeighted(sobreposicao, 0.28, diagnostico, 0.72, 0)

    ponto_superior = converter_ponto_relativo(
        configuracao.ponto_regua_superior, largura, altura
    )
    ponto_inferior = converter_ponto_relativo(
        configuracao.ponto_regua_inferior, largura, altura
    )
    x_regua_1, y_regua_1, x_regua_2, y_regua_2 = converter_regiao_relativa(
        configuracao.regiao_regua, largura, altura
    )
    x_planta_1, _, x_planta_2, _ = converter_regiao_relativa(
        configuracao.regiao_vegetacao, largura, altura
    )

    cv2.rectangle(
        diagnostico,
        (x_regua_1, y_regua_1),
        (x_regua_2, y_regua_2),
        configuracao.cor_regua_bgr,
        2,
    )
    cv2.line(
        diagnostico,
        ponto_superior,
        ponto_inferior,
        configuracao.cor_regua_bgr,
        3,
    )
    cv2.circle(diagnostico, ponto_superior, 7, configuracao.cor_regua_bgr, -1)
    cv2.circle(diagnostico, ponto_inferior, 7, configuracao.cor_regua_bgr, -1)

    cv2.line(
        diagnostico,
        (x_planta_1, resultado.topo_y),
        (x_planta_2, resultado.topo_y),
        configuracao.cor_vegetacao_bgr,
        3,
    )
    cv2.line(
        diagnostico,
        (x_planta_1, resultado.base_y),
        (x_planta_2, resultado.base_y),
        configuracao.cor_base_bgr,
        3,
    )

    desenhar_rotulo(
        diagnostico,
        f"Regua: {resultado.pixels_por_cm:.2f} px/cm",
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
        "Topo detectado",
        (x_planta_2 - 190, max(resultado.topo_y - 10, 30)),
        configuracao,
    )
    desenhar_rotulo(
        diagnostico,
        "Base assistida",
        (x_planta_1 + 10, resultado.base_y - 10),
        configuracao,
    )

    caminho_saida.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(caminho_saida), diagnostico):
        raise ErroMedicao(f"Não foi possível salvar o diagnóstico em {caminho_saida}.")


def criar_argumentos() -> argparse.Namespace:
    raiz_vision = Path(__file__).resolve().parents[1]
    analisador = argparse.ArgumentParser(
        description="Estima a altura da vegetação usando uma régua de 60 cm."
    )
    analisador.add_argument(
        "--imagem",
        type=Path,
        required=True,
        help="Caminho da fotografia que será analisada.",
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
