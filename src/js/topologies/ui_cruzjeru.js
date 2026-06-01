// ==========================================
// SIMULADOR FSS - CRUZ DE JERUSALÉM (BENCHMARK ANALÍTICO + HFSS)
// Interface de usuário e atualização de gráficos
// ==========================================
// Este arquivo gerencia a interface gráfica do simulador da Cruz de Jerusalém.
// FSS significa "Frequency Selective Surface" (Superfície Seletiva de Frequência)
// Este código controla os gráficos, entrada de dados e visualização do comportamento eletromagnético

// Importa funções matemáticas do arquivo math.js
// mmToCm = converte milímetros para centímetros
// FF = calcula funções matemáticas específicas
// calcS21 = calcula o parâmetro S21 (transmissão de sinal)
import { mmToCm, FF, calcS21 } from "../core/math.js";
import { initSubstrateSelector } from "../common/substrate-selector.js";

// Variável global que armazena o gráfico Chart.js (biblioteca para fazer gráficos)
let chart = null;
// Variável global que armazena os dados do HFSS (software de simulação eletromagnética)
let hfssData = null;

// Evento que executa quando a página HTML foi completamente carregada
document.addEventListener("DOMContentLoaded", () => {
  // Função que conecta um controle deslizante (slider) com um campo numérico
  // Quando o usuário muda um valor em um, o outro é atualizado automaticamente
  function bindInputs(idPrefix) {
    // Encontra o elemento HTML do slider usando seu ID (ex: "p_slider")
    const slider = document.getElementById(idPrefix + "_slider");
    // Encontra o elemento HTML do campo numérico usando seu ID (ex: "p_num")
    const num = document.getElementById(idPrefix + "_num");
    // Se um deles não existir, sai da função
    if (!slider || !num) return;

    // Quando o slider é movido, atualiza o campo numérico
    slider.addEventListener("input", (e) => {
      // Define quantas casas decimais cada tipo de dado deve ter
      // Frequências (fStart, fEnd) = 1 casa decimal
      // Constante dielétrica e altura (er, h_sub) = 2 casas decimais
      // Outras dimensões = 3 casas decimais
      const decimals = ["fStart", "fEnd"].includes(idPrefix)
        ? 1
        : ["er", "h_sub"].includes(idPrefix)
          ? 2
          : 3;
      // Converte o valor do slider para número e formata com as casas decimais corretas
      num.value = parseFloat(e.target.value).toFixed(decimals);
      // Recalcula e atualiza todos os gráficos
      updateAll();
    });

    // Quando o campo numérico é editado, atualiza o slider
    num.addEventListener("input", (e) => {
      // Coloca o valor do campo numérico no slider
      slider.value = e.target.value;
      // Recalcula e atualiza todos os gráficos
      updateAll();
    });
  }

  // Conecta todos os parâmetros do simulador para que slider e campo numérico fiquem sincronizados
  // Parâmetros:
  // fStart = frequência inicial (GHz)
  // fEnd = frequência final (GHz)
  // p = período da célula (mm)
  // d = comprimento do "chapéu" ou "cap" da cruz (mm)
  // w = espessura do braço interno da cruz (mm)
  // h = espessura do "chapéu" (mm)
  // h_sub = altura do substrato (mm)
  // er = permissividade relativa do material (constante dielétrica)
  // g = tamanho do gap (espaço vazio entre cruzes) (mm)
  ["fStart", "fEnd", "p", "d", "w", "h", "h_sub", "er", "g"].forEach(
    bindInputs,
  );

  // Seletor de substrato centralizado
  initSubstrateSelector(() => updateAll());

  // Encontra o botão de exportar
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    // Quando o botão é clicado, exporta os dados para um arquivo CSV
    exportBtn.addEventListener("click", exportToCSV);

    // Cria um input invisível para selecionar arquivo CSV
    const hfssInput = document.createElement("input");
    hfssInput.type = "file";
    hfssInput.accept = ".csv"; // Aceita apenas arquivos CSV
    hfssInput.style.display = "none"; // Mantém invisível
    hfssInput.addEventListener("change", handleHFSSUpload); // Quando arquivo é selecionado

    // Cria um botão visual para carregar dados do HFSS
    const hfssBtn = document.createElement("button");
    hfssBtn.innerText = "Carregar Dados HFSS"; // Texto do botão
    // Estilos do botão (margem, cor vermelha, etc)
    hfssBtn.style.cssText =
      "margin-top: 10px; margin-left: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;";
    // Ao clicar no botão visual, abre o seletor de arquivo
    hfssBtn.onclick = () => hfssInput.click();

    // Adiciona os elementos (input invisível e botão) à página HTML
    exportBtn.parentNode.insertBefore(hfssInput, exportBtn.nextSibling);
    exportBtn.parentNode.insertBefore(hfssBtn, exportBtn.nextSibling);
  }

  // Executa uma atualização completa dos gráficos no carregamento inicial
  updateAll();
});

