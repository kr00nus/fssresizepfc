# Simulador FSS — Estrutura do Projeto

Descrição curta
- Projeto estático em HTML + JavaScript para simulação aproximada de FSS (Frequency Selective Surfaces). Cada página implementa um tipo de célula (Espira Quadrada, Patch Quadrado, Cruz de Jerusalém).

Como rodar
- Abrir localmente via servidor HTTP (recomendado):

```bash
npx http-server . -p 8000 -c-1
# ou
python -m http.server 8000
```
- Abrir no navegador: http://localhost:8000/EspiraQuadrada.html (ou `Quadrado.html`, `Cruzjeru.html`).
- O projeto usa Chart.js via CDN (script incluído nos HTMLs). Os módulos ES (`type="module"`) dependem da presença do Chart global.

**Arquivos principais e responsabilidades**
- **[EspiraQuadrada.html](EspiraQuadrada.html)**: página que controla a simulação do elemento espira quadrada. Carrega `src/css/styles.css`, Chart.js (CDN) e o módulo `src/js/ui_espira.js`.
- **[Quadrado.html](Quadrado.html)**: página do patch quadrado (modelo de Chen). Carrega `src/css/styles.css`, Chart.js e `src/js/ui_quadrado.js`.
- **[Cruzjeru.html](Cruzjeru.html)**: página da Cruz de Jerusalém. Carrega `src/css/styles.css`, Chart.js e `src/js/ui_cruzjeru.js`.
- **index.html**: página inicial / índice (padrão do repositório).

Diretório `src`
- **[src/css/styles.css](src/css/styles.css)**: estilos centralizados aplicados a todas as páginas; define layout do dashboard, painéis (`.panel`, `.params`, `.visuals`) e tamanho relativo do gráfico (maior largura horizontal).

- **[src/js/math.js](src/js/math.js)**: utilitários matemáticos reutilizáveis (conversões, funções auxiliares, implementações de fórmulas como `FF`, `GG`, `csc`, e `mmToCm`). Todas as simulações importam funções deste módulo.

- **[src/js/visual.js](src/js/visual.js)**: utilitários visuais compartilhados.
  - `createLineChart(ctx, labels, datasets, options)`: fábrica para criar charts Chart.js com arrays de datasets; aceita tanto um único array de dados (compatibilidade) quanto múltiplos datasets (marcação de fr/BW). Centraliza opções visuais (eixo X/Y, fonte, limites).
  - `exportChartToCSV(chart, filename)`: exporta dados do chart para CSV (normaliza decimais e formata colunas "Frequency (GHz);S21 (dB)").

- **[src/js/ui_espira.js](src/js/ui_espira.js)**: controlador da página `EspiraQuadrada.html`.
  - Responsabilidades: ligar sliders/inputs, aplicar presets de substrato, desenhar a célula em `canvas` (`drawGeometry`), executar a simulação (loop em frequência com `df = 0.001`), calcular `fr` e `BW`, e chamar `createLineChart`/`exportChartToCSV`.
  - Auto-inicializa quando o documento é carregado (`DOMContentLoaded`) usando `init()`.

- **[src/js/ui_quadrado.js](src/js/ui_quadrado.js)**: controlador da página `Quadrado.html` (modelo de Chen).
  - Mesmas responsabilidades de `ui_espira.js`, com a lógica matemática específica do patch quadrado.

- **[src/js/ui_cruzjeru.js](src/js/ui_cruzjeru.js)**: controlador da página `Cruzjeru.html`.
  - Mesmas responsabilidades, com o modelo de Langley/Munk adaptado para a cruz.

Fluxo de execução (por página)
1. HTML carrega Chart.js (CDN) e o CSS central.
2. HTML injeta o módulo ES correspondente (`src/js/ui_*.js`) com `type="module"`.
3. O módulo importa `math.js` e utilitários de `visual.js`.
4. `init()` faz `bindInputs()`, aplica presets de substrato (opcional), liga botão `Exportar CSV` ao `exportChartToCSV`, e chama `updateAll()`.
5. `updateAll()` valida parâmetros, chama `drawGeometry()` e realiza um loop em frequência (passo `df = 0.001`), acumulando `labels` e `data`.
6. `updateChart()` (agora via `createLineChart`) desenha a curva e marca `fr` e limites `BW`. O `exportChartToCSV()` gera arquivo `.csv` compatível com Excel (separador `;`).

Notas importantes
- Pequenas aproximações estão presentes nas fórmulas (estas simulações são modelos analíticos simplificados, não EM full-wave).
- A estrutura modular permite compartilhar `math.js` e `visual.js` entre páginas; para extrair ainda mais reutilização, podemos consolidar bindings comuns em `src/js/ui.js` — tarefa pendente.
- Para exportar/visualizar corretamente, use um servidor HTTP (alguns navegadores bloqueiam módulos/recursos via `file://`).

Contribuição / próximos passos sugeridos
- Consolidar mais lógica comum em `src/js/ui.js` (bindings e presets compartilhados).
- Adicionar testes básicos ou um snapshot de saída CSV para validação automática.
- Opcional: mover Chart.js para dependência local (npm) e adicionar `package.json` para facilitar execução e CI.

---
Criado automaticamente para facilitar navegação no repositório. Se quiser, atualizo com diagramas ou exemplos de parâmetros (valores típicos para testes).