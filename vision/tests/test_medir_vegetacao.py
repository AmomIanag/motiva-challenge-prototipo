import sys
import unittest
from dataclasses import replace
from pathlib import Path

import cv2
import numpy as np


PASTA_SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(PASTA_SRC))

from configuracao import CONFIGURACAO  # noqa: E402
from medir_vegetacao import (  # noqa: E402
    ErroMedicao,
    ErroParMarcadoresSemConfianca,
    _selecionar_primeiro_par_confiavel,
    detectar_marcadores_calibracao,
    detectar_regua,
    medir_vegetacao,
    medir_vegetacao_legado,
)


def criar_cena_com_regua(
    cor_vegetacao: tuple[int, int, int] = (45, 145, 55),
    incluir_vegetacao: bool = True,
) -> np.ndarray:
    imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
    cv2.rectangle(imagem, (235, 35), (275, 550), (145, 145, 145), -1)
    cv2.rectangle(imagem, (235, 35), (275, 550), (35, 35, 35), 2)
    for y in range(43, 548, 8):
        comprimento = 30 if (y - 43) % 40 == 0 else 18
        cv2.line(imagem, (235, y), (235 + comprimento, y), (30, 30, 30), 2)

    if incluir_vegetacao:
        cv2.line(imagem, (500, 540), (500, 120), cor_vegetacao, 15)
        cv2.ellipse(
            imagem, (500, 120), (75, 32), 0, 0, 360, cor_vegetacao, -1
        )
        cv2.ellipse(
            imagem, (445, 230), (70, 25), -15, 0, 360, cor_vegetacao, -1
        )
        cv2.ellipse(
            imagem, (555, 320), (80, 26), 15, 0, 360, cor_vegetacao, -1
        )
    return imagem


def adicionar_regioes_verdes_confiaveis(imagem: np.ndarray) -> None:
    verde_confiavel = (45, 145, 55)
    for ponto in ((500, 120), (445, 230), (555, 320), (500, 525)):
        cv2.circle(imagem, ponto, 8, verde_confiavel, -1)


def criar_cena_com_regua_fina_escura(
    incluir_marcas: bool = True,
) -> np.ndarray:
    imagem = np.full((600, 800, 3), 235, dtype=np.uint8)
    cv2.rectangle(imagem, (481, 54), (499, 413), (42, 42, 42), -1)
    cv2.rectangle(imagem, (481, 54), (499, 413), (18, 18, 18), 1)
    if incluir_marcas:
        for y in (60, 175, 290, 412):
            cv2.line(imagem, (481, y), (499, y), (115, 115, 115), 2)
    return imagem


def criar_cena_com_regua_de_aspecto_fragmentado() -> np.ndarray:
    imagem = np.full((600, 800, 3), 235, dtype=np.uint8)
    cv2.rectangle(imagem, (420, 85), (498, 525), (42, 42, 42), -1)
    cv2.rectangle(imagem, (420, 85), (498, 525), (18, 18, 18), 1)
    for y in range(92, 520, 36):
        cv2.line(imagem, (420, y), (475, y), (130, 130, 130), 2)
    return imagem


def criar_cena_planta_larga_tres_bordas() -> np.ndarray:
    imagem = criar_cena_com_regua_fina_escura()
    verde = (45, 145, 55)
    cv2.line(imagem, (325, 445), (325, 105), verde, 17)
    cv2.ellipse(imagem, (325, 115), (75, 22), 0, 0, 360, verde, -1)
    cv2.ellipse(imagem, (275, 205), (70, 18), -12, 0, 360, verde, -1)
    cv2.ellipse(imagem, (375, 285), (70, 18), 12, 0, 360, verde, -1)
    cv2.ellipse(imagem, (320, 380), (75, 22), 0, 0, 360, verde, -1)
    return imagem


