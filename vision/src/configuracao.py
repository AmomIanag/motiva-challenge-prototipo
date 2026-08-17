from dataclasses import dataclass


RegiaoRelativa = tuple[float, float, float, float]
CorHsv = tuple[int, int, int]
CorBgr = tuple[int, int, int]


@dataclass(frozen=True)
class ConfiguracaoVisao:
    comprimento_regua_cm: float = 60.0

    # Calibração principal do protótipo: azul na marca de 60 cm e amarelo na
    # marca de 0 cm. Os intervalos usam a escala HSV do OpenCV (H entre 0 e 179).
    hsv_marcador_azul_inferior: CorHsv = (80, 25, 70)
    hsv_marcador_azul_superior: CorHsv = (135, 255, 255)
    hsv_marcador_amarelo_inferior: CorHsv = (27, 15, 70)
    hsv_marcador_amarelo_superior: CorHsv = (45, 255, 255)
    vantagem_azul_sobre_vermelho_marcador: int = 8
    vantagem_verde_sobre_vermelho_marcador_azul: int = 5
    saturacao_marcador_forte: int = 100
    vantagem_verde_sobre_azul_marcador_amarelo: int = 4
    vantagem_vermelho_sobre_azul_marcador_amarelo: int = 4
    saturacao_nucleo_marcador_azul: int = 32
    vantagem_azul_sobre_vermelho_nucleo: int = 20
    saturacao_nucleo_marcador_amarelo: int = 32
    vantagem_canais_amarelo_nucleo: int = 16
    tolerancia_equilibrio_amarelo_nucleo: int = 8
    tolerancia_matiz_nucleo_amarelo: int = 7
    matiz_referencia_marcador_azul: int = 98
    matiz_referencia_marcador_amarelo: int = 35
    tolerancia_matiz_marcador_azul: int = 18
    tolerancia_matiz_marcador_amarelo: int = 10
    contraste_referencia_marcador: float = 35.0
    margem_borda_referencia_marcador: float = 0.035
    quantidade_candidatos_marcadores_diagnostico: int = 10
    quantidade_amostras_suporte_marcadores: int = 43
    margem_extremos_suporte_marcadores: float = 0.08
    proporcao_meia_largura_suporte_marcadores: float = 0.28
    meia_largura_minima_suporte_marcadores_px: int = 3
    afastamento_entorno_suporte_marcadores_px: int = 5
    largura_entorno_suporte_marcadores_px: int = 9
    contraste_minimo_suporte_marcadores: float = 12.0
    brilho_maximo_suporte_marcadores: float = 175.0
    contraste_referencia_suporte_marcadores: float = 45.0
    peso_continuidade_suporte_marcadores: float = 0.70
    peso_suporte_estrutural_par: float = 1.40
    peso_colinearidade_reforcada_par: float = 0.75
    pontuacao_minima_par_confiavel: float = 7.0
    alinhamento_minimo_par_confiavel: float = 0.55
    suporte_estrutural_minimo_par_confiavel: float = 0.50
    qualidade_cor_minima_par_confiavel: float = 0.60
    tamanho_kernel_marcadores: int = 3
    iteracoes_abertura_marcadores: int = 1
    iteracoes_fechamento_marcadores: int = 1
    area_minima_marcador_px: int = 80
    proporcao_area_minima_marcador: float = 0.00008
    proporcao_area_maxima_marcador: float = 0.015
    dimensao_minima_marcador_px: int = 6
    preenchimento_minimo_marcador: float = 0.40
    razao_aspecto_maxima_marcador: float = 3.0
    proporcao_distancia_minima_marcadores: float = 0.25
    proporcao_distancia_maxima_marcadores: float = 0.95
    proporcao_desalinhamento_horizontal_maximo: float = 0.28
    # Os adesivos físicos podem produzir áreas segmentadas diferentes por
    # reflexo e perspectiva. A tolerância ainda exige tamanhos comparáveis;
    # alinhamento, suporte e cor são confirmados depois do score.
    proporcao_tamanho_minima_entre_marcadores: float = 0.40

    # A busca permanece no lado em que a régua é posicionada no protótipo, mas
    # cobre uma área bem maior que a faixa estreita usada originalmente.
    regiao_busca_regua: RegiaoRelativa = (0.06, 0.0, 0.64, 0.94)
    regiao_busca_regua_ampliada: RegiaoRelativa = (0.06, 0.0, 0.70, 0.94)
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
    peso_posicao_horizontal_regua: float = 8.0
    saturacao_maxima_regua: int = 75
    brilho_minimo_regua: int = 35
    brilho_maximo_regua: int = 230
    proporcao_neutra_minima_regua: float = 0.28
    # Alternativa restrita para réguas escuras e finas registradas com baixa
    # resolução. Os limites originais continuam valendo como caminho principal.
    proporcao_largura_minima_regua_alternativa: float = 0.018
    proporcao_largura_maxima_regua_alternativa: float = 0.030
    proporcao_comprimento_bordas_regua_alternativa: float = 0.58
    proporcao_sobreposicao_regua_alternativa: float = 0.30
    razao_aspecto_minima_regua_alternativa: float = 10.0
    quantidade_minima_marcas_regua_alternativa: int = 4
    proporcao_neutra_minima_regua_alternativa: float = 0.80
    contraste_local_minimo_regua_alternativa: float = 18.0
    falha_maxima_contraste_regua_alternativa: float = 0.02
    penalidade_pontuacao_regua_alternativa: float = 0.75
    # A recuperação estrutural cobre bordas Hough fragmentadas sem reduzir os
    # filtros geométricos globais. Ela exige corpo longo, paralelo e estável.
    continuidade_minima_bordas_regua: float = 0.85
    variacao_maxima_largura_regua: float = 0.04
    contraste_mediano_minimo_regua: float = 60.0
    diferenca_inclinacao_maxima_recuperacao_regua: float = 1.5
    raio_suporte_bordas_regua_px: int = 2
    variacao_referencia_largura_regua: float = 0.15
    contraste_referencia_regua: float = 75.0
    # O vencedor do modo padrão só é confirmado quando existe ao menos uma
    # evidência independente de corpo físico. Isso impede que folhas espalhadas
    # validem sozinhas uma falsa régua.
    neutralidade_minima_estrutura_regua_padrao: float = 0.50
    continuidade_minima_estrutura_regua_padrao: float = 0.55
    estabilidade_minima_estrutura_regua_padrao: float = 0.70
    contraste_minimo_estrutura_regua_padrao: float = 18.0
    peso_continuidade_bordas_regua: float = 1.5
    peso_estabilidade_largura_regua: float = 1.0
    peso_contraste_local_regua: float = 1.0
    quantidade_candidatos_diagnostico: int = 8
    quantidade_candidatos_pontuados_diagnostico: int = 2
    distancia_candidato_diagnostico_proporcao: float = 0.055

    # A área útil exclui as bordas mais propensas a objetos do ambiente.
    regiao_vegetacao: RegiaoRelativa = (0.12, 0.025, 0.95, 0.93)
    # A faixa principal permanece conservadora. A faixa tolerante só participa
    # quando há dominância relativa do verde e proximidade da máscara principal.
    hsv_verde_inferior: CorHsv = (20, 25, 25)
    hsv_verde_superior: CorHsv = (100, 255, 255)
    hsv_verde_tolerante_inferior: CorHsv = (16, 8, 18)
    hsv_verde_tolerante_superior: CorHsv = (105, 255, 255)
    excesso_verde_minimo: int = 10
    vantagem_canal_verde_minima: int = 3
    saturacao_semente_verde: int = 35
    margem_excesso_verde_relativo: int = 10
    tamanho_kernel_proximidade_verde: int = 11
    tamanho_kernel_abertura: int = 3
    tamanho_kernel_fechamento: int = 7
    iteracoes_fechamento: int = 2
    area_minima_componente_px: int = 90
    proporcao_area_minima_componente: float = 0.00012
    proporcao_maxima_mascara_vegetacao: float = 0.39
    inicio_supressao_fundo_inferior: float = 0.55
    proporcao_maxima_pixels_linha_inferior: float = 0.45
    pixels_minimos_linha_topo: int = 8

    # A régua ancora duas regiões proporcionais (uma de cada lado). Uma faixa
    # junto à régua é ignorada para que ela e fundos adjacentes não virem planta.
    afastamento_interno_roi_vegetacao: float = 0.18
    alcance_externo_roi_vegetacao: float = 0.70
    margem_vertical_roi_vegetacao: float = 0.06
    distancia_maxima_componente_base: float = 0.26
    distancia_maxima_uniao_vertical: float = 0.35
    distancia_maxima_uniao_horizontal: float = 0.12
    largura_minima_componente_vegetal: float = 0.20
    altura_minima_componente_vegetal: float = 0.25
    preenchimento_maximo_componente_vegetal: float = 0.80
    cobertura_maxima_roi_vegetacao: float = 0.68
    gradiente_borda_minimo_vegetacao: float = 55.0
    quantidade_faixas_estrutura_vertical: int = 6
    proporcao_minima_faixas_ativas: float = 0.50
    densidade_minima_faixa_ativa: float = 0.008
    proporcao_linha_horizontal_extensa: float = 0.55
    janela_topo_px: int = 7
    linhas_validas_janela_topo: int = 3

    # Um componente que toca exatamente três bordas pode ser uma copa larga
    # recortada pela ROI. A exceção exige evidências estruturais conjuntas e
    # mantém quatro bordas como rejeição absoluta de fundo dominante.
    continuidade_minima_excecao_tres_bordas: float = 0.83
    gradiente_minimo_excecao_tres_bordas: float = 75.0
    preenchimento_maximo_excecao_tres_bordas: float = 0.65
    cobertura_maxima_excecao_tres_bordas: float = 0.58
    distancia_base_maxima_excecao_tres_bordas: float = 0.12
    altura_minima_excecao_tres_bordas: float = 0.50
    largura_copa_minima_excecao_tres_bordas: float = 0.30
    proporcao_maxima_linhas_excecao_tres_bordas: float = 0.50
    pontuacao_minima_excecao_tres_bordas: float = 4.0

    # A base usa o marco inferior da régua como referência física e a última
    # faixa densa da máscara para um ajuste limitado. Isso acomoda caules que
    # não entram completamente na faixa HSV sem aceitar ruídos muito distantes.
    proporcao_pixels_linha_base: float = 0.006
    pixels_minimos_linha_base: int = 6
    janela_densidade_base_px: int = 7
    linhas_validas_janela_base: int = 3
    distancia_maxima_evidencia_base_proporcao: float = 0.22

    cor_regiao_busca_bgr: CorBgr = (180, 120, 45)
    cor_marcador_azul_bgr: CorBgr = (255, 90, 35)
    cor_marcador_amarelo_bgr: CorBgr = (0, 225, 255)
    cor_linha_calibracao_bgr: CorBgr = (245, 180, 40)
    cor_candidato_regua_bgr: CorBgr = (0, 210, 255)
    cor_regua_bgr: CorBgr = (220, 110, 45)
    cor_roi_vegetacao_bgr: CorBgr = (210, 155, 45)
    cor_roi_esquerda_bgr: CorBgr = (210, 120, 210)
    cor_roi_direita_bgr: CorBgr = (40, 190, 225)
    cor_candidata_vegetacao_bgr: CorBgr = (40, 180, 220)
    cor_vegetacao_bgr: CorBgr = (65, 180, 90)
    cor_topo_bgr: CorBgr = (80, 220, 80)
    cor_base_bgr: CorBgr = (40, 155, 240)
    cor_medicao_bgr: CorBgr = (230, 90, 210)
    cor_texto_bgr: CorBgr = (245, 245, 245)
    cor_fundo_texto_bgr: CorBgr = (32, 28, 38)


CONFIGURACAO = ConfiguracaoVisao()
