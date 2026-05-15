// ==========================================
// SIMULADOR FSS - PATCH QUADRADO
// Interface de usuário e cálculos do gráfico
// ==========================================
// Este arquivo gerencia o simulador do Patch Quadrado (Square Patch FSS)
// Um patch quadrado é um pequeno quadrado de metal que funciona como FSS
// Diferente da Cruz e da Espira, o Patch não é um anel - é sólido
//
// Importa funções matemáticas e funções visuais compartilhadas
import { mmToCm, FF, GG } from "./math.js"; // Funções de cálculo eletromagnético
import { exportChartToCSV, createLineChart } from "./visual.js"; // Funções para gráficos

// Variável global que armazena a instância do gráfico Chart.js
let chart = null;

// Função que conecta um slider com um campo numérico
// Quando um é movido/editado, o outro é atualizado automaticamente
function bindInputs(idPrefix) {
  // Encontra os elementos HTML
  const slider = document.getElementById(idPrefix + "_slider");
  const num = document.getElementById(idPrefix + "_num");
  if (!slider || !num) return; // Se não encontrar, sai

  // Quando o slider é movido, atualiza o campo numérico
  slider.addEventListener("input", (e) => {
    // Formata com 2 casas decimais
    num.value = parseFloat(e.target.value).toFixed(2);
    updateAll(); // Recalcula tudo
  });

  // Quando o campo numérico é editado, atualiza o slider
  num.addEventListener("input", (e) => {
    slider.value = e.target.value;
    updateAll(); // Recalcula tudo
  });
}

// Função que aplica um preset (pré-configuração) de substrato
// Cada substrato tem valores padrão de permissividade (er) e altura (h_sub)
function applySubstratePreset(preset) {
  // Se selecionou RO3003: er=3.0, h_sub=1.52mm
  if (preset === "RO3003") {
    document.getElementById("er_num").value = 3.0;
    document.getElementById("h_sub_num").value = 1.52;
    document.getElementById("er_slider").value = 3.0;
    document.getElementById("h_sub_slider").value = 1.52;
  } else if (preset === "RO3006") {
    // Se selecionou RO3006: er=6.5, h_sub=1.28mm
    document.getElementById("er_num").value = 6.5;
    document.getElementById("h_sub_num").value = 1.28;
    document.getElementById("er_slider").value = 6.5;
    document.getElementById("h_sub_slider").value = 1.28;
  }
  updateAll(); // Recalcula com os novos valores
}

// Função que desenha os Patches Quadrados no canvas
// p = período (tamanho da célula)
// c = tamanho do patch (quadrado de metal)
function drawGeometry(p, c) {
  // Encontra o canvas onde vamos desenhar
  const canvas = document.getElementById("shapeCanvas");
  const ctx = canvas.getContext("2d"); // Contexto 2D para desenhar
  const size = canvas.width; // Tamanho em pixels

  // Limpa o canvas (apaga o que estava antes)
  ctx.clearRect(0, 0, size, size);

  // Define a área visível e a escala
  const viewSize = p * 2.2; // Um pouco maior que o período
  const scale = size / viewSize; // Quantos pixels por unidade
  const center = size / 2; // Centro do canvas
  const pPixel = p * scale; // Período em pixels
  const cPixel = c * scale; // Tamanho do patch em pixels
  // Array com as posições das 9 células (3x3 grid)
  const offsets = [-pPixel, 0, pPixel];

  // Função auxiliar que desenha um patch em uma posição
  function drawSinglePatch(offsetX, offsetY, fillColor) {
    // Calcula as posições da célula e do patch
    const cellLeft = center - pPixel / 2 + offsetX;
    const cellTop = center - pPixel / 2 + offsetY;
    const patchLeft = center - cPixel / 2 + offsetX;
    const patchTop = center - cPixel / 2 + offsetY;

    // Desenha a borda da célula em linha tracejada
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(153, 153, 153, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cellLeft, cellTop, pPixel, pPixel);
    ctx.setLineDash([]); // Remove o padrão tracejado

    // Desenha o patch (retângulo preenchido)
    ctx.fillStyle = fillColor; // Cor do patch
    ctx.fillRect(patchLeft, patchTop, cPixel, cPixel);
  }

  // Desenha uma grade 3x3 de patches
  offsets.forEach((dx) =>
    offsets.forEach((dy) =>
      drawSinglePatch(
        dx,
        dy,
        // Se é o patch central, cor mais escura; senoão, mais clara
        dx === 0 && dy === 0 ? "#003366" : "rgba(0, 51, 102, 0.12)",
      ),
    ),
  );

  // Configura o estilo para os rótulos (não estão sendo desenhados no código atual)
  ctx.fillStyle = "#000";
  ctx.font = "bold 13px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
}

