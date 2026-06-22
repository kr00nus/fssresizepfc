// ==========================================
// SIMULADOR FSS - ESPIRA QUADRADA (BENCHMARK ANALÍTICO + HFSS)
// Interface de usuário e atualização de gráficos
// ==========================================
// Este arquivo gerencia o simulador da Espira Quadrada (Square Loop FSS)
// Uma espira quadrada é um laço quadrado de fio metálico que funciona como FSS
// O arquivo controla:
//   - Entrada de dados do usuário (sliders, campos numéricos)
//   - Desenho da geometria (visualização 2D da espira)
//   - Cálculos do comportamento eletromagnético
//   - Gráficos mostrando S21 em diferentes frequências
//   - Export/import de dados para comparação com HFSS

import { mmToCm, FF, calcS21 } from "../core/math.js"; // Importa funções matemáticas compartilhadas
import { initSubstrateSelector } from "../common/substrate-selector.js"; // Seletor de substrato centralizado
import { drawCircuitEspira } from "../common/circuit-diagram.js"; // Circuito equivalente visual
import { initParametricAnalysis } from "../common/parametric-analysis.js"; // Análise paramétrica

// Variável global que armazena a instância do gráfico Chart.js
let chart = null;
// Variável global que armazena dados importados do software HFSS (simulação 3D de referência)
let hfssData = null; // Array com pontos {x: frequência, y: valor de S21} do HFSS

// Evento que executa quando a página HTML foi completamente carregada
document.addEventListener("DOMContentLoaded", () => {
  // Função que conecta um controle deslizante (slider) com um campo numérico
  // Quando o usuário muda um valor em um, o outro é atualizado automaticamente
  function bindInputs(idPrefix) {
    // Encontra os elementos HTML do slider e do campo numérico
    const slider = document.getElementById(idPrefix + "_slider");
    const num = document.getElementById(idPrefix + "_num");
    if (!slider || !num) return; // Se não encontrar, sai da função

    // Quando o slider é movido
    slider.addEventListener("input", (e) => {
      // Define quantas casas decimais cada parâmetro deve ter
      const decimals =
        idPrefix === "fStart" || idPrefix === "fEnd"
          ? 1 // Frequências: 1 casa decimal
          : idPrefix === "er" || idPrefix === "h_sub"
            ? 2 // Permissividade e altura: 2 casas
            : 1; // Outras dimensões: 1 casa
      // Copia o valor do slider para o campo numérico com as casas corretas
      num.value = parseFloat(e.target.value).toFixed(decimals);
      updateAll(); // Recalcula tudo
    });

    // Quando o campo numérico é editado
    num.addEventListener("input", (e) => {
      // Copia o valor do campo numérico para o slider
      slider.value = e.target.value;
      updateAll(); // Recalcula tudo
    });
  }

  // Conecta todos os parâmetros:
  // fStart = frequência inicial (GHz)
  // fEnd = frequência final (GHz)
  // p = período da célula (mm)
  // d = diâmetro/comprimento da espira (mm)
  // w = largura do fio da espira (mm)
  // h_sub = altura do substrato (mm)
  // er = constante dielétrica do material
  ["fStart", "fEnd", "p", "d", "w", "h_sub", "er"].forEach(bindInputs);

  // Seletor de substrato centralizado
  initSubstrateSelector(() => updateAll());

  // ===== BOTÕES DE EXPORTAÇÃO E CARREGAMENTO =====
  // Encontra o botão de exportar
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    // Ao clicar em exportar, salva os dados em CSV
    exportBtn.addEventListener("click", exportToCSV);

    // Cria um input invisível para selecionar arquivo CSV
    const hfssInput = document.createElement("input");
    hfssInput.type = "file";
    hfssInput.accept = ".csv"; // Aceita apenas CSV
    hfssInput.style.display = "none"; // Esconde o elemento
    hfssInput.addEventListener("change", handleHFSSUpload); // Quando arquivo é selecionado

    // Cria um botão visual que parece um botão normal
    const hfssBtn = document.createElement("button");
    hfssBtn.innerText = "Carregar Dados HFSS";
    hfssBtn.style.cssText =
      "margin-top: 10px; margin-left: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;";
    hfssBtn.onclick = () => hfssInput.click(); // Ao clicar, abre o seletor de arquivo

    // Adiciona os elementos à página
    exportBtn.parentNode.insertBefore(hfssInput, exportBtn.nextSibling);
    exportBtn.parentNode.insertBefore(hfssBtn, exportBtn.nextSibling);
  }

  // Inicializa a Análise Paramétrica
  initParametricAnalysis({
    topologyName: "Espira Quadrada",
    parameters: [
      { id: "p", name: "Período (p)" },
      { id: "d", name: "Diâmetro/Tamanho (d)" },
      { id: "w", name: "Largura do fio (w)" },
      { id: "h_sub", name: "Espessura do Substrato (h_sub)" },
      { id: "er_real", name: "Constante Dielétrica (er)" }
    ],
    getCurrentState: getCurrentState,
    calculateS21: calculateS21Espira,
    calculateLC: calculateLCEspira
  });

  // Executa uma atualização inicial quando a página carrega
  updateAll();
});

