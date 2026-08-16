from dataclasses import dataclass


RegiaoRelativa = tuple[float, float, float, float]
CorHsv = tuple[int, int, int]
CorBgr = tuple[int, int, int]


@dataclass(frozen=True)
class ConfiguracaoVisao:
    comprimento_regua_cm: float = 60.0

    # A busca permanece no lado em que a régua é posicionada no protótipo, mas
    # cobre uma área bem maior que a faixa estreita usada originalmente.
    regiao_busca_regua: RegiaoRelativa = (0.06, 0.0, 0.62, 0.94)
    limiar_canny_regua_inferior: int = 35
    limiar_canny_regua_superior: int = 120
    limiar_hough_regua: int = 35
    proporcao_minima_segmento_regua: float = 0.10
    proporcao_minima_comprimento_regua: float = 0.65
    proporcao_maxima_comprimento_regua: float = 1.02
    proporcao_largura_minima_regua: float = 0.025
    proporcao_largura_maxima_regua: float = 0.10
    proporcao_largura_esperada_regua: float = 0.045
    razao_aspecto_minima_regua: float = 6.0
    inclinacao_maxima_regua_graus: float = 14.0
    diferenca_inclinacao_bordas_graus: float = 5.0
    sobreposicao_vertical_minima_regua: float = 0.10
    falha_maxima_linha_regua_proporcao: float = 0.045
    pixels_minimos_marca_regua: int = 3
    quantidade_minima_marcas_regua: int = 8
    proporcao_minima_comprimento_marca: float = 0.18
    margem_extremos_regua_proporcao: float = 0.008
    margem_busca_extremos_regua_proporcao: float = 0.06
    quantidade_maxima_linhas_verticais: int = 70
    tolerancia_agrupamento_vertical_regua: float = 0.006
    posicao_horizontal_esperada_regua: float = 0.34
    saturacao_maxima_regua: int = 75
    brilho_minimo_regua: int = 35
    brilho_maximo_regua: int = 230
    proporcao_neutra_minima_regua: float = 0.28
    quantidade_candidatos_diagnostico: int = 8
    distancia_candidato_diagnostico_proporcao: float = 0.055

    # A área útil exclui as bordas mais propensas a objetos do ambiente.
    regiao_vegetacao: RegiaoRelativa = (0.12, 0.025, 0.95, 0.93)
    hsv_verde_inferior: CorHsv = (20, 25, 25)
    hsv_verde_superior: CorHsv = (100, 255, 255)
    tamanho_kernel_abertura: int = 3
    tamanho_kernel_fechamento: int = 7
    iteracoes_fechamento: int = 2
    area_minima_componente_px: int = 90
    proporcao_area_minima_componente: float = 0.00012
    proporcao_maxima_mascara_vegetacao: float = 0.29
    pixels_minimos_linha_topo: int = 8

    # A base usa o marco inferior da régua como referência física e a última
    # faixa densa da máscara para um ajuste limitado. Isso acomoda caules que
    # não entram completamente na faixa HSV sem aceitar ruídos muito distantes.
    proporcao_pixels_linha_base: float = 0.006
    pixels_minimos_linha_base: int = 6
    janela_densidade_base_px: int = 7
    linhas_validas_janela_base: int = 3
    margem_base_apos_vegetacao_proporcao: float = 0.018
    distancia_maxima_evidencia_base_proporcao: float = 0.22
    ajuste_maximo_base_proporcao: float = 0.045
    peso_referencia_regua_base: float = 0.72

    cor_regiao_busca_bgr: CorBgr = (180, 120, 45)
    cor_candidato_regua_bgr: CorBgr = (0, 210, 255)
    cor_regua_bgr: CorBgr = (220, 110, 45)
    cor_vegetacao_bgr: CorBgr = (65, 180, 90)
    cor_topo_bgr: CorBgr = (80, 220, 80)
    cor_base_bgr: CorBgr = (40, 155, 240)
    cor_medicao_bgr: CorBgr = (230, 90, 210)
    cor_texto_bgr: CorBgr = (245, 245, 245)
    cor_fundo_texto_bgr: CorBgr = (32, 28, 38)


CONFIGURACAO = ConfiguracaoVisao()