// Função que atualiza o gráfico
// Calcula a frequência de ressonância (fr), largura de banda (BW) e marca no gráfico
function updateChart(labels, data) {
  // Obtém o contexto 2D do canvas do gráfico
  const ctx = document.getElementById("fssChart").getContext("2d");
  // Se há um gráfico anterior, o destroi
  if (chart) chart.destroy();

  // ===== Encontra a frequência de ressonância =====
  // A ressonância é onde o S21 está no mínimo
  const minIndex = data.indexOf(Math.min(...data));
  const frFreq = parseFloat(labels[minIndex]);
  const minValue = data[minIndex];
  // Define um threshold de -3dB da ressonância para calcular largura de banda
  const threshold = minValue + 3;

  // ===== Encontra a largura de banda (-3dB) =====
  // Procura a frequência mais baixa (-3dB)
  let fLower = null,
    fUpper = null;
  for (let i = minIndex; i >= 0; i--) {
    if (data[i] >= threshold) {
      fLower = i > 0 ? parseFloat(labels[i]) : parseFloat(labels[0]);
      break;
    }
  }
  // Procura a frequência mais alta (-3dB)
  for (let i = minIndex; i < data.length; i++) {
    if (data[i] >= threshold) {
      fUpper =
        i < data.length - 1
          ? parseFloat(labels[i])
          : parseFloat(labels[data.length - 1]);
      break;
    }
  }
  // Define valores padrão se não encontrar
  if (fLower === null) fLower = parseFloat(labels[0]);
  if (fUpper === null) fUpper = parseFloat(labels[data.length - 1]);
  // Calcula a largura de banda
  const bw = fUpper - fLower;

  let frIndex = minIndex;
  let lowerIndex = minIndex;
  for (let i = minIndex; i >= 0; i--) {
    if (
      Math.abs(parseFloat(labels[i]) - fLower) <
      Math.abs(parseFloat(labels[lowerIndex]) - fLower)
    ) {
      lowerIndex = i;
    }
  }
  let upperIndex = minIndex;
  for (let i = minIndex; i < data.length; i++) {
    if (
      Math.abs(parseFloat(labels[i]) - fUpper) <
      Math.abs(parseFloat(labels[upperIndex]) - fUpper)
    ) {
      upperIndex = i;
    }
  }

  const frPointData = labels.map((_, idx) =>
    idx === frIndex ? data[idx] : null,
  );
  const bwPointsData = labels.map((_, idx) =>
    idx === lowerIndex || idx === upperIndex ? data[idx] : null,
  );

  chart = createLineChart(
    ctx,
    labels,
    [
      {
        label: "Simulados (Patch Quadrado - Chen)",
        data: data,
        borderColor: "#000",
        borderWidth: 1.5,
      },
      {
        label: `fr = ${frFreq.toFixed(2)} GHz`,
        data: frPointData,
        borderColor: "#ff0000",
        borderWidth: 3,
        borderDash: [5, 5],
        pointRadius: 6,
        pointBackgroundColor: "#ff0000",
        pointBorderColor: "#ff0000",
        showLine: false,
      },
      {
        label: `BW = ${bw.toFixed(2)} GHz (-3dB)`,
        data: bwPointsData,
        borderColor: "#0066cc",
        borderWidth: 3,
        borderDash: [3, 3],
        pointRadius: 6,
        pointBackgroundColor: "#0066cc",
        pointBorderColor: "#0066cc",
        showLine: false,
      },
    ],
    { yTitle: "Potência Transmitida (dB)", yMin: -60, yMax: 0 },
  );

  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText =
      "margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 4px; font-family: 'Times New Roman'; font-size: 14px;";
    document
      .querySelector(".chart-container")
      .parentNode.insertBefore(
        infoBox,
        document.querySelector(".chart-container").nextSibling,
      );
  }
  infoBox.innerHTML = `<strong>Resonant Frequency (fr):</strong> ${frFreq.toFixed(2)} GHz | <strong>Bandwidth (BW):</strong> ${bw.toFixed(2)} GHz (${fLower.toFixed(2)} - ${fUpper.toFixed(2)} GHz)`;
}