function getCurrentState() {
  return {
    fStart: parseFloat(document.getElementById("fStart_num").value),
    fEnd: parseFloat(document.getElementById("fEnd_num").value),
    p: parseFloat(document.getElementById("p_num").value),
    d: parseFloat(document.getElementById("d_num").value),
    w: parseFloat(document.getElementById("w_num").value),
    h_sub: parseFloat(document.getElementById("h_sub_num").value),
    er_real: parseFloat(document.getElementById("er_num").value)
  };
}

export function calculateS21Espira(state) {
  let { fStart, fEnd, p, d, w, h_sub, er_real } = state;
  // Regra de validação base do modelo
  if (d >= p) {
    d = p - 0.001;
  }
  const df = 0.005; // Passo um pouco maior na análise paramétrica para velocidade
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(p - d);

  const ratio = w / p;
  let alpha = 16 - (ratio - 0.05) * ((16 - 12.5) / (0.25 - 0.05));
  alpha = Math.max(12.5, Math.min(16, alpha));
  const er_nova = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));

  const curve = [];
  const f_limit = 30 / pCm; // grating lobe limit
  const calcEnd = Math.min(fEnd, f_limit - 0.1); // Não calcula além do limite físico

  for (let freq = fStart; freq <= calcEnd; freq += df) {
    const lamb = 30 / freq;
    const XL = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, 0);
    const C_base = 4 * (dCm / pCm) * FF(pCm, gCm, lamb, 0);
    const BC_nova = er_nova * C_base;
    const X_nova = XL - 1 / BC_nova;
    
    let s21 = -60;
    try {
      s21 = Math.max(-60, calcS21(1 / X_nova));
    } catch(e) {}
    
    curve.push({ f: freq, s21: s21 });
  }
  return curve;
}

function calculateLCEspira(state, fr) {
  let { p, d, w, h_sub, er_real } = state;
  if (d >= p) d = p - 0.001;

  const Z0 = 376.73;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(p - d);

  const ratio = w / p;
  let alpha = 16 - (ratio - 0.05) * ((16 - 12.5) / (0.25 - 0.05));
  alpha = Math.max(12.5, Math.min(16, alpha));
  const er_nova = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));

  // Se fr não foi fornecido, encontrar a fr da curva S21
  if (!fr || !isFinite(fr)) {
    const curve = calculateS21Espira(state);
    let minS21 = 0;
    for (const pt of curve) {
      if (pt.s21 < minS21) { minS21 = pt.s21; fr = pt.f; }
    }
    if (!fr) fr = 30 / (2 * dCm * Math.sqrt(er_nova)); // fallback
  }

  const lamb = 30 / fr;
  const omega = 2 * Math.PI * fr * 1e9;

  const XL = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, 0);
  const C_base = 4 * (dCm / pCm) * FF(pCm, gCm, lamb, 0);
  const BC = er_nova * C_base;

  const L_nH = ((XL * Z0) / omega) * 1e9;
  const C_pF = (BC / (omega * Z0)) * 1e12;

  return { L_nH, C_pF };
}