def adicionar_estrutura_vegetal_vertical_irregular(
    imagem: np.ndarray,
    cor: tuple[int, int, int] = (62, 88, 66),
) -> None:
    centros = (315, 320, 308, 324, 312, 319)
    for indice, centro in enumerate(centros):
        y1 = 85 + indice * 72
        y2 = min(540, y1 + 66)
        cv2.line(imagem, (centro - 17, y1), (centro - 13, y2), cor, 4)
        cv2.line(imagem, (centro + 17, y1), (centro + 13, y2), cor, 4)
        cv2.line(imagem, (centro - 28, y1 + 20), (centro + 35, y1 + 28), cor, 5)
        cv2.line(imagem, (centro - 38, y1 + 45), (centro + 18, y1 + 38), cor, 4)


def criar_cena_com_marcadores(
    centro_azul: tuple[int, int] = (500, 80),
    centro_amarelo: tuple[int, int] = (500, 520),
    incluir_azul: bool = True,
    incluir_amarelo: bool = True,
    incluir_vegetacao: bool = True,
    cor_azul: tuple[int, int, int] = (255, 0, 0),
    cor_amarela: tuple[int, int, int] = (0, 255, 255),
) -> np.ndarray:
    imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
    if incluir_vegetacao:
        verde = (45, 145, 55)
        cv2.line(imagem, (300, 510), (300, 140), verde, 15)
        cv2.ellipse(imagem, (300, 140), (72, 28), 0, 0, 360, verde, -1)
        cv2.ellipse(imagem, (250, 235), (62, 22), -12, 0, 360, verde, -1)
        cv2.ellipse(imagem, (350, 330), (65, 23), 12, 0, 360, verde, -1)
        cv2.ellipse(imagem, (300, 430), (58, 20), 0, 0, 360, verde, -1)
    cv2.line(
        imagem,
        centro_azul,
        centro_amarelo,
        (55, 55, 55),
        14,
    )
    if incluir_azul:
        cv2.circle(imagem, centro_azul, 14, cor_azul, -1)
    if incluir_amarelo:
        cv2.circle(imagem, centro_amarelo, 14, cor_amarela, -1)
    return imagem


def converter_hsv_para_bgr(
    hue: int, saturacao: int, brilho: int
) -> tuple[int, int, int]:
    pixel_hsv = np.array([[[hue, saturacao, brilho]]], dtype=np.uint8)
    pixel_bgr = cv2.cvtColor(pixel_hsv, cv2.COLOR_HSV2BGR)[0, 0]
    return tuple(int(canal) for canal in pixel_bgr)


