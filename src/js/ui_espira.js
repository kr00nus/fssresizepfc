// ==========================================
// SIMULADOR FSS - ESPIRA QUADRADA (BENCHMARK ANALÍTICO + HFSS)
// Interface de utilizador e atualização de gráficos
// ==========================================

import { mmToCm, FF } from "./math.js";

// Variável global para armazenar a instância do gráfico Chart.js e dados do HFSS
let chart = null;
let hfssData = null; // Armazenará os dados importados do Ansys HFSS

document.addEventListener("DOMContentLoaded", () => {
  function bindInputs(idPrefix) {
    const slider = document.getElementById(idPrefix + "_slider");
    const num = document.getElementById(idPrefix + "_num");
    if (!slider || !num) return;

    slider.addEventListener("input", (e) => {
      const decimals =
        idPrefix === "fStart" || idPrefix === "fEnd"
          ? 1
          : idPrefix === "er" || idPrefix === "h_sub"
            ? 2
            : 3;
      num.value = parseFloat(e.target.value).toFixed(decimals);
      updateAll();
    });

    num.addEventListener("input", (e) => {
      slider.value = e.target.value;
      updateAll();
    });
  }

  ["fStart", "fEnd", "p", "d", "w", "h_sub", "er"].forEach(bindInputs);

  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    subSelect.addEventListener("change", (e) => {
      if (e.target.value === "RO3003") {
        document.getElementById("er_num").value = "3.00";
        document.getElementById("er_slider").value = "3.00";
        document.getElementById("h_sub_num").value = "1.52";
        document.getElementById("h_sub_slider").value = "1.52";
      } else if (e.target.value === "RO3006") {
        document.getElementById("er_num").value = "6.50";
        document.getElementById("er_slider").value = "6.50";
        document.getElementById("h_sub_num").value = "1.28";
        document.getElementById("h_sub_slider").value = "1.28";
      }
      updateAll();
    });
  }

  // ==========================================
  // BOTÕES DE EXPORTAÇÃO E CARREGAMENTO (HFSS)
  // ==========================================
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToCSV);

    const hfssInput = document.createElement("input");
    hfssInput.type = "file";
    hfssInput.accept = ".csv";
    hfssInput.style.display = "none";
    hfssInput.addEventListener("change", handleHFSSUpload);

    const hfssBtn = document.createElement("button");
    hfssBtn.innerText = "Carregar Dados HFSS";
    hfssBtn.style.cssText =
      "margin-top: 10px; margin-left: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;";
    hfssBtn.onclick = () => hfssInput.click();

    exportBtn.parentNode.insertBefore(hfssInput, exportBtn.nextSibling);
    exportBtn.parentNode.insertBefore(hfssBtn, exportBtn.nextSibling);
  }

  updateAll();
});

// ==========================================
// FUNÇÃO: handleHFSSUpload()
// Lê o ficheiro CSV gerado pelo Ansys HFSS
// ==========================================
function handleHFSSUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split("\n");
    hfssData = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        const freq = parseFloat(parts[0]);
        const s21 = parseFloat(parts[1]);
        if (!isNaN(freq) && !isNaN(s21)) {
          hfssData.push({ x: freq, y: s21 });
        }
      }
    }

    alert(
      `Dados do HFSS carregados com sucesso! (${hfssData.length} pontos encontrados)`,
    );
    updateAll();
  };
  reader.readAsText(file);
}

function drawGeometry(p, d, w, g) {
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  const viewSize = p * 2.2;
  const scale = size / viewSize;
  const center = size / 2;
  const pPixel = p * scale;
  const dPixel = d * scale;
  const wPixel = w * scale;
  const innerPixel = Math.max(0, dPixel - 2 * wPixel);

  function drawSquareLoop(cx, cy, isCenter) {
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";
    ctx.fillRect(cx - dPixel / 2, cy - dPixel / 2, dPixel, dPixel);
    if (innerPixel > 0) {
      ctx.clearRect(
        cx - innerPixel / 2,
        cy - innerPixel / 2,
        innerPixel,
        innerPixel,
      );
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

  const neighbors = [
    { i: 0, j: -1 },
    { i: 0, j: 1 },
    { i: -1, j: 0 },
    { i: 1, j: 0 },
  ];
  neighbors.forEach((n) =>
    drawSquareLoop(center + n.i * pPixel, center + n.j * pPixel, false),
  );
  drawSquareLoop(center, center, true);

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]);
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
  // AS 5 FÓRMULAS DE PERMISSIVIDADE EFETIVA
  // =========================================

  // 1. Nova (Ajuste Exponencial Avançado: Costa, Alpha Dinâmico para Espiras)
  const er_nova =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));

  // 2. Antiga (Ajuste Exponencial Fixo Clássico: Munk, Alpha = 1.8)
  const er_antiga =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));

  // 3. Média (Ar-Dielétrico - Interface Semi-infinita)
  const er_media = (er_real + 1) / 2;

  // 4. Tangente Hiperbólica (Floquet clássico, mais adequado para patches sólidos)
  const er_tanh = 1 + ((er_real - 1) / 2) * Math.tanh((Math.PI * h_sub) / p);

  // 5. Material Puro (Ignora o Ar e a espessura. Assume bloco infinito do dielétrico)
  const er_puro = er_real;

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_nova.toFixed(3);

  drawGeometry(p, d, w, g);

  const df = 0.001;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);
  const Rs = 0.008;

  const data_nova = [];
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

      const BC_nova = 4 * er_nova * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_antiga = 4 * er_antiga * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_media = 4 * er_media * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_tanh = 4 * er_tanh * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_puro = 4 * er_puro * (dCm / pCm) * FF(pCm, gCm, lamb, ang);

      const X_nova = XL - 1 / BC_nova;
      const X_antiga = XL - 1 / BC_antiga;
      const X_media = XL - 1 / BC_media;
      const X_tanh = XL - 1 / BC_tanh;
      const X_puro = XL - 1 / BC_puro;

      const pt_nova =
        (Rs * Rs + X_nova * X_nova) / (Rs * Rs + X_nova * X_nova + Rs + 0.25);
      const pt_antiga =
        (Rs * Rs + X_antiga * X_antiga) /
        (Rs * Rs + X_antiga * X_antiga + Rs + 0.25);
      const pt_media =
        (Rs * Rs + X_media * X_media) /
        (Rs * Rs + X_media * X_media + Rs + 0.25);
      const pt_tanh =
        (Rs * Rs + X_tanh * X_tanh) / (Rs * Rs + X_tanh * X_tanh + Rs + 0.25);
      const pt_puro =
        (Rs * Rs + X_puro * X_puro) / (Rs * Rs + X_puro * X_puro + Rs + 0.25);

      labels.push(freq.toFixed(3));
      data_nova.push(Math.max(-60, 10 * Math.log10(pt_nova)));
      data_antiga.push(Math.max(-60, 10 * Math.log10(pt_antiga)));
      data_media.push(Math.max(-60, 10 * Math.log10(pt_media)));
      data_tanh.push(Math.max(-60, 10 * Math.log10(pt_tanh)));
      data_puro.push(Math.max(-60, 10 * Math.log10(pt_puro)));
    } catch (e) {
      data_nova.push(0);
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
    data_antiga,
    data_media,
    data_tanh,
    data_puro,
    hfssPlotData,
    limitIndex,
    f_limit,
    alpha,
  );
}