// ==========================================
// FUNÇÃO: handleHFSSUpload()
// Lê o arquivo CSV gerado pelo software Ansys HFSS
// Esta função permite carregar dados de simulação 3D para comparação
// ==========================================
function handleHFSSUpload(event) {
  // Obtém o arquivo selecionado
  const file = event.target.files[0];
  if (!file) return; // Se nada foi selecionado, sai

  // Cria um leitor de arquivo
  const reader = new FileReader();
  reader.onload = (e) => {
    // Obtém o conteúdo do arquivo como texto
    const text = e.target.result;
    // Divide em linhas
    const lines = text.split("\n");
    // Inicializa array vazio para dados
    hfssData = [];

    // Percorre cada linha (começando da linha 1 para pular o cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Pula linhas vazias
      const parts = lines[i].split(","); // Divide por vírgula
      if (parts.length >= 2) {
        const freq = parseFloat(parts[0]); // Primeira coluna: frequência
        const s21 = parseFloat(parts[1]); // Segunda coluna: S21
        // Valida que são números válidos
        if (!isNaN(freq) && !isNaN(s21)) {
          hfssData.push({ x: freq, y: s21 }); // Adiciona o ponto de dados
        }
      }
    }

    // Mostra uma mensagem com quantos pontos foram carregados
    alert(
      `Dados do HFSS carregados com sucesso! (${hfssData.length} pontos encontrados)`,
    );
    updateAll(); // Atualiza os gráficos
  };
  reader.readAsText(file); // Lê o arquivo como texto
}

// ==========================================
// FUNÇÃO: drawGeometry()
// Desenha a Espira Quadrada e suas repetições no canvas com dimensões
// Parâmetros responsivos que se ajustam ao tamanho do canvas
// ==========================================
function drawGeometry(p, d, w, g) {
  // Encontra o canvas (elemento onde vamos desenhar)
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return; // Se não existir, sai
  // Obtém o contexto 2D para desenhar
  const ctx = canvas.getContext("2d");
  const size = canvas.width; // Tamanho do canvas em pixels

  // Limpa o canvas (apaga o que estava antes)
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, size, size);

  // Define a área visível e a escala
  const viewSize = p * 2.2; // Um pouco maior que o período
  const scale = size / viewSize; // Quantos pixels por unidade
  const center = size / 2; // Centro do canvas
  const pPixel = p * scale; // Período em pixels
  const dPixel = d * scale; // Diâmetro da espira em pixels
  const wPixel = w * scale; // Largura do fio em pixels
  // Calcula o tamanho interno (furo) da espira
  const innerPixel = Math.max(0, dPixel - 2 * wPixel);

  // Função auxiliar que desenha uma espira quadrada em uma posição (cx, cy)
  function drawSquareLoop(cx, cy, isCenter) {
    // Cor: azul escuro para central, azul claro para vizinhas
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";
    // Desenha o quadrado exterior (fio da espira)
    ctx.fillRect(cx - dPixel / 2, cy - dPixel / 2, dPixel, dPixel);
    // Se há um furo interno
    if (innerPixel > 0) {
      // Apaga o furo (deixa transparente)
      ctx.clearRect(
        cx - innerPixel / 2,
        cy - innerPixel / 2,
        innerPixel,
        innerPixel,
      );
      // Se não é a central, preenche o furo com cor de fundo
      if (!isCenter) {
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(
          cx - innerPixel / 2,
          cy - innerPixel / 2,
          innerPixel,
          innerPixel,
        );
      }
    }
  }

  // Posições das 4 espiras vizinhas (acima, abaixo, esquerda, direita)
  const neighbors = [
    { i: 0, j: -1 }, // Acima
    { i: 0, j: 1 }, // Abaixo
    { i: -1, j: 0 }, // À esquerda
    { i: 1, j: 0 }, // À direita
  ];
  // Desenha cada vizinha com cor mais clara
  neighbors.forEach((n) =>
    drawSquareLoop(center + n.i * pPixel, center + n.j * pPixel, false),
  );
  // Desenha a espira central com cor mais escura
  drawSquareLoop(center, center, true);

  // ===== Desenha a linha tracejada do período =====
  ctx.setLineDash([5, 5]); // Define o padrão tracejado
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)"; // Cor preta semitransparente
  ctx.lineWidth = 1; // Espessura da linha
  // Desenha um quadrado tracejado mostrando a célula unitária
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]); // Remove o padrão tracejado

  // ===== DESENHA DIMENSÕES COM SETAS E RÓTULOS =====
  drawDimensions(
    ctx,
    center,
    pPixel,
    dPixel,
    wPixel,
    innerPixel,
    scale,
    p,
    d,
    w,
    g,
  );
}