// Função que trata o clique no botão de exportar
function exportToCSVHandler() {
  // Exporta os dados do gráfico para um arquivo CSV
  exportChartToCSV(chart, "dados_s21_patch_quadrado.csv");
}

// Função de inicialização chamada quando a página carrega
export function init() {
  // Conecta os sliders e campos numéricos para:
  // fStart = frequência inicial
  // fEnd = frequência final
  // p = período da célula
  // c = tamanho do patch
  ["fStart", "fEnd", "p", "c"].forEach(bindInputs);

  // Encontra o seletor de substrato
  const substrateSelect = document.getElementById("substrate_select");
  if (substrateSelect) {
    substrateSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      // Se selecionou "manual", habilita os campos de entrada
      if (val === "manual") {
        document.getElementById("er_num").removeAttribute("disabled");
        document.getElementById("h_sub_num").removeAttribute("disabled");
        document.getElementById("er_slider").removeAttribute("disabled");
        document.getElementById("h_sub_slider").removeAttribute("disabled");
      } else {
        // Se selecionou um preset, desabilita os campos e aplica o preset
        document.getElementById("er_num").setAttribute("disabled", "true");
        document.getElementById("h_sub_num").setAttribute("disabled", "true");
        document.getElementById("er_slider").setAttribute("disabled", "true");
        document
          .getElementById("h_sub_slider")
          .setAttribute("disabled", "true");
        applySubstratePreset(val);
      }
    });
  }

  // Encontra e configura o botão de exportar
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportToCSVHandler);

  // Executa uma atualização inicial
  updateAll();
}