function updateChart(
  labels,
  data_nova,
  data_antiga,
  data_media,
  data_tanh,
  data_puro,
  hfssPlotData,
  limitIndex,
  f_limit,
  alpha,
) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (chart) chart.destroy();

  const validData =
    limitIndex !== -1 ? data_nova.slice(0, limitIndex) : data_nova;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  const datasets = [
    {
      label: "1. ε_eff Fator de Forma Dinâmico (Costa, Loop)",
      data: data_nova,
      borderColor: "#000000", // Preto (A principal)
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "2. ε_eff Tangente Hiperbólica (Floquet)",
      data: data_tanh,
      borderColor: "#fd7e14", // Laranja
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "3. ε_eff Exponencial Fixo 1.8 (Munk)",
      data: data_antiga,
      borderColor: "#28a745", // Verde
      borderWidth: 2,
      borderDash: [3, 6],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "4. ε_eff Média (Ar-Dielétrico)",
      data: data_media,
      borderColor: "#007bff", // Azul
      borderWidth: 2,
      borderDash: [2, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "5. ε_eff = ε_r (Sem correção de h)",
      data: data_puro,
      borderColor: "#6f42c1", // Roxo
      borderWidth: 2,
      borderDash: [1, 3],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
  ];

  if (hfssPlotData && hfssPlotData.length > 0) {
    datasets.push({
      label: "Ansys HFSS (Medição 3D)",
      data: hfssPlotData,
      borderColor: "#dc3545", // Vermelho
      borderWidth: 3,
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  const frPointData = labels.map((_, idx) =>
    idx === minIndex ? data_nova[idx] : null,
  );
  datasets.push({
    label: `fr = ${frFreq.toFixed(2)} GHz (Curva Principal)`,
    data: frPointData,
    borderColor: "#ff0000",
    borderWidth: 3,
    pointRadius: 6,
    pointBackgroundColor: "#ff0000",
    showLine: false,
  });

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

  chart = new Chart(ctx, {
    type: "line",
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          ticks: { maxTicksLimit: 20 },
          title: { display: true, text: "Frequência (GHz)" },
        },
        y: { min: -60, max: 0, title: { display: true, text: "S21 (dB)" } },
      },
      plugins: { legend: { labels: { font: { family: "Times New Roman" } } } },
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

function exportToCSV() {
  if (!chart) return;
  let csv =
    "\uFEFF" +
    "Frequência (GHz);S21 Nova (dB);S21 Tanh (dB);S21 Antiga (dB);S21 Media (dB);S21 Sem Correcao (dB)\n";
  chart.data.labels.forEach((freq, index) => {
    let s21_nova = chart.data.datasets[0].data[index];
    let s21_tanh = chart.data.datasets[1].data[index];
    let s21_antiga = chart.data.datasets[2].data[index];
    let s21_media = chart.data.datasets[3].data[index];
    let s21_puro = chart.data.datasets[4].data[index];

    let f_BR = Number(freq).toFixed(3).replace(".", ",");
    let sN_BR = Number(s21_nova).toFixed(4).replace(".", ",");
    let sT_BR = Number(s21_tanh).toFixed(4).replace(".", ",");
    let sA_BR = Number(s21_antiga).toFixed(4).replace(".", ",");
    let sM_BR = Number(s21_media).toFixed(4).replace(".", ",");
    let sP_BR = Number(s21_puro).toFixed(4).replace(".", ",");

    csv += `${f_BR};${sN_BR};${sT_BR};${sA_BR};${sM_BR};${sP_BR}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_espira_comparacao_completa.csv";
  link.click();
}
