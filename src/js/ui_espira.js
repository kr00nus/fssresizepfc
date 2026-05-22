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

import { mmToCm, FF, calcS21 } from "./math.js"; // Importa funções matemáticas compartilhadas

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
            : 3; // Outras dimensões: 3 casas
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

  // Encontra o seletor de substrato (material da PCB)
  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    // Quando o usuário muda o substrato
    subSelect.addEventListener("change", (e) => {
      // Se selecionou RO3003: permissividade 3.00 e altura 1.52mm
      if (e.target.value === "RO3003") {
        document.getElementById("er_num").value = "3.00";
        document.getElementById("er_slider").value = "3.00";
        document.getElementById("h_sub_num").value = "1.52";
        document.getElementById("h_sub_slider").value = "1.52";
      } else if (e.target.value === "RO3006") {
        // Se selecionou RO3006: permissividade 6.50 e altura 1.28mm
        document.getElementById("er_num").value = "6.50";
        document.getElementById("er_slider").value = "6.50";
        document.getElementById("h_sub_num").value = "1.28";
        document.getElementById("h_sub_slider").value = "1.28";
      }
      updateAll(); // Recalcula com os novos valores
    });
  }

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

  // Executa uma atualização inicial quando a página carrega
  updateAll();
});

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
  drawDimensions(ctx, center, pPixel, dPixel, wPixel, innerPixel, scale, p, d, w, g);
}

// ==========================================
// FUNÇÃO: drawDimensions()
// Desenha as setas e rótulos das dimensões (p, d, w, g) na geometria
// Todos os elementos são responsivos e se ajustam ao tamanho
// ==========================================
function drawDimensions(ctx, center, pPixel, dPixel, wPixel, innerPixel, scale, p, d, w, g) {
  // Configurações de tamanho responsivo
  const fontSize = Math.max(10, pPixel * 0.08); // Fonte se ajusta ao tamanho
  const arrowSize = Math.max(4, pPixel * 0.04); // Tamanho das setas
  const lineWidth = Math.max(1, pPixel * 0.01); // Espessura das linhas
  const offset = Math.max(20, pPixel * 0.12); // Distância dos rótulos

  ctx.strokeStyle = "#d32f2f";
  ctx.fillStyle = "#d32f2f";
  ctx.lineWidth = lineWidth;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ===== DIMENSÃO p (PERÍODO) - Horizontal (Embaixo) =====
  const pY = center + pPixel / 2 + offset + 5;
  drawArrowLine(ctx, center - pPixel / 2, pY, center + pPixel / 2, pY, arrowSize);
  ctx.fillText(`p = ${p.toFixed(3)} mm`, center, pY + offset * 0.6);

  // ===== DIMENSÃO d (DIÂMETRO DA ESPIRA) - Vertical (Lado Direito) =====
  const dX = center + dPixel / 2 + offset;
  drawArrowLine(ctx, dX, center - dPixel / 2, dX, center + dPixel / 2, arrowSize);
  ctx.save();
  ctx.translate(dX + offset * 0.5, center);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`d = ${d.toFixed(3)} mm`, 0, 0);
  ctx.restore();

  // ===== DIMENSÃO w (LARGURA DO FIO) - Diagonal/Canto Superior Esquerdo =====
  if (wPixel > 0) {
    const wStartX = center - dPixel / 2;
    const wStartY = center - dPixel / 2;
    const wEndX = center - dPixel / 2 + wPixel;
    const wEndY = center - dPixel / 2 + wPixel;
    
    // Desenha linha de dimensão
    ctx.strokeStyle = "#ff9800";
    ctx.fillStyle = "#ff9800";
    drawArrowLine(ctx, wStartX, wStartY, wEndX, wEndY, arrowSize * 0.8);
    
    // Rótulo da largura do fio
    ctx.fillStyle = "#ff9800";
    ctx.font = `bold ${fontSize * 0.9}px Arial, sans-serif`;
    const wMidX = (wStartX + wEndX) / 2 - offset * 0.4;
    const wMidY = (wStartY + wEndY) / 2 - offset * 0.4;
    ctx.fillText(`w = ${w.toFixed(3)} mm`, wMidX, wMidY);
  }

  // ===== DIMENSÃO g (GAP) - Horizontal (Dentro do quadrado) =====
  const gY = center; // Alinha com o centro verticalmente
  const gStartX = center - dPixel / 2 - wPixel;
  const gEndX = center - dPixel / 2;
  
  ctx.strokeStyle = "#2196f3";
  ctx.fillStyle = "#2196f3";
  drawArrowLine(ctx, gStartX - 5, gY + offset * 0.35, gEndX - 5, gY + offset * 0.35, arrowSize * 0.8);
  ctx.font = `bold ${fontSize * 0.85}px Arial, sans-serif`;
  ctx.fillText(`g = ${g.toFixed(3)} mm`, center - dPixel / 2 - wPixel / 2 - offset * 0.8, gY + offset * 0.8);

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
  ctx.lineTo(fromX - headlen * Math.cos(angle - Math.PI / 6), fromY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(fromX - headlen * Math.cos(angle + Math.PI / 6), fromY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  // Desenha a seta no final
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
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
      label: "ε_eff Fator Forma Dinâmico (Costa)",
      data: data_nova,
      borderColor: "#000000",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
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
      label: "Ansys HFSS (Medição 3D)",
      data: hfssPlotData,
      borderColor: "#dc3545", // Vermelho
      borderWidth: 3, // Linha mais grossa para se destacar
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  // ===== Marca a frequência de ressonância com um ponto =====
  const frPointData = labels.map((_, idx) =>
    idx === minIndex ? data_nova[idx] : null,
  );
  datasets.push({
    label: `fr = ${frFreq.toFixed(2)} GHz`,
    data: frPointData,
    borderColor: "#ff0000",
    borderWidth: 3,
    pointRadius: 6,
    pointBackgroundColor: "#ff0000",
    showLine: false,
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
          title: { display: true, text: "Frequência (GHz)" },
        },
        y: {
          min: -60,
          max: 0,
          title: { display: true, text: "S21 (dB)" },
        },
      },
      plugins: {
        legend: {
          labels: { font: { family: "Times New Roman" } },
        },
      },
    },
  });

  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText =
      "margin-top: 10px; padding: 10px; background: #fdfd96; border-radius: 4px; font-size: 14px;";
    document.querySelector(".chart-container").after(infoBox);
  }

  let infoHtml = `<strong>Ressonância (Fator de Forma):</strong> ${frFreq.toFixed(2)} GHz | <strong style="color:#0056b3;">Fator (α) dinâmico aplicado: ${alpha.toFixed(2)}</strong>`;

  if (hfssData && hfssData.length > 0) {
    infoHtml += `<br><span style="color:#dc3545; font-weight:bold;">Comparativo ativo: Avalie qual curva aproxima melhor a ressonância do Ansys HFSS.</span>`;
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
