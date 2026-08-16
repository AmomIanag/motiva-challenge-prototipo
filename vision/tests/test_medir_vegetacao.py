import sys
import unittest
from pathlib import Path

import cv2
import numpy as np


PASTA_SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(PASTA_SRC))

from configuracao import CONFIGURACAO  # noqa: E402
from medir_vegetacao import ErroMedicao, medir_vegetacao  # noqa: E402


def criar_cena_com_regua() -> np.ndarray:
    imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
    cv2.rectangle(imagem, (235, 35), (275, 550), (145, 145, 145), -1)
    cv2.rectangle(imagem, (235, 35), (275, 550), (35, 35, 35), 2)
    for y in range(43, 548, 8):
        comprimento = 30 if (y - 43) % 40 == 0 else 18
        cv2.line(imagem, (235, y), (235 + comprimento, y), (30, 30, 30), 2)

    verde = (45, 145, 55)
    cv2.line(imagem, (500, 540), (500, 120), verde, 15)
    cv2.ellipse(imagem, (500, 120), (75, 32), 0, 0, 360, verde, -1)
    cv2.ellipse(imagem, (445, 230), (70, 25), -15, 0, 360, verde, -1)
    cv2.ellipse(imagem, (555, 320), (80, 26), 15, 0, 360, verde, -1)
    return imagem


class TesteMedicaoVegetacao(unittest.TestCase):
    def test_mede_cena_sintetica_e_detecta_escala(self) -> None:
        resultado = medir_vegetacao(criar_cena_com_regua(), CONFIGURACAO)

        self.assertGreater(resultado.altura_cm, 40)
        self.assertLess(resultado.altura_cm, 60)
        self.assertGreater(resultado.pixels_por_cm, 7)
        self.assertLess(resultado.pixels_por_cm, 10)
        self.assertLess(resultado.topo_y, resultado.base_y)

    def test_aceita_pequena_inclinacao(self) -> None:
        imagem = criar_cena_com_regua()
        matriz = cv2.getRotationMatrix2D((255, 295), 6, 1.0)
        inclinada = cv2.warpAffine(
            imagem,
            matriz,
            (imagem.shape[1], imagem.shape[0]),
            borderValue=(245, 245, 245),
        )

        resultado = medir_vegetacao(inclinada, CONFIGURACAO)

        self.assertGreater(resultado.altura_cm, 40)
        self.assertLess(resultado.altura_cm, 65)

    def test_rejeita_imagem_sem_regua(self) -> None:
        imagem = np.full((600, 800, 3), 245, dtype=np.uint8)
        cv2.rectangle(imagem, (420, 100), (620, 540), (45, 145, 55), -1)

        with self.assertRaisesRegex(ErroMedicao, "Régua não detectada"):
            medir_vegetacao(imagem, CONFIGURACAO)


if __name__ == "__main__":
    unittest.main()
