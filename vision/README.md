# Visão computacional

Prova de conceito acadêmica para estimar a altura da vegetação em uma fotografia usando Python, OpenCV e uma régua física de 60 cm como referência. A régua fornece a escala em pixels por centímetro; os limites `Seguro`, `Cuidado` e `Perigo` pertencem somente ao protótipo e não representam regras oficiais de concessionárias ou garantia para uso rodoviário real.

## Ambiente

No PowerShell, a partir da raiz do projeto:

```powershell
py -m venv vision\.venv
vision\.venv\Scripts\Activate.ps1
python -m pip install -r vision\requirements.txt
```

## Executar

Use uma fotografia com a régua inteira visível. A referência manual é opcional e serve apenas para comparação:

```powershell
vision\.venv\Scripts\python.exe vision\src\medir_vegetacao.py `
  --imagem "C:\caminho\foto-teste.jpg" `
  --referencia-manual 57
```

A imagem anotada é gravada por padrão em `vision/saida/diagnostico.jpg`.

O backend usa a mesma interface de linha de comando com JSON e um caminho exclusivo para o diagnóstico:

```powershell
vision\.venv\Scripts\python.exe vision\src\medir_vegetacao.py `
  --imagem "C:\caminho\foto-teste.jpg" `
  --formato-json `
  --saida "C:\caminho\diagnostico.jpg"
```

O JSON mantém as propriedades `alturaCm` e `escalaPixelsPorCm`. A classificação de risco continua no backend TypeScript.

## Como funciona

1. Uma região ampla no lado da régua passa por contraste local, Canny e Hough Lines.
2. Segmentos quase verticais e colineares são agrupados, permitindo pequenas inclinações e oclusões por folhas.
3. Pares de bordas são avaliados por comprimento, largura, aspecto, repetição de marcas, tonalidade neutra e posição relativa. Objetos incompatíveis são rejeitados.
4. Os extremos detectados da régua de 60 cm definem a escala em pixels por centímetro.
5. A imagem é convertida para HSV; operações morfológicas e componentes conectados removem ruídos pequenos da máscara verde.
6. O topo continua sendo a primeira linha com densidade vegetal relevante.
7. A base combina o marco inferior da régua, alinhado ao solo no protótipo, com a última região densa da máscara. O ajuste é limitado para não seguir folhas ou ruídos isolados.
8. O diagnóstico mostra região de busca, candidatos, régua escolhida, máscara, topo, base, segmento medido, altura e escala.

Os parâmetros ajustáveis estão centralizados em `src/configuracao.py`.

## Testes automatizados

```powershell
vision\.venv\Scripts\python.exe -m unittest discover -s vision\tests -v
```

## Limitações

- O algoritmo continua sendo uma prova de conceito clássica, sem IA ou aprendizado de máquina.
- Enquadramento, iluminação, reflexos, perspectiva, inclinação excessiva e oclusão da régua ainda afetam a medição.
- Régua e ponto de emergência da planta precisam estar aproximadamente no mesmo plano e o marco de 0 cm deve ficar alinhado à base.
- A máscara HSV prioriza partes verdes e pode perder caules escuros, galhos e folhas sob sombra intensa.
- A robustez física precisa ser validada com novas imagens da ESP32-CAM; os testes locais não garantem precisão em campo.

## Checklist de validação física

Em cada caso, registrar `aceitou/rejeitou`, `altura estimada`, `altura manual aproximada`, `erro absoluto` e `observação visual`:

- Caso A: enquadramento frontal ideal e régua vertical.
- Caso B: régua levemente inclinada.
- Caso C: câmera um pouco mais afastada.
- Caso D: câmera um pouco mais próxima.
- Caso E: iluminação diferente.
- Caso F: imagem propositalmente ruim ou sem régua; deve ser rejeitada.