// Função que processa o arquivo CSV do HFSS quando o usuário o carrega
function handleHFSSUpload(event) {
  // Obtém o arquivo selecionado pelo usuário
  const file = event.target.files[0];
  // Se nenhum arquivo foi selecionado, sai da função
  if (!file) return;

  // Cria um leitor de arquivo para ler o conteúdo em texto
  const reader = new FileReader();
  // Quando o arquivo foi lido com sucesso
  reader.onload = (e) => {
    // Obtém o conteúdo do arquivo como texto
    const text = e.target.result;
    // Divide o conteúdo em linhas (quebra de linha = uma linha)
    const lines = text.split("\n");
    // Inicializa um array vazio para armazenar os dados
    hfssData = [];

    // Percorre cada linha do arquivo (começando da linha 1 para pular o cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      // Se a linha está vazia, pula para a próxima
      if (!lines[i].trim()) continue;
      // Divide a linha por vírgula para separar frequência e S21
      const parts = lines[i].split(",");
      // Verifica se há pelo menos 2 valores na linha (frequência e S21)
      if (parts.length >= 2) {
        // Converte o primeiro valor para número (frequência em GHz)
        const freq = parseFloat(parts[0]);
        // Converte o segundo valor para número (S21 em dB)
        const s21 = parseFloat(parts[1]);
        // Valida que ambos os valores são números válidos
        if (!isNaN(freq) && !isNaN(s21)) {
          // Adiciona o ponto de dados ao array
          // x = frequência, y = valor de transmissão (S21)
          hfssData.push({ x: freq, y: s21 });
        }
      }
    }
    // Mostra uma mensagem dizendo quantos pontos foram carregados
    alert(
      `Dados do HFSS carregados com sucesso! (${hfssData.length} pontos encontrados)`,
    );
    // Atualiza todos os gráficos com os novos dados do HFSS
    updateAll();
  };
  // Lê o arquivo como texto
  reader.readAsText(file);
}

// ==========================================
// FUNÇÃO: drawGeometry() - Desenha a Cruz de Jerusalém no canvas
// ==========================================
// Esta função desenha a geometria 2D da Cruz de Jerusalém e suas repetições
// Parâmetros:
// p = período (tamanho total da célula)
// d = comprimento do chapéu
// w = espessura do braço interno
// h = espessura do chapéu
// g = tamanho do gap (espaço vazio)
function drawGeometry(p, d, w, h, g) {
  // Encontra o elemento canvas (área onde vamos desenhar)
  const canvas = document.getElementById("shapeCanvas");
  // Se o canvas não existir, sai da função
  if (!canvas) return;
  // Obtém o contexto 2D para desenhar no canvas
  const ctx = canvas.getContext("2d");
  // Obtém o tamanho do canvas em pixels
  const size = canvas.width;

  // Limpa o canvas, apagando tudo que estava desenhado
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, size, size);

  // Define o tamanho da área visível (um pouco maior que o período para visualizar bem)
  const viewSize = p * 2.2;
  // Calcula a escala: quantos pixels por unidade de comprimento
  const scale = size / viewSize;
  // Calcula o centro do canvas em pixels
  const center = size / 2;

  // Converte o período de mm para pixels (aplicando a escala)
  const pPixel = p * scale;
  // Converte o gap de mm para pixels
  const gPixel = g * scale;

  // Calcula o tamanho total da cruz na tela (período menos o gap vazio)
  const crossSpan = pPixel - gPixel;

  // Converte o comprimento do chapéu de mm para pixels
  const dPixel = d * scale; // Comprimento do chapéu
  // Converte a espessura do chapéu de mm para pixels
  const hPixel = h * scale; // Espessura do chapéu
  // Converte a espessura do braço interno de mm para pixels
  const wPixel = w * scale; // Espessura do braço interno

  // Função auxiliar que desenha uma Cruz de Jerusalém em uma posição (cx, cy)
  // isCenter = true se é a cruz do centro, false se é uma das vizinhas
  function drawJerusalemCross(cx, cy, isCenter) {
    // Define a cor: azul escuro para a cruz central, azul claro semitransparente para as vizinhas
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";

    // ===== Desenha os braços centrais da cruz (parte horizontal e vertical) =====
    // O comprimento do braço é o tamanho total menos a espessura dos 2 chapéus nas pontas
    const innerLen = Math.max(0, crossSpan - 2 * hPixel);
    // Desenha o braço horizontal (retângulo)
    // cx - innerLen/2 = posição esquerda, cy - wPixel/2 = posição superior
    ctx.fillRect(cx - innerLen / 2, cy - wPixel / 2, innerLen, wPixel); // Horizontal
    // Desenha o braço vertical (retângulo)
    ctx.fillRect(cx - wPixel / 2, cy - innerLen / 2, wPixel, innerLen); // Vertical

    // ===== Desenha os chapéus (pequenos quadrados nas 4 extremidades) =====
    // Cada chapéu é um retângulo nas extremidades da cruz
    // Chapéu no topo
    ctx.fillRect(cx - dPixel / 2, cy - crossSpan / 2, dPixel, hPixel);
    // Chapéu no fundo
    ctx.fillRect(cx - dPixel / 2, cy + crossSpan / 2 - hPixel, dPixel, hPixel);
    // Chapéu à esquerda
    ctx.fillRect(cx - crossSpan / 2, cy - dPixel / 2, hPixel, dPixel);
    // Chapéu à direita
    ctx.fillRect(cx + crossSpan / 2 - hPixel, cy - dPixel / 2, hPixel, dPixel);
  }

  // Array com as posições das 4 cruzes vizinhas (acima, abaixo, esquerda, direita da central)
  // i e j são índices de posição na grade
  const neighbors = [
    { i: 0, j: -1 }, // Acima
    { i: 0, j: 1 }, // Abaixo
    { i: -1, j: 0 }, // À esquerda
    { i: 1, j: 0 }, // À direita
  ];
  // Desenha cada cruz vizinha com cor mais clara
  neighbors.forEach((n) =>
    drawJerusalemCross(center + n.i * pPixel, center + n.j * pPixel, false),
  );
  // Desenha a cruz do centro com cor mais escura
  drawJerusalemCross(center, center, true);

  // ===== Desenha a linha tracejada que mostra o limite do período (p) =====
  // Define o padrão de traço (5 pixels preenchidos, 5 pixels vazios)
  ctx.setLineDash([5, 5]);
  // Define a cor da linha como preta com transparência
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  // Define a espessura da linha
  ctx.lineWidth = 1;
  // Desenha um quadrado tracejado mostrando a célula unitária
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  // Remove o padrão de traço para desenhos subsequentes
  ctx.setLineDash([]);

  // ===== DESENHA DIMENSÕES COM SETAS E RÓTULOS =====
  drawDimensionsCruz(
    ctx,
    center,
    pPixel,
    crossSpan,
    dPixel,
    hPixel,
    wPixel,
    scale,
    p,
    d,
    w,
    h,
    g,
  );
}