// ==========================================
// FUNÇÃO: drawDimensions()
// Desenha as setas e rótulos das dimensões (p, d, w, g) na geometria
// Todos os elementos são responsivos e se ajustam ao tamanho
// ==========================================
function drawDimensions(
  ctx,
  center,
  pPixel,
  dPixel,
  wPixel,
  innerPixel,
  scale,
  p,
  d,
  w,
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
  drawArrowLine(ctx, pX, pStartY, pX, pEndY, arrowSize);

  // Rótulo de p posicionado à esquerda
  ctx.fillStyle = "#d32f2f";
  ctx.font = `bold ${fontSize * 0.9}px Arial, sans-serif`;
  ctx.save();
  ctx.translate(pX - offset * 0.4, center);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`p = ${p.toFixed(3)} mm`, 0, 0);
  ctx.restore();

  // ===== DIMENSÃO d (DIÂMETRO DA ESPIRA) - HORIZONTAL (TOPO) =====
  ctx.strokeStyle = "#cc0000";
  ctx.fillStyle = "#cc0000";

  const dStartX = center - dPixel / 2;
  const dEndX = center + dPixel / 2;
  const dY = center - pPixel / 2 - offset;

  // Seta HORIZONTAL mostrando d no topo
  drawArrowLine(ctx, dStartX, dY, dEndX, dY, arrowSize);

  ctx.font = `bold ${fontSize * 0.85}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`d = ${d.toFixed(3)} mm`, center, dY - offset * 0.4);

  // ===== DIMENSÃO w (LARGURA DO FIO) - Vertical (Lado Esquerdo do Fio) =====
  if (wPixel > 0) {
    ctx.strokeStyle = "#ff9800";
    ctx.fillStyle = "#ff9800";

    const wX = center - dPixel / 2 - offset * 0.3;
    const wStartY = center - dPixel / 2;
    const wEndY = center - dPixel / 2 + wPixel;

    // Seta mostrando w (parte do fio)
    drawArrowLine(ctx, wX, wStartY, wX, wEndY, arrowSize * 0.8);

    ctx.font = `bold ${fontSize * 0.8}px Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(
      `w = ${w.toFixed(3)} mm`,
      wX - offset * 0.15,
      wStartY + wPixel / 2,
    );
  }

  // ===== DIMENSÃO g (GAP) - Horizontal (Espaço entre espiras) =====
  ctx.strokeStyle = "#2196f3";
  ctx.fillStyle = "#2196f3";

  const gPixel = (pPixel - dPixel) / 2; // Espaço vazio de cada lado
  const gStartX = center + dPixel / 2;
  const gEndX = center + pPixel / 2;
  const gY = center + offset * 0.5;

  // Seta mostrando g
  drawArrowLine(ctx, gStartX, gY, gEndX, gY, arrowSize * 0.8);

  ctx.font = `bold ${fontSize * 0.8}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    `g = ${g.toFixed(3)} mm`,
    center + dPixel / 2 + gPixel / 2,
    gY + offset * 0.4,
  );

  // ===== LEGENDA COM CORES =====
  drawLegend(ctx, fontSize);
}

// ==========================================
// FUNÇÃO: drawArrowLine()
// Desenha uma linha com setas nas duas extremidades
// Utilizado para indicar as dimensões na geometria
// ==========================================
function drawArrowLine(ctx, fromX, fromY, toX, toY, arrowSize) {
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
// FUNÇÃO: drawLegend()
// Desenha uma legenda com as cores usadas nas dimensões
// ==========================================
function drawLegend(ctx, fontSize) {
  const canvas = ctx.canvas;
  const legendX = 10;
  const legendY = canvas.height - 50;
  const boxWidth = 200;
  const boxHeight = 50;

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
  ctx.fillText("d=diâmetro", legendX + 25, legendY + 32);

  // Cor w (laranja)
  ctx.fillStyle = "#ff9800";
  ctx.fillRect(legendX + 110, legendY + 8, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("w=fio", legendX + 127, legendY + 14);

  // Cor g (azul)
  ctx.fillStyle = "#2196f3";
  ctx.fillRect(legendX + 110, legendY + 26, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("g=gap", legendX + 127, legendY + 32);
}

function updateAll() {
  const fStart = parseFloat(document.getElementById("fStart_num").value);
  const fEnd = parseFloat(document.getElementById("fEnd_num").value);
  const p = parseFloat(document.getElementById("p_num").value);
  let d = parseFloat(document.getElementById("d_num").value);
  const w = parseFloat(document.getElementById("w_num").value);
  const h_sub = parseFloat(document.getElementById("h_sub_num").value);
  const er_real = parseFloat(document.getElementById("er_num").value);

  if (
    fStart <= 0 ||
    fEnd <= 0 ||
    p <= 0 ||
    d <= 0 ||
    w <= 0 ||
    er_real <= 0 ||
    fStart >= fEnd
  ) {
    if (chart) chart.destroy();
    return;
  }

  if (d >= p) {
    d = p - 0.001;
    document.getElementById("d_num").value = d.toFixed(3);
  }

  const g = p - d;
  const gEl = document.getElementById("g_num");
  if (gEl) gEl.value = g.toFixed(3);

  // =========================================
  // FATOR DE FORMA DINÂMICO (ALPHA) - COSTA (2020)
  // =========================================
  const ratio = w / p;
  let alpha = 16 - (ratio - 0.05) * ((16 - 12.5) / (0.25 - 0.05));
  alpha = Math.max(12.5, Math.min(16, alpha));

  // =========================================
  // AS 6 FÓRMULAS DE PERMISSIVIDADE EFETIVA
  // =========================================

  const er_media = (er_real + 1) / 2;
  const er_nova =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));
  const delta = (er_media + er_nova) / 2;
  const er_tentativa = (delta + er_nova) / 2;
  const er_antiga =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const er_tanh = 1 + ((er_real - 1) / 2) * Math.tanh((Math.PI * h_sub) / p);
  const er_puro = er_real;

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_nova.toFixed(3);

  drawGeometry(p, d, w, g);

  const df = 0.001;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);

  const data_nova = [];
  const data_tentativa = [];
  const data_antiga = [];
  const data_media = [];
  const data_tanh = [];
  const data_puro = [];
  const labels = [];
  const f_limit = 30 / pCm;

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      const XL = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);

      const C_base = 4 * (dCm / pCm) * FF(pCm, gCm, lamb, ang);

      const BC_nova = er_nova * C_base;
      const BC_tentativa = er_tentativa * C_base;
      const BC_antiga = er_antiga * C_base;
      const BC_media = er_media * C_base;
      const BC_tanh = er_tanh * C_base;
      const BC_puro = er_puro * C_base;

      const X_nova = XL - 1 / BC_nova;
      const X_tentativa = XL - 1 / BC_tentativa;
      const X_antiga = XL - 1 / BC_antiga;
      const X_media = XL - 1 / BC_media;
      const X_tanh = XL - 1 / BC_tanh;
      const X_puro = XL - 1 / BC_puro;

      labels.push(freq.toFixed(3));
      data_nova.push(Math.max(-60, calcS21(1 / X_nova)));
      data_tentativa.push(Math.max(-60, calcS21(1 / X_tentativa)));
      data_antiga.push(Math.max(-60, calcS21(1 / X_antiga)));
      data_media.push(Math.max(-60, calcS21(1 / X_media)));
      data_tanh.push(Math.max(-60, calcS21(1 / X_tanh)));
      data_puro.push(Math.max(-60, calcS21(1 / X_puro)));
    } catch (e) {
      data_nova.push(0);
      data_tentativa.push(0);
      data_antiga.push(0);
      data_media.push(0);
      data_tanh.push(0);
      data_puro.push(0);
    }
  }

  let hfssPlotData = [];
  if (hfssData && hfssData.length > 0) {
    let hfssIndex = 0;
    hfssPlotData = labels.map((labelStr) => {
      const f = parseFloat(labelStr);
      while (hfssIndex < hfssData.length - 1 && hfssData[hfssIndex].x < f) {
        hfssIndex++;
      }
      if (Math.abs(hfssData[hfssIndex].x - f) < 0.005) {
        return hfssData[hfssIndex].y;
      }
      return null;
    });
  }

  let limitIndex = -1;
  for (let i = 0; i < labels.length; i++) {
    if (parseFloat(labels[i]) >= f_limit) {
      limitIndex = i;
      break;
    }
  }

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
    const XL_r = (dCm / pCm) * FF(pCm, 2 * wCm, lamb_r, 0);
    const C_base_r = 4 * (dCm / pCm) * FF(pCm, gCm, lamb_r, 0);
    const BC_r = er_nova * C_base_r;
    const X_total_r = XL_r - 1 / BC_r;
    const B_norm_r = 1 / X_total_r;

    const fmt = (v) => v.toFixed(4);
    const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setVal("val_XL", `${fmt(XL_r)} @ ${frFreq.toFixed(2)} GHz`);
    setVal("val_BC1", `${fmt(BC_r)} (×ε_eff)`);
    setVal("val_Zseries", `${fmt(X_total_r)}`);
    setVal("val_Yshunt", `${fmt(B_norm_r)}`);
    setVal("val_erEff", `${er_nova.toFixed(4)}`);

    // Desenha o circuito equivalente visual
    drawCircuitEspira({
      XL: fmt(XL_r),
      BC: fmt(BC_r),
      Xtotal: fmt(X_total_r),
      Bnorm: fmt(B_norm_r),
    });
  }

  // === MODELO FÍSICO: L & C EQUIVALENTE ===
  // Usa a fr REAL do gráfico (mínimo da curva S21) para desnormalizar
  // XL e BC em L (nH) e C (pF). Assim fr = 1/(2π√LC) é sempre consistente.
  if (!isNaN(frFreq) && frFreq > 0) {
    const Z0 = 376.73;
    const lamb_lc = 30 / frFreq;
    const omega_lc = 2 * Math.PI * frFreq * 1e9;

    const XL_lc = (dCm / pCm) * FF(pCm, 2 * wCm, lamb_lc, 0);
    const C_base_lc = 4 * (dCm / pCm) * FF(pCm, gCm, lamb_lc, 0);
    const BC_lc = er_nova * C_base_lc;

    const L_total_nH = ((XL_lc * Z0) / omega_lc) * 1e9;
    const C_total_pF = ((BC_lc) / (omega_lc * Z0)) * 1e12;

    const setLCVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setLCVal("val_L_total", L_total_nH.toFixed(4));
    setLCVal("val_C_total", C_total_pF.toFixed(4));
  }
}

// Função que atualiza o gráfico com os dados calculados
function updateChart(
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
) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (chart) chart.destroy();

  const validData =
    limitIndex !== -1 ? data_nova.slice(0, limitIndex) : data_nova;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  // ===== DATASETS (Curvas Ocultadas por Comentário) =====
  const datasets = [
    {
      // Curva 1: Fator de Forma Dinâmico (Costa) - PRINCIPAL MANTIDA
      label: "Resposta em Frequência S21",
      data: data_nova,
      borderColor: "#000000",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
      pointStyle: "rect",
    },

    /* === CURVAS SECUNDÁRIAS OCULTADAS A PEDIDO ===
    ,
    {
      label: "2. ε_eff Heurística Personalizada (Sua Tentativa)",
      data: data_tentativa,
      borderColor: "#17a2b8",
      borderWidth: 2.5,
      borderDash: [8, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "3. ε_eff Tangente Hiperbólica",
      data: data_tanh,
      borderColor: "#fd7e14",
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "4. ε_eff Exponencial Fixo 1.8",
      data: data_antiga,
      borderColor: "#28a745",
      borderWidth: 2,
      borderDash: [3, 6],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "5. ε_eff Média Clássica",
      data: data_media,
      borderColor: "#007bff",
      borderWidth: 2,
      borderDash: [2, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "6. ε_eff = ε_r (Material Puro)",
      data: data_puro,
      borderColor: "#6f42c1",
      borderWidth: 2,
      borderDash: [1, 3],
      pointRadius: 0,
      fill: false,
      tension: 0,
    }
    ================================================= */
  ];

  // ===== Adiciona dados do HFSS (se carregados) =====
  if (hfssPlotData && hfssPlotData.length > 0) {
    datasets.push({
      label: "Ansys HFSS",
      data: hfssPlotData,
      borderColor: "#dc3545", // Vermelho
      borderWidth: 3, // Linha mais grossa para se destacar
      pointRadius: 0,
      fill: false,
      tension: 0,
      pointStyle: "rect",
    });
  }

  // ===== Marca a frequência de ressonância com um ponto =====
  const frPointData = labels.map((_, idx) =>
    idx === minIndex ? data_nova[idx] : null,
  );
  datasets.push({
    label: `fr (Ressonância ECM) = ${frFreq.toFixed(2)} GHz`,
    data: frPointData,
    borderColor: "#ff0000",
    borderWidth: 3,
    pointRadius: 6,
    pointBackgroundColor: "#ff0000",
    showLine: false,
    pointStyle: "circle",
  });

  // ===== Marca o limite de difração (se existe) =====
  if (limitIndex !== -1) {
    const limitPointData = labels.map((_, idx) =>
      idx === limitIndex ? data_nova[idx] : null,
    );
    datasets.push({
      label: `Limite de Difração em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",
      pointRadius: 9,
      pointStyle: "triangle",
      showLine: false,
    });
  }

  // === CÁLCULO DA BANDA DE -10 dB ===
  let f_low = null;
  let f_high = null;
  let idx_low = -1;
  let idx_high = -1;
  for (let i = 0; i < data_nova.length; i++) {
    if (data_nova[i] <= -10) {
      if (f_low === null) { f_low = parseFloat(labels[i]); idx_low = i; }
      f_high = parseFloat(labels[i]);
      idx_high = i;
    }
  }
  let bw = f_low !== null ? (f_high - f_low).toFixed(2) : "-";

  if (idx_low !== -1 && idx_high !== -1) {
    const bwPointData = labels.map((_, idx) =>
      (idx === idx_low || idx === idx_high) ? data_nova[idx] : null
    );
    datasets.push({
      label: `BW (-10 dB) = ${bw} GHz`,
      data: bwPointData,
      borderColor: "#805ad5",
      borderWidth: 2,
      pointRadius: 5,
      pointBackgroundColor: "#805ad5",
      showLine: false,
      pointStyle: "circle",
    });
  }

  // ===== Cria o gráfico Chart.js =====
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          ticks: { maxTicksLimit: 20 },
          title: { display: true, text: "Frequência (GHz)", font: { weight: "bold" } },
        },
        y: {
          min: -60,
          max: 0,
          title: { display: true, text: "S21 (dB)", font: { weight: "bold" } },
        },
      },
      plugins: {
        legend: {
          labels: {
            font: { family: "Arial", size: 13 },
            usePointStyle: true,
          },
        },
      },
    },
  });

  // === CÁLCULO DA BANDA E FR DO HFSS ===
  let hfss_fr = null;
  let hfss_bw = "-";
  if (hfssData && hfssData.length > 0) {
    let minS21 = Infinity;
    let minFreq = null;
    let h_low = null;
    let h_high = null;

    for (let i = 0; i < hfssData.length; i++) {
      const pt = hfssData[i];
      if (pt.y < minS21) {
        minS21 = pt.y;
        minFreq = pt.x;
      }
      if (pt.y <= -10) {
        if (h_low === null) h_low = pt.x;
        h_high = pt.x;
      }
    }
    hfss_fr = minFreq;
    if (h_low !== null && h_high !== null) {
      hfss_bw = (h_high - h_low).toFixed(2);
    }
  }

  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText =
      "margin-top: 15px; padding: 12px; background: #e6fffa; border-radius: 6px; font-size: 14px; border-left: 5px solid #38a169;";
    document.querySelector(".chart-container").after(infoBox);
  }

  const qFactor = (bw !== "-" && parseFloat(bw) > 0 && !isNaN(frFreq)) ? (frFreq / parseFloat(bw)).toFixed(2) : "-";
  let infoHtml = `<strong>Ressonância ECM (Band-Stop):</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz <br> <strong>Banda (-10 dB):</strong> ${bw} GHz <br> <strong>Fator de Qualidade (Q):</strong> ${qFactor}`;

  if (hfssData && hfssData.length > 0) {
    let frErrorHtml = "";
    if (hfss_fr !== null && !isNaN(frFreq)) {
      const err = Math.abs(frFreq - hfss_fr) / hfss_fr * 100;
      frErrorHtml = `(Erro: ${err.toFixed(2)}%)`;
    }
    let bwErrorHtml = "";
    if (hfss_bw !== "-" && bw !== "-") {
      const err = Math.abs(parseFloat(bw) - parseFloat(hfss_bw)) / parseFloat(hfss_bw) * 100;
      bwErrorHtml = `(Erro: ${err.toFixed(2)}%)`;
    }
    let qErrorHtml = "";
    let hfss_qFactor = "-";
    if (hfss_fr !== null && hfss_bw !== "-" && parseFloat(hfss_bw) > 0) {
      hfss_qFactor = (hfss_fr / parseFloat(hfss_bw)).toFixed(2);
      if (qFactor !== "-") {
         const errQ = Math.abs(parseFloat(qFactor) - parseFloat(hfss_qFactor)) / parseFloat(hfss_qFactor) * 100;
         qErrorHtml = `(Erro: ${errQ.toFixed(2)}%)`;
      }
    }
    
    infoHtml += `<br><br><span style="color:#dc3545; font-weight:bold;">Dados Ansys HFSS:</span><br>
                 <strong>Ressonância HFSS:</strong> ${hfss_fr !== null ? hfss_fr.toFixed(2) : "-"} GHz <span style="color:#e65100; font-weight:bold; margin-left:8px;">${frErrorHtml}</span><br>
                 <strong>Banda HFSS (-10 dB):</strong> ${hfss_bw} GHz <span style="color:#e65100; font-weight:bold; margin-left:8px;">${bwErrorHtml}</span><br>
                 <strong>Fator de Qualidade HFSS (Q):</strong> ${hfss_qFactor} <span style="color:#e65100; font-weight:bold; margin-left:8px;">${qErrorHtml}</span>`;
  }

  if (limitIndex !== -1) {
    infoHtml += `<br><small style="color: #d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo analítico perde precisão.</small>`;
  }

  infoBox.innerHTML = infoHtml;
}

// Função que exporta os dados do gráfico para arquivo CSV
function exportToCSV() {
  if (!chart) return;

  // Cabeçalho simplificado para exportar apenas a curva de Costa e HFSS (se houver)
  let csv = "\uFEFF" + "Frequência (GHz);S21 Modelo Costa (dB)\n";

  chart.data.labels.forEach((freq, index) => {
    // Pega APENAS o valor S21 do modelo de Costa (que é sempre o dataset 0)
    let s21_nova = chart.data.datasets[0].data[index];

    // Converte para formato brasileiro (ponto por vírgula)
    let f_BR = Number(freq).toFixed(3).replace(".", ",");
    let sN_BR = Number(s21_nova).toFixed(4).replace(".", ",");

    // Adiciona uma linha no CSV com ponto-e-vírgula como separador
    csv += `${f_BR};${sN_BR}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_espira_modelo_costa.csv";
  link.click();
}