class TesteCalibracaoMarcadores(unittest.TestCase):
    azul_real_simulado = converter_hsv_para_bgr(98, 63, 190)
    amarelo_real_simulado = converter_hsv_para_bgr(35, 43, 146)

    def test_calibra_azul_acima_e_amarelo_abaixo(self) -> None:
        deteccao = detectar_marcadores_calibracao(
            criar_cena_com_marcadores(), CONFIGURACAO
        )

        self.assertEqual(deteccao.azul.centro, (500, 80))
        self.assertEqual(deteccao.amarelo.centro, (500, 520))
        self.assertAlmostEqual(deteccao.distancia_pixels, 440.0, places=1)

    def test_calibra_inclinacao_por_distancia_euclidiana(self) -> None:
        deteccao = detectar_marcadores_calibracao(
            criar_cena_com_marcadores(
                centro_azul=(470, 90),
                centro_amarelo=(520, 500),
            ),
            CONFIGURACAO,
        )

        self.assertAlmostEqual(
            deteccao.distancia_pixels,
            float(np.hypot(50, 410)),
            places=1,
        )

    def test_rejeita_quando_existe_apenas_marcador_azul(self) -> None:
        with self.assertRaisesRegex(
            ErroMedicao, "Marcador amarelo de 0 cm não detectado"
        ):
            detectar_marcadores_calibracao(
                criar_cena_com_marcadores(incluir_amarelo=False),
                CONFIGURACAO,
            )

    def test_rejeita_quando_existe_apenas_marcador_amarelo(self) -> None:
        with self.assertRaisesRegex(
            ErroMedicao, "Marcador azul de 60 cm"
        ):
            detectar_marcadores_calibracao(
                criar_cena_com_marcadores(incluir_azul=False),
                CONFIGURACAO,
            )

    def test_rejeita_amarelo_acima_do_azul(self) -> None:
        with self.assertRaisesRegex(
            ErroMedicao, "Marcadores de calibração em posição inválida"
        ):
            detectar_marcadores_calibracao(
                criar_cena_com_marcadores(
                    centro_azul=(500, 500),
                    centro_amarelo=(500, 100),
                ),
                CONFIGURACAO,
            )

    def test_rejeita_distancia_insuficiente(self) -> None:
        with self.assertRaisesRegex(
            ErroMedicao,
            "Distância entre marcadores insuficiente para calibração",
        ):
            detectar_marcadores_calibracao(
                criar_cena_com_marcadores(
                    centro_azul=(500, 220),
                    centro_amarelo=(500, 300),
                ),
                CONFIGURACAO,
            )

    def test_ruido_colorido_pequeno_nao_vira_marcador(self) -> None:
        imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
        cv2.circle(imagem, (200, 100), 2, (255, 0, 0), -1)
        cv2.circle(imagem, (200, 500), 2, (0, 255, 255), -1)

        with self.assertRaisesRegex(
            ErroMedicao, "Marcador azul de 60 cm não detectado"
        ):
            detectar_marcadores_calibracao(imagem, CONFIGURACAO)

    def test_multiplos_candidatos_escolhem_par_coerente(self) -> None:
        imagem = criar_cena_com_marcadores()
        cv2.circle(imagem, (100, 120), 14, (255, 0, 0), -1)
        cv2.circle(imagem, (260, 480), 9, (0, 255, 255), -1)

        deteccao = detectar_marcadores_calibracao(imagem, CONFIGURACAO)

        self.assertEqual(deteccao.azul.centro, (500, 80))
        self.assertEqual(deteccao.amarelo.centro, (500, 520))

    def test_detecta_azul_ciano_claro_com_saturacao_moderada(self) -> None:
        deteccao = detectar_marcadores_calibracao(
            criar_cena_com_marcadores(cor_azul=self.azul_real_simulado),
            CONFIGURACAO,
        )

        self.assertEqual(deteccao.azul.centro, (500, 80))

    def test_detecta_amarelo_pouco_saturado(self) -> None:
        deteccao = detectar_marcadores_calibracao(
            criar_cena_com_marcadores(
                cor_amarela=self.amarelo_real_simulado
            ),
            CONFIGURACAO,
        )

        self.assertEqual(deteccao.amarelo.centro, (500, 520))

    def test_par_real_pouco_saturado_mantem_calibracao(self) -> None:
        deteccao = detectar_marcadores_calibracao(
            criar_cena_com_marcadores(
                cor_azul=self.azul_real_simulado,
                cor_amarela=self.amarelo_real_simulado,
            ),
            CONFIGURACAO,
        )

        self.assertEqual(deteccao.azul.centro, (500, 80))
        self.assertEqual(deteccao.amarelo.centro, (500, 520))
        self.assertAlmostEqual(deteccao.distancia_pixels, 440.0, places=1)

    def test_parede_cinza_e_branca_nao_viram_marcadores(self) -> None:
        imagem = np.full((600, 800, 3), 225, dtype=np.uint8)
        cv2.rectangle(imagem, (460, 50), (540, 150), (190, 190, 190), -1)
        cv2.rectangle(imagem, (460, 450), (540, 550), (252, 252, 252), -1)

        with self.assertRaisesRegex(ErroMedicao, "Marcador azul de 60 cm"):
            detectar_marcadores_calibracao(imagem, CONFIGURACAO)

    def test_objetos_pequenos_nao_vencem_par_real_pouco_saturado(self) -> None:
        imagem = criar_cena_com_marcadores(
            cor_azul=self.azul_real_simulado,
            cor_amarela=self.amarelo_real_simulado,
        )
        cv2.circle(imagem, (120, 105), 4, (255, 0, 0), -1)
        cv2.circle(imagem, (120, 490), 4, (0, 255, 255), -1)

        deteccao = detectar_marcadores_calibracao(imagem, CONFIGURACAO)

        self.assertEqual(deteccao.azul.centro, (500, 80))
        self.assertEqual(deteccao.amarelo.centro, (500, 520))

    def test_multiplos_candidatos_reais_escolhem_melhor_geometria(self) -> None:
        imagem = criar_cena_com_marcadores(
            cor_azul=self.azul_real_simulado,
            cor_amarela=self.amarelo_real_simulado,
        )
        cv2.circle(imagem, (160, 90), 14, self.azul_real_simulado, -1)
        cv2.circle(imagem, (300, 500), 14, self.amarelo_real_simulado, -1)

        deteccao = detectar_marcadores_calibracao(imagem, CONFIGURACAO)

        self.assertEqual(deteccao.azul.centro, (500, 80))
        self.assertEqual(deteccao.amarelo.centro, (500, 520))

    def test_falsos_marcadores_na_borda_nao_vencem_par_interno(self) -> None:
        imagem = criar_cena_com_marcadores(
            cor_azul=self.azul_real_simulado,
            cor_amarela=self.amarelo_real_simulado,
        )
        cv2.circle(imagem, (3, 60), 11, (255, 0, 0), -1)
        cv2.circle(imagem, (5, 235), 11, (0, 255, 255), -1)

        deteccao = detectar_marcadores_calibracao(imagem, CONFIGURACAO)

        self.assertEqual(deteccao.azul.centro, (500, 80))
        self.assertEqual(deteccao.amarelo.centro, (500, 520))
        self.assertGreater(deteccao.azul.margem_borda_relativa, 0)
        self.assertGreater(deteccao.amarelo.margem_borda_relativa, 0)

    def test_varios_pares_escolhem_melhor_evidencia_global(self) -> None:
        imagem = criar_cena_com_marcadores(
            cor_azul=self.azul_real_simulado,
            cor_amarela=self.amarelo_real_simulado,
        )
        azul_limite = converter_hsv_para_bgr(82, 80, 205)
        amarelo_limite = converter_hsv_para_bgr(38, 45, 150)
        cv2.circle(imagem, (180, 100), 14, azul_limite, -1)
        cv2.circle(imagem, (190, 500), 14, amarelo_limite, -1)

        deteccao = detectar_marcadores_calibracao(imagem, CONFIGURACAO)

        self.assertGreaterEqual(len(deteccao.pares_validos), 2)
        self.assertEqual(deteccao.azul.centro, (500, 80))
        self.assertEqual(deteccao.amarelo.centro, (500, 520))

    def test_par_real_proximo_da_borda_nao_e_rejeitado(self) -> None:
        deteccao = detectar_marcadores_calibracao(
            criar_cena_com_marcadores(
                centro_azul=(790, 80),
                centro_amarelo=(790, 520),
                cor_azul=self.azul_real_simulado,
                cor_amarela=self.amarelo_real_simulado,
            ),
            CONFIGURACAO,
        )

        self.assertGreaterEqual(deteccao.azul.centro[0], 788)
        self.assertGreaterEqual(deteccao.amarelo.centro[0], 788)
        self.assertEqual(deteccao.azul.margem_borda_relativa, 0)
        self.assertEqual(deteccao.amarelo.margem_borda_relativa, 0)

    def test_suporte_da_regua_faz_par_real_vencer_amarelo_fora_do_eixo(
        self,
    ) -> None:
        imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
        cv2.rectangle(imagem, (493, 80), (507, 520), (55, 55, 55), -1)
        cv2.circle(imagem, (500, 80), 14, self.azul_real_simulado, -1)
        cv2.circle(
            imagem, (500, 520), 11, self.amarelo_real_simulado, -1
        )
        cv2.circle(
            imagem, (538, 520), 14, self.amarelo_real_simulado, -1
        )

        deteccao = detectar_marcadores_calibracao(imagem, CONFIGURACAO)
        par_real = next(
            par
            for par in deteccao.pares_validos
            if par.amarelo.centro == (500, 520)
        )
        par_falso = next(
            par
            for par in deteccao.pares_validos
            if par.amarelo.centro == (538, 520)
        )

        self.assertEqual(deteccao.azul.centro, (500, 80))
        self.assertEqual(deteccao.amarelo.centro, (500, 520))
        self.assertGreater(par_real.suporte_estrutural, 0.80)
        self.assertLess(par_falso.suporte_estrutural, 0.50)
        self.assertGreater(par_real.pontuacao, par_falso.pontuacao)

    def test_rejeita_par_com_score_razoavel_alinhamento_e_suporte_baixos(
        self,
    ) -> None:
        imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
        cv2.circle(imagem, (500, 80), 14, self.azul_real_simulado, -1)
        cv2.circle(
            imagem, (584, 520), 14, self.amarelo_real_simulado, -1
        )

        with self.assertRaises(ErroParMarcadoresSemConfianca) as contexto:
            detectar_marcadores_calibracao(imagem, CONFIGURACAO)

        par = contexto.exception.deteccao.pares_validos[0]
        self.assertGreater(par.pontuacao, 6.0)
        self.assertAlmostEqual(par.alinhamento, 0.3182, places=3)
        self.assertLess(par.suporte_estrutural, 0.20)
        self.assertIn("alinhamento insuficiente", par.motivos_baixa_confianca)
        self.assertIn(
            "suporte estrutural insuficiente",
            par.motivos_baixa_confianca,
        )

    def test_selecao_pula_maior_score_sem_confianca(self) -> None:
        imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
        cv2.rectangle(imagem, (493, 80), (507, 520), (55, 55, 55), -1)
        cv2.circle(imagem, (500, 80), 14, self.azul_real_simulado, -1)
        cv2.circle(
            imagem, (500, 520), 11, self.amarelo_real_simulado, -1
        )
        cv2.circle(
            imagem, (538, 520), 14, self.amarelo_real_simulado, -1
        )
        deteccao = detectar_marcadores_calibracao(imagem, CONFIGURACAO)
        par_real = next(par for par in deteccao.pares_validos if par.confiavel)
        par_falso = next(
            par for par in deteccao.pares_validos if not par.confiavel
        )
        maior_sem_confianca = replace(par_falso, pontuacao=10.0)
        segundo_confiavel = replace(par_real, pontuacao=9.0)

        escolhido = _selecionar_primeiro_par_confiavel(
            (maior_sem_confianca, segundo_confiavel)
        )

        self.assertEqual(escolhido, segundo_confiavel)

    def test_rejeita_quando_nenhum_par_e_confiavel(self) -> None:
        imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
        cv2.circle(imagem, (500, 80), 14, self.azul_real_simulado, -1)
        cv2.circle(
            imagem, (500, 520), 14, self.amarelo_real_simulado, -1
        )
        cv2.circle(
            imagem, (540, 520), 14, self.amarelo_real_simulado, -1
        )

        with self.assertRaisesRegex(
            ErroParMarcadoresSemConfianca,
            "nenhum par de calibração confiável",
        ) as contexto:
            detectar_marcadores_calibracao(imagem, CONFIGURACAO)

        self.assertTrue(contexto.exception.deteccao.pares_validos)
        self.assertTrue(
            all(
                not par.confiavel
                for par in contexto.exception.deteccao.pares_validos
            )
        )

    def test_marcadores_validos_com_planta_produzem_medicao(self) -> None:
        resultado = medir_vegetacao(
            criar_cena_com_marcadores(), CONFIGURACAO
        )

        self.assertAlmostEqual(resultado.pixels_por_cm, 440 / 60, places=2)
        self.assertEqual(resultado.base_y, 520)
        self.assertEqual(resultado.lado_vegetacao, "esquerda")
        self.assertGreater(resultado.altura_cm, 45)
        self.assertLess(resultado.altura_cm, 60)

    def test_marcadores_validos_sem_planta_rejeitam_vegetacao(self) -> None:
        with self.assertRaisesRegex(ErroMedicao, "Vegetação não identificada"):
            medir_vegetacao(
                criar_cena_com_marcadores(incluir_vegetacao=False),
                CONFIGURACAO,
            )

    def test_estrutura_parecida_com_regua_nao_interfere(self) -> None:
        imagem = criar_cena_com_marcadores()
        adicionar_estrutura_vegetal_vertical_irregular(imagem)

        resultado = medir_vegetacao(imagem, CONFIGURACAO)

        self.assertEqual(
            resultado.deteccao_regua.modo_validacao, "marcadores"
        )
        self.assertEqual(resultado.base_y, 520)


