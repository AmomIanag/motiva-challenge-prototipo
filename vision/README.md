# Visão computacional

Protótipo isolado para estimar a altura da vegetação em uma fotografia usando Python, OpenCV e uma régua vertical de 60 cm como referência.

## Ambiente

No PowerShell, a partir da raiz do projeto:

```powershell
py -m venv vision\.venv
vision\.venv\Scripts\Activate.ps1
python -m pip install -r vision\requirements.txt
```

## Executar

Use a fotografia real com a régua visível e informe separadamente a referência manual, apenas para comparação:

```powershell
vision\.venv\Scripts\python.exe vision\src\medir_vegetacao.py `
  --imagem "C:\Users\Amom\foto-teste.jpg" `
  --referencia-manual 57
```

A imagem anotada é gravada por padrão em `vision/saida/diagnostico.jpg`.

Para integração com o backend, o mesmo script oferece uma saída estritamente estruturada e pode evitar a geração do diagnóstico:

```powershell
vision\.venv\Scripts\python.exe vision\src\medir_vegetacao.py `
  --imagem "C:\Users\Amom\foto-teste.jpg" `
  --formato-json `
  --sem-diagnostico
```

Esse modo retorna somente `alturaCm` e `escalaPixelsPorCm`. A classificação de risco permanece no backend TypeScript.

## Como funciona

1. Dois pontos conhecidos da régua, centralizados em `src/configuracao.py`, definem a escala de 60 cm em pixels.
2. A imagem é convertida para HSV e os tons de verde são segmentados dentro da região da planta.
3. Operações morfológicas e filtro de área removem ruídos pequenos.
4. O topo é obtido da primeira linha relevante da máscara. A base visível é uma linha assistida configurada para a fotografia de teste.
5. A distância vertical em pixels é convertida para centímetros usando a escala da régua.

## Limitações

- A calibração e a linha da base são assistidas e específicas para o enquadramento atual.
- A máscara HSV prioriza folhas verdes e pode perder caule, galhos escuros ou folhas sob sombra intensa.
- Perspectiva, inclinação da régua, lente e distância diferente entre régua e planta afetam a precisão.
- A calibração ainda não é apropriada para enquadramentos arbitrários ou uso direto pela ESP32-CAM.