// ==========================================
// FUNÇÃO: drawDimensionsCruz()
// Desenha as setas e rótulos das dimensões (p, d, w, h, g) na geometria da Cruz
// Todos os elementos são responsivos e se ajustam ao tamanho
// ==========================================
function drawDimensionsCruz(
  ctx,
  center,
  pPixel,
  crossSpan,
  dPixel,
  hPixel,
  wPixel,
  scale,
  p,
  d,
  w,
  h,
  g,
) {
  // Configurações de tamanho responsivo
  const fontSize = Math.max(10, pPixel * 0.06); // Fonte se ajusta ao tamanho
  const arrowSize = Math.max(3, pPixel * 0.03); // Tamanho das setas
  const lineWidth = Math.max(1.5, pPixel * 0.008); // Espessura das linhas
  const offset = Math.max(25, pPixel * 0.15); // Distância dos rótulos

  ctx.lineWidth = lineWidth;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ===== DIMENSÃO p (PERÍODO) - VERTICAL (LADO ESQUERDO) =====
  ctx.strokeStyle = "#d32f2f";
  ctx.fillStyle = "#d32f2f";

  const pStartY = center - pPixel / 2;
  const pEndY = center + pPixel / 2;
  const pX = center - pPixel / 2 - offset;

  // Desenha linha VERTICAL da dimensão p (lado esquerdo)
  drawArrowLineCruz(ctx, pX, pStartY, pX, pEndY, arrowSize);

  // Rótulo de p posicionado à esquerda
  ctx.fillStyle = "#d32f2f";
  ctx.font = `bold ${fontSize * 0.9}px Arial, sans-serif`;
  ctx.save();
  ctx.translate(pX - offset * 0.4, center);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`p = ${p.toFixed(3)} mm`, 0, 0);
  ctx.restore();

  // ===== DIMENSÃO d (COMPRIMENTO DO CHAPÉU) - HORIZONTAL (TOPO) =====
  ctx.strokeStyle = "#cc0000";
  ctx.fillStyle = "#cc0000";

  const dStartX = center - dPixel / 2;
  const dEndX = center + dPixel / 2;
  const dY = center - pPixel / 2 - offset;

  // Seta HORIZONTAL mostrando d no topo
  drawArrowLineCruz(ctx, dStartX, dY, dEndX, dY, arrowSize);

  ctx.font = `bold ${fontSize * 0.85}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`d = ${d.toFixed(3)} mm`, center, dY - offset * 0.4);

  // ===== DIMENSÃO w (ESPESSURA DO BRAÇO) - Vertical (Centro) =====
  ctx.strokeStyle = "#ff9800";
  ctx.fillStyle = "#ff9800";

  const wLabelX = center + offset * 0.3;
  const wStartY = center - wPixel / 2;
  const wEndY = center + wPixel / 2;

  // Seta mostrando w
  drawArrowLineCruz(ctx, wLabelX, wStartY, wLabelX, wEndY, arrowSize * 0.8);

  ctx.font = `bold ${fontSize * 0.8}px Arial, sans-serif`;
  ctx.fillStyle = "#ff9800";
  ctx.textAlign = "left";
  ctx.fillText(`w`, wLabelX + offset * 0.15, center);

  // ===== DIMENSÃO h (ESPESSURA DO CHAPÉU) - Vertical (Lado Esquerdo) =====
  ctx.strokeStyle = "#9c27b0";
  ctx.fillStyle = "#9c27b0";

  const hLabelX = center - dPixel / 2 - offset * 0.3;
  const hStartY = center - crossSpan / 2;
  const hEndY = center - crossSpan / 2 + hPixel;

  // Seta mostrando h
  drawArrowLineCruz(
    ctx,
    hLabelX,
    hStartY - offset * 0.1,
    hLabelX,
    hEndY,
    arrowSize * 0.8,
  );

  ctx.fillStyle = "#9c27b0";
  ctx.font = `bold ${fontSize * 0.8}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`h`, hLabelX - offset * 0.15, hStartY + hPixel / 2);

  // ===== DIMENSÃO g (GAP) - Horizontal (Lado Direito) =====
  ctx.strokeStyle = "#2196f3";
  ctx.fillStyle = "#2196f3";

  const gGapPixel = (pPixel - crossSpan) / 2;
  const gStartX = center + crossSpan / 2;
  const gEndX = center + pPixel / 2;
  const gY = center + offset * 0.5;

  // Seta mostrando g
  drawArrowLineCruz(ctx, gStartX, gY, gEndX, gY, arrowSize * 0.8);

  ctx.font = `bold ${fontSize * 0.8}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    `g = ${g.toFixed(3)} mm`,
    center + crossSpan / 2 + gGapPixel / 2,
    gY + offset * 0.4,
  );

  // ===== LEGENDA COM CORES =====
  drawLegendCruz(ctx, fontSize);
}

// ==========================================
// FUNÇÃO: drawArrowLineCruz()
// Desenha uma linha com setas nas duas extremidades
// Utilizado para indicar as dimensões na geometria da Cruz
// ==========================================
function drawArrowLineCruz(ctx, fromX, fromY, toX, toY, arrowSize) {
  // Calcula o ângulo da linha
  const headlen = arrowSize;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  // Desenha a linha principal
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Desenha a seta no início
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(
    fromX - headlen * Math.cos(angle - Math.PI / 6),
    fromY - headlen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    fromX - headlen * Math.cos(angle + Math.PI / 6),
    fromY - headlen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();

  // Desenha a seta no final
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

// ==========================================
// FUNÇÃO: drawLegendCruz()
// Desenha uma legenda com as cores usadas nas dimensões da Cruz
// ==========================================
function drawLegendCruz(ctx, fontSize) {
  const canvas = ctx.canvas;
  const legendX = 10;
  const legendY = canvas.height - 70;
  const boxWidth = 280;
  const boxHeight = 65;

  // Fundo da legenda
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(legendX, legendY, boxWidth, boxHeight);
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, boxWidth, boxHeight);

  // Texto da legenda
  ctx.font = `${fontSize * 0.75}px Arial`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#333";

  // Cor p (vermelho)
  ctx.fillStyle = "#d32f2f";
  ctx.fillRect(legendX + 8, legendY + 8, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("p=período", legendX + 25, legendY + 14);

  // Cor d (vermelho)
  ctx.fillStyle = "#d32f2f";
  ctx.fillRect(legendX + 8, legendY + 26, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("d=chapéu", legendX + 25, legendY + 32);

  // Cor d (vermelho)
  ctx.fillStyle = "#d32f2f";
  ctx.fillRect(legendX + 8, legendY + 44, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("g=gap", legendX + 25, legendY + 50);

  // Cor w (laranja)
  ctx.fillStyle = "#ff9800";
  ctx.fillRect(legendX + 130, legendY + 8, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("w=braço", legendX + 147, legendY + 14);

  // Cor h (roxo)
  ctx.fillStyle = "#9c27b0";
  ctx.fillRect(legendX + 130, legendY + 26, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("h=chap.esp.", legendX + 147, legendY + 32);
}

// Função principal que atualiza todos os gráficos e cálculos quando algo muda
function updateAll() {
  // Lê o valor da frequência inicial (em GHz) do campo HTML
  const fStart = parseFloat(document.getElementById("fStart_num").value);
  // Lê o valor da frequência final (em GHz) do campo HTML
  const fEnd = parseFloat(document.getElementById("fEnd_num").value);
  // Lê o período (tamanho da célula em mm) - variável que pode mudar
  let p = parseFloat(document.getElementById("p_num").value);
  // Lê o comprimento do chapéu (em mm) - variável que pode mudar
  let d = parseFloat(document.getElementById("d_num").value);
  // Lê a espessura do braço interno (em mm) - variável que pode mudar
  let w = parseFloat(document.getElementById("w_num").value);
  // Lê a espessura do chapéu (em mm) - variável que pode mudar
  let h = parseFloat(document.getElementById("h_num").value);
  // Lê o tamanho do gap/espaço (em mm) - variável que pode mudar
  let g = parseFloat(document.getElementById("g_num").value);
  // Lê a altura do substrato (em mm)
  const h_sub = parseFloat(document.getElementById("h_sub_num").value);
  // Lê a permissividade relativa do material (constante dielétrica)
  const er_real = parseFloat(document.getElementById("er_num").value);

  // Valida se todos os valores são positivos e válidos
  // Se algum valor for inválido, limpa o gráfico e sai da função
  if (
    fStart <= 0 || // Frequência inicial deve ser positiva
    fEnd <= 0 || // Frequência final deve ser positiva
    p <= 0 || // Período deve ser positivo
    d <= 0 || // Comprimento do chapéu deve ser positivo
    w <= 0 || // Espessura do braço deve ser positiva
    h <= 0 || // Espessura do chapéu deve ser positiva
    g <= 0 || // Gap deve ser positivo
    er_real <= 0 || // Permissividade deve ser positiva
    fStart >= fEnd // Frequência inicial deve ser menor que a final
  ) {
    // Se há um gráfico anterior, o destroi (remove da memória)
    if (chart) chart.destroy();
    // Sai da função sem fazer nada
    return;
  }

  // ===== TRAVAS DE SEGURANÇA FÍSICA =====
  // Essas travas garantem que os parâmetros fazem sentido fisicamente

  // TRAVA 1: O gap não pode ser maior ou igual ao período
  // O gap é o espaço vazio entre as cruzes, que deve ser menor que o período total
  if (g >= p) g = p - 0.001; // Se violar, reduz o gap para 0.001mm menos que p

  // TRAVA 2: O chapéu (d) não pode ser maior que o espaço disponível (p - g)
  // O chapéu é o quadrado nas pontas da cruz e não pode ultrapassar o tamanho da célula
  if (d > p - g) d = p - g; // Se violar, reduz d para caber na célula

  // Atualiza os campos de entrada (slider e número) com os valores corrigidos pelas travas
  // Isso mantém a interface sincronizada com os valores calculados
  const ids = { p, d, w, h, g }; // Objeto com os valores revisados
  // Para cada parâmetro
  Object.keys(ids).forEach((key) => {
    // Encontra o campo numérico
    let elNum = document.getElementById(key + "_num");
    // Encontra o slider
    let elSli = document.getElementById(key + "_slider");
    // Se o valor do campo numérico está desatualizado, atualiza
    if (elNum && elNum.value != ids[key].toFixed(3))
      elNum.value = ids[key].toFixed(3);
    // Se o valor do slider está desatualizado, atualiza
    if (elSli && elSli.value != ids[key].toFixed(3))
      elSli.value = ids[key].toFixed(3);
  });

  // ===== FATOR DE FORMA DINÂMICO (ALPHA) =====
  // Este é um parâmetro importante que ajusta os cálculos de acordo com a geometria
  // ALPHA depende da razão entre altura do substrato e período

  // Calcula a razão entre a altura do substrato e o período
  const ratio_hp = h_sub / p;
  // Calcula o valor dinâmico de alpha usando uma fórmula linear interpolada
  // Quando a razão é 0.05, alpha = 22; quando a razão é 0.2, alpha = 17
  let alpha = 22 - (ratio_hp - 0.05) * ((22 - 17) / (0.2 - 0.05));
  // Limita alpha entre 17 e 22 (não deixa sair desse intervalo)
  alpha = Math.max(17, Math.min(22, alpha));

  // ===== AS 6 FÓRMULAS DIFERENTES PARA CALCULAR A PERMISSIVIDADE EFETIVA =====
  // Permissividade efetiva (ε_eff) é uma propriedade que depende da geometria
  // Existem vários modelos diferentes para calculá-la. Vamos comparar todos!

  // 1. Fórmula da média clássica (média geométrica simples)
  const er_media = (er_real + 1) / 2;

  // 2. Fórmula NOVA com fator de forma dinâmico (Costa, Cruz)
  // Usa a função exponencial com o alpha calculado dinamicamente
  const er_nova =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));

  // 3. Fórmula HEURÍSTICA (Sua Tentativa)
  // Uma combinação ponderada da média e da fórmula nova
  const er_tentativa = (er_media + 3 * er_nova) / 4;

  // 4. Fórmula ANTIGA com constante fixa 1.8
  // Usa uma abordagem exponencial com expoente fixo
  const er_antiga =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));

  // 5. Fórmula com TANGENTE HIPERBÓLICA
  // Uma abordagem alternativa usando função tanh
  const er_tanh = 1 + ((er_real - 1) / 2) * Math.tanh((Math.PI * h_sub) / p);

  // 6. Sem correção (apenas o material puro, sem considerar geometria)
  const er_puro = er_real;

  // Encontra o campo HTML que mostra a permissividade efetiva calculada
  const erEffEl = document.getElementById("er_eff_num");
  // Se o campo existe, atualiza com o valor da fórmula nova
  if (erEffEl) erEffEl.value = er_nova.toFixed(3);

  // Desenha a geometria da cruz no canvas
  drawGeometry(p, d, w, h, g);

  // Define o passo de frequência para o cálculo (0.001 GHz)
  // Quanto menor, mais preciso mas mais lento
  const df = 0.001;
  // Converte todas as dimensões de milímetros para centímetros
  // Isso é necessário porque a fórmula FF usa centímetros
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const hCm = mmToCm(h);
  const gCm = mmToCm(g);

  // Cria arrays para armazenar os resultados de S21 para cada modelo de permissividade
  // Cada array terá um valor de S21 (em dB) para cada frequência
  const data_nova = [], // Dados para a fórmula nova com alpha dinâmico
    data_tentativa = [], // Dados para a heurística personalizada
    data_antiga = [], // Dados para a fórmula com constante 1.8
    data_media = [], // Dados para a média simples
    data_tanh = [], // Dados para a fórmula com tanh
    data_puro = [], // Dados para material puro sem correção
    labels = []; // Array com os rótulos de frequência para o eixo X

  // Calcula a frequência limite (30/p em cm)
  // Acima dessa frequência o modelo perde precisão
  const f_limit = 30 / pCm;

  // Loop que percorre cada frequência do intervalo (fStart até fEnd)
  for (let freq = fStart; freq <= fEnd; freq += df) {
    // Calcula o comprimento de onda em cm
    // lamb = 30 / freq (fórmula: c = 30cm/ns, então lambda = c/f = 30/f em GHz)
    const lamb = 30 / freq;
    // Ângulo de incidência (sempre 0 para incidência normal)
    const ang = 0;

    try {
      // ===== EQUAÇÕES EXATAS DO CIRCUITO EQUIVALENTE (ECM) DO LIVRO PÁGINA 106 =====
      // O modelo usa uma abordagem de circuito com indutâncias (L) e capacitâncias (C)

      // ===== CÁLCULO DAS INDUTÂNCIAS =====
      // XL1 = Indutância do braço horizontal/vertical central
      const XL1 = FF(pCm, wCm, lamb, ang);
      // XL2 = Indutância relacionada ao chapéu, escalada pela razão d/p
      const XL2 = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);
      // lamb3 = comprimento de onda na ressonância do chapéu
      const lamb3 = dCm / 0.43;

      // ===== CÁLCULO DAS CAPACITÂNCIAS =====
      // Bg_base = Capacitância relacionada ao gap
      const Bg_base = ((4 * dCm) / pCm) * FF(pCm, gCm, lamb, ang);
      // Bd_base = Capacitância relacionada ao chapéu
      const Bd_base =
        ((4 * (2 * hCm + gCm)) / pCm) * FF(pCm, pCm - dCm, lamb, ang);
      // C_total_base = Capacitância total (soma de gap e chapéu)
      const C_total_base = Bg_base + Bd_base;

      // Função que calcula o S21 para um dado valor de permissividade efetiva
      const calcPt = (er_val) => {
        // Calcula a susceptância 1 (capacitância * permissividade efetiva)
        const BC1 = er_val * C_total_base;
        // Calcula a reatância 1 (indutância menos capacitância)
        const X1 = XL1 - 1 / BC1;

        // Calcula a frequência efetiva de ressonância do chapéu
        const f3_eff = 30 / lamb3 / Math.sqrt(er_val);
        // Calcula a susceptância 2 relacionada ao chapéu
        const BC2 = (1 / XL2) * Math.pow(freq / f3_eff, 2);
        // Calcula a reatância 2
        const X2 = XL2 - 1 / BC2;

        // Calcula a susceptância total (soma das susceptâncias paralelas)
        const B_total = 1 / X1 + 1 / X2;
        // Converte a susceptância em S21 (parâmetro de transmissão em dB)
        return calcS21(B_total);
      };

      // Adiciona a frequência como rótulo para o eixo X
      labels.push(freq.toFixed(3));
      // Calcula S21 para cada modelo e o limita a -60 dB mínimo
      // (valores abaixo de -60 dB são considerados ruído)
      data_nova.push(Math.max(-60, calcPt(er_nova))); // Modelo novo
      data_tentativa.push(Math.max(-60, calcPt(er_tentativa))); // Modelo tentativa
      data_antiga.push(Math.max(-60, calcPt(er_antiga))); // Modelo antigo
      data_media.push(Math.max(-60, calcPt(er_media))); // Média simples
      data_tanh.push(Math.max(-60, calcPt(er_tanh))); // Modelo tanh
      data_puro.push(Math.max(-60, calcPt(er_puro))); // Sem correção
    } catch (e) {
      // Se houver erro no cálculo (por exemplo, divisão por zero), adiciona 0
      data_nova.push(0);
      data_tentativa.push(0);
      data_antiga.push(0);
      data_media.push(0);
      data_tanh.push(0);
      data_puro.push(0);
    }
  }

  // ===== PREPARAR DADOS DO HFSS PARA PLOTAGEM =====
  // Se o usuário carregou dados do HFSS, precisamos alinhar com as frequências do gráfico
  let hfssPlotData = []; // Array para armazenar dados do HFSS mapeados para nossas frequências
  // Se há dados do HFSS disponíveis
  if (hfssData && hfssData.length > 0) {
    let hfssIndex = 0; // Índice para percorrer os dados do HFSS
    // Para cada frequência do nosso cálculo, encontra o valor mais próximo do HFSS
    hfssPlotData = labels.map((labelStr) => {
      // Converte o rótulo da frequência para número
      const f = parseFloat(labelStr);
      // Avança no array HFSS até encontrar frequências maiores ou iguais à atual
      while (hfssIndex < hfssData.length - 1 && hfssData[hfssIndex].x < f)
        hfssIndex++;
      // Se a frequência do HFSS está a menos de 0.005 GHz de distância, usa o valor
      // Caso contrário, retorna null (nenhum dado para esta frequência)
      return Math.abs(hfssData[hfssIndex].x - f) < 0.005
        ? hfssData[hfssIndex].y
        : null;
    });
  }

  // ===== ENCONTRAR O ÍNDICE DO LIMITE DE FREQUÊNCIA =====
  // O modelo perde precisão acima de uma certa frequência (quando lambda = p)
  // Queremos marcar esse limite no gráfico
  let limitIndex = -1; // Inicializa como -1 (não encontrado)
  // Percorre todas as frequências
  for (let i = 0; i < labels.length; i++) {
    // Se encontrou uma frequência >= f_limit
    if (parseFloat(labels[i]) >= f_limit) {
      limitIndex = i; // Armazena o índice
      break; // Sai do loop
    }
  }

  // Atualiza o gráfico com todos os dados calculados
  updateChart(
    labels,
    data_nova,
    data_tentativa,
    data_antiga,
    data_media,
    data_tanh,
    data_puro,
    hfssPlotData,
    limitIndex,
    f_limit,
    alpha,
    er_tentativa,
  );

  // === FEEDBACK VISUAL DE REATÂNCIAS NA RESSONÂNCIA ===
  const validForReact = limitIndex !== -1 ? data_nova.slice(0, limitIndex) : data_nova;
  const minIdx = validForReact.indexOf(Math.min(...validForReact));
  const frFreq = parseFloat(labels[minIdx]);

  if (!isNaN(frFreq) && frFreq > 0) {
    const lamb_r = 30 / frFreq;
    const XL1_r = FF(pCm, wCm, lamb_r, 0);
    const XL2_r = (dCm / pCm) * FF(pCm, 2 * wCm, lamb_r, 0);
    const lamb3 = dCm / 0.43;
    const Bg_r = ((4 * dCm) / pCm) * FF(pCm, gCm, lamb_r, 0);
    const Bd_r = ((4 * (2 * hCm + gCm)) / pCm) * FF(pCm, pCm - dCm, lamb_r, 0);
    const C_total_r = Bg_r + Bd_r;
    const BC1_r = er_nova * C_total_r;
    const X1_r = XL1_r - 1 / BC1_r;
    const f3_eff = 30 / lamb3 / Math.sqrt(er_nova);
    const BC2_r = (1 / XL2_r) * Math.pow(frFreq / f3_eff, 2);
    const X2_r = XL2_r - 1 / BC2_r;
    const B_total_r = 1 / X1_r + 1 / X2_r;

    const fmt = (v) => v.toFixed(4);
    const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setVal("val_XL", `${fmt(XL1_r)} @ ${frFreq.toFixed(2)} GHz`);
    setVal("val_BC1", `${fmt(BC1_r)} (×ε_eff)`);
    setVal("val_XL2", `${fmt(XL2_r)}`);
    setVal("val_BC2", `${fmt(BC2_r)}`);
    setVal("val_Zseries", `${fmt(X1_r)}`);
    setVal("val_Yshunt", `${fmt(B_total_r)}`);
    setVal("val_erEff", `${er_nova.toFixed(4)}`);
  }
}

// Função que atualiza o gráfico Chart.js com todos os dados calculados
// Esta função cria ou atualiza o gráfico mostrando as diferentes curvas de S21
function updateChart(
  labels, // Array com rótulos de frequência para o eixo X
  data_nova, // Dados do modelo novo
  data_tentativa, // Dados do modelo tentativa
  data_antiga, // Dados do modelo antigo
  data_media, // Dados do modelo média
  data_tanh, // Dados do modelo tanh
  data_puro, // Dados do modelo sem correção
  hfssPlotData, // Dados do HFSS (se carregado)
  limitIndex, // Índice da frequência limite do modelo
  f_limit, // Valor da frequência limite
  alpha, // Fator de forma dinâmico
  er_tentativa, // Permissividade efetiva da tentativa
) {
  // Obtém o elemento canvas onde o gráfico será desenhado
  const ctx = document.getElementById("fssChart").getContext("2d");
  // Se há um gráfico anterior, o destroi para liberar memória
  if (chart) chart.destroy();

  // ===== ENCONTRA A FREQUÊNCIA DE RESSONÂNCIA =====
  // A ressonância é onde S21 tem seu mínimo (transmissão máxima)
  // Usa apenas os dados até o limite de frequência
  const validData =
    limitIndex !== -1 ? data_nova.slice(0, limitIndex) : data_nova;
  // Encontra o índice do valor mínimo (ressonância)
  const minIndex = validData.indexOf(Math.min(...validData));
  // Obtém a frequência de ressonância em GHz
  const frFreq = parseFloat(labels[minIndex]);

  // ===== CONFIGURAÇÃO DAS CURVAS DO GRÁFICO =====
  // Define as 6 curvas de S21 para comparação, cada uma com um modelo diferente
  const datasets = [
    // CURVA 1: Modelo novo com fator de forma dinâmico (linha preta sólida)
    {
      label: "1. ε_eff Fator Forma Dinâmico (Costa, Cruz)",
      data: data_nova,
      borderColor: "#000000", // Cor: preto
      borderWidth: 2.5, // Mais grossa (modelo principal)
      pointRadius: 0, // Sem pontos
      fill: false, // Sem preenchimento
      tension: 0, // Linha reta
    },

    /* ===== CURVAS SECUNDÁRIAS OCULTADAS A PEDIDO =====
    ,
    // CURVA 2: Modelo heurístico personalizado (linha tracejada azul)
    {
      label: "2. ε_eff Heurística Personalizada (Sua Tentativa)",
      data: data_tentativa,
      borderColor: "#17a2b8", // Cor: azul claro
      borderWidth: 2.5, // Grossa
      borderDash: [8, 4], // Tracejado
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    // CURVA 3: Modelo com tangente hiperbólica (linha tracejada laranja)
    {
      label: "3. ε_eff Tangente Hiperbólica",
      data: data_tanh,
      borderColor: "#fd7e14", // Cor: laranja
      borderWidth: 2, // Normal
      borderDash: [5, 5], // Tracejado médio
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    // CURVA 4: Modelo antigo com constante fixa (linha ponto-tracejada verde)
    {
      label: "4. ε_eff Exponencial Fixo 1.8",
      data: data_antiga,
      borderColor: "#28a745", // Cor: verde
      borderWidth: 2, // Normal
      borderDash: [3, 6], // Ponto-tracejado
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    // CURVA 5: Modelo média simples (linha tracejada azul escuro)
    {
      label: "5. ε_eff Média Clássica",
      data: data_media,
      borderColor: "#007bff", // Cor: azul escuro
      borderWidth: 2, // Normal
      borderDash: [2, 4], // Tracejado fino
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    // CURVA 6: Material puro sem correção (linha tracejada roxa)
    {
      label: "6. ε_eff = ε_r (Material Puro)",
      data: data_puro,
      borderColor: "#6f42c1", // Cor: roxa
      borderWidth: 2, // Normal
      borderDash: [1, 3], // Tracejado muito fino
      pointRadius: 0,
      fill: false,
      tension: 0,
    }
    ================================================= */
  ];

  // Se o usuário carregou dados do HFSS, adiciona uma curva extra ao gráfico
  if (hfssData && hfssData.length > 0) {
    // Adiciona os dados do HFSS como uma curva vermelha grossa para comparação
    datasets.push({
      label: "Ansys HFSS (Medição 3D)", // Dados da simulação 3D (referência)
      data: hfssPlotData, // Dados interpolados
      borderColor: "#dc3545", // Cor: vermelho
      borderWidth: 3, // Bem grossa para destacar
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  // ===== MARCADORES ESPECIAIS NO GRÁFICO =====

  // Cria um array com um único ponto vermelho onde está a frequência de ressonância
  const frPointData = labels.map(
    (_, idx) => (idx === minIndex ? data_nova[idx] : null), // Coloca um ponto no mínimo
  );
  // Adiciona o marcador da frequência de ressonância
  datasets.push({
    label: `fr = ${frFreq.toFixed(2)} GHz (Curva Principal)`, // Rótulo com frequência
    data: frPointData,
    borderColor: "#ff0000", // Cor: vermelho
    borderWidth: 3,
    pointRadius: 6, // Ponto grande
    pointBackgroundColor: "#ff0000", // Preenchimento vermelho
    showLine: false, // Apenas ponto, sem linha
  });

  // Se há um limite de frequência, marca com um triângulo laranja
  if (limitIndex !== -1) {
    // Cria um array com um único ponto no limite de frequência
    const limitPointData = labels.map((_, idx) =>
      idx === limitIndex ? data_nova[idx] : null,
    );
    // Adiciona o marcador do limite
    datasets.push({
      label: `Limite ECM (λ=p) em ${f_limit.toFixed(2)} GHz`, // Limite do modelo
      data: limitPointData,
      borderColor: "#ff8c00", // Cor: laranja
      pointRadius: 9, // Ponto grande
      pointStyle: "triangle", // Forma: triângulo
      showLine: false, // Apenas ponto
    });
  }

  // ===== CRIAÇÃO DO GRÁFICO =====
  // Cria um novo gráfico Chart.js com todas as configurações
  chart = new Chart(ctx, {
    type: "line", // Tipo: gráfico de linhas
    data: { labels, datasets }, // Dados: rótulos X e curvas
    options: {
      responsive: true, // Se adapta ao tamanho da janela
      maintainAspectRatio: false, // Permite altura customizável
      animation: false, // Sem animação (mais rápido)
      scales: {
        x: {
          ticks: { maxTicksLimit: 20 }, // Máximo 20 rótulos no eixo X
          title: { display: true, text: "Frequência (GHz)" }, // Título do eixo X
        },
        y: {
          min: -60, // Mínimo S21: -60 dB
          max: 0, // Máximo S21: 0 dB
          title: { display: true, text: "S21 (dB)" }, // Título do eixo Y
        },
      },
      plugins: {
        // Configurações dos rótulos da legenda
        legend: {
          labels: { font: { family: "Times New Roman" } }, // Fonte da legenda
        },
      },
    },
  });

  // ===== CAIXA DE INFORMAÇÕES ABAIXO DO GRÁFICO =====
  // Procura por uma caixa de informações existente
  let infoBox = document.getElementById("resonanceInfo");
  // Se não existe, cria uma nova
  if (!infoBox) {
    // Cria um novo elemento div
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo"; // Define um ID único
    // Estilos da caixa: margem, padding, fundo amarelo claro, bordas arredondadas
    infoBox.style.cssText =
      "margin-top: 10px; padding: 10px; background: #fdfd96; border-radius: 4px; font-size: 14px;";
    // Adiciona a caixa logo após o container do gráfico
    document.querySelector(".chart-container").after(infoBox);
  }

  // ===== CONTEÚDO DA CAIXA DE INFORMAÇÕES =====
  // Cria texto HTML com as informações principais
  let infoHtml = `<strong>Ressonância (Fator de Forma):</strong> ${frFreq.toFixed(2)} GHz | <strong style="color:#0056b3;">Fator (α) dinâmico aplicado: ${alpha.toFixed(2)}</strong> | <strong>ε_eff (Sua Tentativa):</strong> ${er_tentativa.toFixed(3)}`;

  // Se há dados do HFSS, adiciona uma mensagem de comparação
  if (hfssData && hfssData.length > 0) {
    infoHtml += `<br><span style="color:#dc3545; font-weight:bold;">Comparativo ativo: Avalie qual curva aproxima melhor a ressonância da Cruz no Ansys HFSS.</span>`;
  }

  // Se há um limite de frequência, adiciona um aviso
  if (limitIndex !== -1)
    infoHtml += `<br><small style="color:#d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo ECM perde precisão.</small>`;

  // Coloca o HTML na caixa
  infoBox.innerHTML = infoHtml;
}

