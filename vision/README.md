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

Use uma fotografia com a régua inteira visível, um marcador azul/ciano exatamente na marca de 60 cm e um marcador amarelo exatamente na marca de 0 cm. O centro do amarelo deve estar alinhado à superfície do solo. A referência manual é opcional e serve apenas para comparação:

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

1. A imagem é convertida para HSV. Componentes azuis/cianos em `(80, 25, 70)`–`(135, 255, 255)` e amarelos em `(27, 15, 70)`–`(45, 255, 255)` são segmentados e limpos por morfologia. Como os adesivos reais têm baixa saturação, comparações relativas entre os canais BGR confirmam a dominância de cor antes da análise geométrica.
2. Um núcleo cromático mais confiável impede que pixels tolerantes do amarelo se conectem ao piso, parede ou suporte. Para o amarelo, `R` e `G` precisam ser equilibrados e superar `B`; para o azul, `B` precisa superar `R`. Isso preserva as faixas HSV tolerantes sem transformar grandes fundos levemente coloridos em marcadores.
3. Área, dimensões, preenchimento, compactação e razão de aspecto removem ruído e regiões incompatíveis com um marcador compacto. Também são calculados matiz mediano, saturação, contraste local e margem até as bordas da imagem.
4. Todos os pares azul/amarelo válidos são comparados. O azul deve ficar acima, o deslocamento horizontal deve ser pequeno diante do vertical, a distância deve ser significativa e os tamanhos precisam ser compatíveis. O score global combina distância, colinearidade progressiva, semelhança de tamanho, preenchimento, compactação, qualidade cromática, contraste e margem de borda.
5. Uma faixa estreita entre os centros confirma se os dois adesivos estão presos à mesma estrutura. Em amostras distribuídas ao longo do segmento, o algoritmo compara o brilho central com duas faixas laterais e mede a continuidade de um corpo escuro/contrastante. Essa confirmação não usa Canny ou Hough e participa somente do score dos pares de marcadores.
6. Depois do score, cada par precisa confirmar simultaneamente score mínimo, alinhamento, suporte estrutural e qualidade cromática. Os pares são examinados em ordem de score e o primeiro confiável é escolhido; se nenhum passar, a medição é rejeitada em vez de produzir uma escala insegura.
7. A proximidade da borda é somente uma penalização: resíduos cortados perdem confiança, mas um par real próximo ou parcialmente recortado ainda pode ser aceito quando as demais evidências são fortes. A seleção não assume lado fixo na imagem.
8. A distância euclidiana entre os centros equivale a 60 cm: `pixelsPorCm = distânciaPixels / 60`.
9. O centro do marcador amarelo representa diretamente a base física de 0 cm. A máscara vegetal precisa fornecer evidência próxima, mas não pode deslocar a base verticalmente para vaso, piso ou fundo.
10. A vegetação preserva a segmentação HSV/ExG e os filtros estruturais das etapas anteriores. As duas regiões laterais são ancoradas pela linha entre os marcadores, permitindo planta à esquerda ou à direita sem cortar excessivamente a copa.
11. O topo é a primeira faixa consistente do componente vegetal selecionado; fragmentos ambientais desconectados são ignorados.
12. A altura usa a distância vertical entre topo e base, dividida pela escala obtida dos marcadores.
13. O diagnóstico mostra candidatos azuis e amarelos, os principais pares, score, alinhamento, suporte estrutural e confiança, além do par escolhido ou do motivo da rejeição.

### Detector legado

O detector estrutural baseado em Canny, Hough, paralelismo, marcas e contraste foi preservado em `medir_vegetacao_legado` e continua coberto pelos testes de regressão. Ele **não é fallback automático da CLI**: como os marcadores são obrigatórios na montagem desta prova de conceito, uma imagem sem calibração colorida é rejeitada. Essa escolha evita que uma heurística antiga volte a selecionar caules ou objetos ambientais.

Os parâmetros ajustáveis estão centralizados em `src/configuracao.py`.

## Testes automatizados

```powershell
vision\.venv\Scripts\python.exe -m unittest discover -s vision\tests -v
```

Os testes são separados entre `TesteCalibracaoMarcadores`, que cobre o novo fluxo principal, e `TesteDetectorLegadoEVegetacao`, que preserva todas as regressões estruturais e vegetais anteriores.

## Limitações

- O algoritmo continua sendo uma prova de conceito clássica, sem IA ou aprendizado de máquina.
- Iluminação, reflexos, perspectiva, desbotamento, oclusão e balanço de branco podem deslocar as faixas HSV dos marcadores.
- Régua, marcadores e ponto de emergência da planta precisam estar aproximadamente no mesmo plano da câmera. Diferenças de profundidade alteram a escala aparente.
- O centro do marcador amarelo precisa estar alinhado à superfície do solo; o centro do azul precisa coincidir com a marca de 60 cm.
- A combinação HSV/ExG recupera variações escuras somente quando existe evidência verde próxima; caules totalmente pretos e isolados não são classificados para evitar falsos positivos com móveis e sombras.
- As faixas dos marcadores foram calibradas inicialmente em duas capturas físicas consecutivas da ESP32-CAM. Mudanças fortes de iluminação ou de adesivo ainda exigem uma nova amostragem controlada.
- Em uma instalação real, a régua e os marcadores poderiam ser substituídos por calibração fixa do local, câmera calibrada, referência dimensional permanente, sensor de distância ou outros sensores. Os marcadores são uma estratégia de demonstração acadêmica, não uma arquitetura obrigatória para rodovias.

## Checklist de validação física

Em cada caso, registrar `aceitou/rejeitou`, `altura estimada`, `altura manual aproximada`, `erro absoluto` e `observação visual`:

- Caso A: azul em 60 cm, amarelo em 0 cm e régua frontal/vertical.
- Caso B: régua levemente inclinada, mantendo ambos os marcadores no mesmo plano.
- Caso C: câmera um pouco mais afastada.
- Caso D: câmera um pouco mais próxima.
- Caso E: iluminação diferente.
- Caso F: ausência ou oclusão de um marcador; deve ser rejeitada com a mensagem específica.