class TesteDetectorLegadoEVegetacao(unittest.TestCase):
    def test_muitas_falsas_marcas_nao_superam_regua_estrutural(self) -> None:
        imagem = criar_cena_com_regua_fina_escura()
        adicionar_estrutura_vegetal_vertical_irregular(
            imagem, cor=(170, 250, 180)
        )

        deteccao = detectar_regua(imagem, CONFIGURACAO)

        x_central = (
            deteccao.ponto_superior[0] + deteccao.ponto_inferior[0]
        ) / 2
        self.assertGreater(x_central, 450)
        self.assertEqual(deteccao.modo_validacao, "alternativa_restrita")
        self.assertGreaterEqual(deteccao.continuidade_bordas, 0.85)
        self.assertGreater(deteccao.contraste_local, 100)

    def test_prefere_regua_real_a_estrutura_vegetal_vertical(self) -> None:
        imagem = criar_cena_com_regua_de_aspecto_fragmentado()
        adicionar_estrutura_vegetal_vertical_irregular(imagem)

        deteccao = detectar_regua(imagem, CONFIGURACAO)

        x_central = (
            deteccao.ponto_superior[0] + deteccao.ponto_inferior[0]
        ) / 2
        self.assertGreater(x_central, 450)
        self.assertGreaterEqual(deteccao.continuidade_bordas, 0.85)
        self.assertGreaterEqual(deteccao.estabilidade_largura, 0.85)

    def test_aceita_planta_larga_que_toca_tres_bordas(self) -> None:
        resultado = medir_vegetacao_legado(
            criar_cena_planta_larga_tres_bordas(), CONFIGURACAO
        )

        candidato = next(
            candidato
            for candidato in resultado.candidatos_vegetacao
            if candidato.lado == resultado.lado_vegetacao
        )
        self.assertEqual(resultado.lado_vegetacao, "esquerda")
        self.assertEqual(candidato.bordas_tocadas, 3)
        self.assertTrue(candidato.aceito_por_coerencia_bordas)

    def test_rejeita_regiao_uniforme_que_toca_tres_bordas(self) -> None:
        imagem = criar_cena_com_regua_fina_escura()
        cv2.rectangle(imagem, (205, 90), (440, 445), (70, 100, 80), -1)

        with self.assertRaisesRegex(ErroMedicao, "Vegetação não identificada"):
            medir_vegetacao_legado(imagem, CONFIGURACAO)

    def test_detecta_regua_fina_escura_com_poucas_marcas(self) -> None:
        deteccao = detectar_regua(
            criar_cena_com_regua_fina_escura(), CONFIGURACAO
        )

        self.assertEqual(deteccao.modo_validacao, "alternativa_restrita")
        self.assertGreaterEqual(deteccao.quantidade_marcas, 4)
        self.assertGreater(deteccao.proporcao_neutra, 0.80)
        self.assertGreater(deteccao.ponto_inferior[1], 400)

    def test_rejeita_barra_escura_fina_sem_marcas(self) -> None:
        with self.assertRaisesRegex(ErroMedicao, "Régua não detectada"):
            detectar_regua(
                criar_cena_com_regua_fina_escura(incluir_marcas=False),
                CONFIGURACAO,
            )

    def test_mede_cena_sintetica_e_detecta_escala(self) -> None:
        resultado = medir_vegetacao_legado(
            criar_cena_com_regua(), CONFIGURACAO
        )

        self.assertGreater(resultado.altura_cm, 40)
        self.assertLess(resultado.altura_cm, 60)
        self.assertGreater(resultado.pixels_por_cm, 7)
        self.assertLess(resultado.pixels_por_cm, 10)
        self.assertLess(resultado.topo_y, resultado.base_y)
        self.assertEqual(
            resultado.base_y, resultado.deteccao_regua.ponto_inferior[1]
        )

    def test_aceita_pequena_inclinacao(self) -> None:
        imagem = criar_cena_com_regua()
        matriz = cv2.getRotationMatrix2D((255, 295), 6, 1.0)
        inclinada = cv2.warpAffine(
            imagem,
            matriz,
            (imagem.shape[1], imagem.shape[0]),
            borderValue=(245, 245, 245),
        )

        resultado = medir_vegetacao_legado(inclinada, CONFIGURACAO)

        self.assertGreater(resultado.altura_cm, 40)
        self.assertLess(resultado.altura_cm, 65)

    def test_aceita_vegetacao_escura_com_dominancia_verde(self) -> None:
        imagem = criar_cena_com_regua(cor_vegetacao=(14, 22, 16))
        adicionar_regioes_verdes_confiaveis(imagem)

        resultado = medir_vegetacao_legado(imagem, CONFIGURACAO)

        self.assertGreater(resultado.altura_cm, 40)
        self.assertLess(resultado.altura_cm, 60)

    def test_aceita_verde_amarelado_com_baixa_saturacao(self) -> None:
        imagem = criar_cena_com_regua(cor_vegetacao=(70, 76, 71))
        adicionar_regioes_verdes_confiaveis(imagem)

        resultado = medir_vegetacao_legado(imagem, CONFIGURACAO)

        self.assertGreater(resultado.altura_cm, 40)
        self.assertLess(resultado.altura_cm, 60)

    def test_rejeita_mascara_ampla_de_ambiente(self) -> None:
        imagem = criar_cena_com_regua(incluir_vegetacao=False)
        cv2.rectangle(imagem, (300, 20), (760, 570), (70, 100, 80), -1)

        with self.assertRaisesRegex(ErroMedicao, "Vegetação não identificada"):
            medir_vegetacao_legado(imagem, CONFIGURACAO)

    def test_rejeita_parede_esverdeada_proxima_da_regua(self) -> None:
        imagem = criar_cena_com_regua(incluir_vegetacao=False)
        cv2.rectangle(imagem, (20, 130), (220, 590), (70, 100, 80), -1)

        with self.assertRaisesRegex(ErroMedicao, "Vegetação não identificada"):
            medir_vegetacao_legado(imagem, CONFIGURACAO)

    def test_escolhe_planta_estrutural_em_vez_de_fundo_do_outro_lado(self) -> None:
        imagem = criar_cena_com_regua()
        cv2.rectangle(imagem, (20, 130), (220, 590), (70, 100, 80), -1)

        resultado = medir_vegetacao_legado(imagem, CONFIGURACAO)

        self.assertEqual(resultado.lado_vegetacao, "direita")
        self.assertGreater(resultado.altura_cm, 40)
        self.assertLess(resultado.altura_cm, 60)

    def test_ignora_verde_desconectado_acima_da_planta(self) -> None:
        imagem = criar_cena_com_regua()
        cv2.rectangle(imagem, (680, 20), (730, 80), (45, 145, 55), -1)

        resultado = medir_vegetacao_legado(imagem, CONFIGURACAO)

        self.assertGreater(resultado.topo_y, 80)
        self.assertLess(resultado.topo_y, 130)

    def test_rejeita_imagem_sem_regua(self) -> None:
        imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
        cv2.rectangle(imagem, (420, 100), (620, 540), (45, 145, 55), -1)

        with self.assertRaisesRegex(ErroMedicao, "Régua não detectada"):
            medir_vegetacao_legado(imagem, CONFIGURACAO)


if __name__ == "__main__":
    unittest.main()