// Função principal que atualiza todos os cálculos e gráficos
function updateAll() {
  // Lê os valores dos parâmetros do HTML
  const fStart = parseFloat(document.getElementById("fStart_num").value); // Frequência inicial
  const fEnd = parseFloat(document.getElementById("fEnd_num").value); // Frequência final
  let p = parseFloat(document.getElementById("p_num").value); // Período
  let c = parseFloat(document.getElementById("c_num").value); // Tamanho do patch

  // Valida os valores
  // Nota: fStart pode ser 0, mas fEnd deve ser > 0
  if (fEnd <= 0 || p <= 0 || c <= 0 || fStart >= fEnd) {
    if (chart) chart.destroy(); // Destroi o gráfico se existir
    return; // Sai da função
  }

  // Trava de segurança: o patch não pode ser tão grande quanto o período
  if (c >= p) {
    c = p - 0.01; // Reduz o patch
    document.getElementById("c_num").value = c.toFixed(2);
    document.getElementById("c_slider").value = c;
  }

  // Desenha a geometria no canvas
  drawGeometry(p, c);

  // Passo de frequência para o cálculo (0.001 GHz)
  const df = 0.001;

  // Converte os parâmetros para centímetros
  const a_cm = mmToCm(p); // Período em cm
  const c_cm = mmToCm(c); // Patch em cm

  // Arrays para armazenar os dados
  const data = []; // Valores de S21 em dB
  const labels = []; // Frequências em GHz

  // Loop que calcula S21 para cada frequência
  for (let freq = fStart; freq <= fEnd; freq += df) {
    // Calcula o comprimento de onda em cm
    const lamb = 30 / freq; // lamb = c / f = 30cm/ns / f(GHz)
    let pt_dB = -60; // Valor padrão (sinal méximo bloqueado)

    try {
      // Cálculos baseados no modelo de Chen para Patch Quadrado
      // Normaliza o comprimento de onda e o tamanho do patch em relação ao período
      const lamb_a = lamb / a_cm; // Comprimento de onda normalizado
      const c_a = c_cm / a_cm; // Tamanho do patch normalizado

      // O modelo é válido apenas quando lamb_a > 1 (frequência acima do corte)
      if (lamb_a > 1) {
        // Cálculo dos termos da fórmula de Chen
        const F1_sq = Math.pow(lamb_a, 2) - 1;
        const F1 = Math.sqrt(Math.abs(F1_sq));

        const pi_c_a = Math.PI * c_a;
        const denom_F2 = 1 - 2 * Math.pow(c_a, 2);
        const F2 = Math.cos(pi_c_a) / denom_F2;

        const F3 = pi_c_a !== 0 ? Math.sin(pi_c_a) / pi_c_a : 1;
        const F3_sq = Math.pow(F3, 2);

        const F4_sq = 2 * Math.pow(lamb_a, 2) - 1;

        // Cálculo de termos intermediários da fórmula
        const term_inv_F1_sq_minus_1 = 1 / Math.sqrt(Math.abs(F1_sq - 1));
        const term_F1_sq_minus_F3_sq = Math.sqrt(Math.abs(F1_sq - F3_sq));
        const term_inv_F4_sq_minus_1 = 1 / Math.sqrt(Math.abs(F4_sq - 1));

        // Calcula a susceptância B (parâmetro do modelo de Chen)
        const B =
          0.5 *
          F1 *
          F2 *
          term_inv_F1_sq_minus_1 *
          term_F1_sq_minus_F3_sq *
          term_inv_F4_sq_minus_1;

        // Calcula a potência transmitida (Pt) como fração linear
        const pt = 1 / (1 + Math.pow(B, 2));
        // Converte para decibéis (escala logarítmica)
        pt_dB = 10 * Math.log10(pt);
      } else {
        // Abaixo da frequência de corte, o sinal é bloqueado
        pt_dB = -60;
      }

      // Adiciona o ponto de dados
      labels.push(freq.toFixed(3));
      // Valida se o valor é um número válido e finito
      if (!isFinite(pt_dB) || pt_dB < -60) pt_dB = -60;
      data.push(pt_dB);
    } catch (e) {
      // Se houver erro no cálculo, adiciona -60 dB (sem sinal)
      data.push(-60);
    }
  }

  // Atualiza o gráfico com os dados calculados
  updateChart(labels, data);
}

// Auto-init
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init);
else init();

function exportToCSV() {
  if (!chart || !chart.data.labels.length) {
    alert("Nenhum dado disponível.");
    return;
  }

  // Cabeçalho da tabela
  let csv = "Frequência (GHz);S21 (dB)\n";

  chart.data.labels.forEach((freq, index) => {
    // Pega o valor de S21
    let s21 = chart.data.datasets[0].data[index];

    // O SEGREDO: Troca o PONTO por VÍRGULA para o Excel brasileiro ler como decimal!
    let freq_BR = String(freq).replace(".", ",");
    let s21_BR = Number(s21).toFixed(4).replace(".", ",");

    // Adiciona a linha na tabela (colunas separadas por ponto-e-vírgula)
    csv += `${freq_BR};${s21_BR}\n`;
  });

  // O "\uFEFF" (BOM) garante que o Excel leia os acentos (UTF-8) corretamente
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "dados_s21.csv"); // Nome do arquivo exportado
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