// Função que exporta os dados dos gráficos para um arquivo CSV
// CSV é um formato de arquivo que pode ser aberto em Excel ou planilhas similares
function exportToCSV() {
  // Se não há gráfico, não há dados para exportar
  if (!chart) return;
  // Começa a criar o conteúdo CSV
  // \uFEFF é um marcador especial que indica a codificação UTF-8 com BOM
  // Exporta de forma limpa apenas o modelo principal (Costa)
  let csv =
    "\uFEFF" + // Marcador UTF-8
    "Frequência (GHz);S21 Modelo Costa (dB)\n";

  // Percorre cada frequência do gráfico
  chart.data.labels.forEach((freq, index) => {
    // Extrai os valores de S21 apenas da primeira curva do gráfico (Modelo Novo / Costa)
    let s21_nova = chart.data.datasets[0].data[index]; // Modelo novo

    // Converte para formato brasileiro (ponto por vírgula)
    // Isso é importante porque em alguns países usa-se vírgula como separador decimal
    let fBR = Number(freq).toFixed(3).replace(".", ","); // Frequência
    let sN_BR = Number(s21_nova).toFixed(4).replace(".", ","); // S21 novo

    // Adiciona uma linha no CSV com os valores separados por ponto-e-vírgula
    csv += `${fBR};${sN_BR}\n`;
  });

  // ===== CRIAÇÃO E DOWNLOAD DO ARQUIVO =====
  // Cria um "blob" (arquivo binário) com o conteúdo CSV
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  // Cria um link temporário para download
  const link = document.createElement("a");
  // Define o link para apontar para o arquivo blob
  link.href = URL.createObjectURL(blob);
  // Define o nome do arquivo a ser baixado
  link.download = "dados_cruz_jerusalem_modelo_costa.csv";
  // Simula um clique no link para iniciar o download
  link.click();
}
