from dataclasses import dataclass


PontoRelativo = tuple[float, float]
RegiaoRelativa = tuple[float, float, float, float]
CorHsv = tuple[int, int, int]


@dataclass(frozen=True)
class ConfiguracaoVisao:
    comprimento_regua_cm: float = 60.0

    # Pontos assistidos correspondentes às marcas de 60 cm e 0 cm da régua.
    ponto_regua_superior: PontoRelativo = (0.319, 0.041)
    ponto_regua_inferior: PontoRelativo = (0.319, 0.846)
    regiao_regua: RegiaoRelativa = (0.286, 0.012, 0.354, 0.855)

    # Região que contém a vegetação e exclui a maior parte do vaso e do piso.
    regiao_vegetacao: RegiaoRelativa = (0.170, 0.040, 0.940, 0.824)

    # Base assistida: ponto onde os caules visíveis emergem do solo.
    base_planta_y: float = 0.820

    hsv_verde_inferior: CorHsv = (20, 25, 25)
    hsv_verde_superior: CorHsv = (100, 255, 255)
    tamanho_kernel_abertura: int = 3
    tamanho_kernel_fechamento: int = 7
    iteracoes_fechamento: int = 2
    area_minima_componente_px: int = 90
    pixels_minimos_linha_topo: int = 8
    limiar_canny_regua_inferior: int = 40
    limiar_canny_regua_superior: int = 120
    proporcao_minima_linha_regua: float = 0.30
    desvio_vertical_maximo_px: int = 10
    falha_maxima_linha_regua_px: int = 30

    cor_regua_bgr: tuple[int, int, int] = (220, 110, 45)
    cor_vegetacao_bgr: tuple[int, int, int] = (65, 180, 90)
    cor_base_bgr: tuple[int, int, int] = (40, 155, 240)
    cor_texto_bgr: tuple[int, int, int] = (245, 245, 245)
    cor_fundo_texto_bgr: tuple[int, int, int] = (32, 28, 38)


CONFIGURACAO = ConfiguracaoVisao()
