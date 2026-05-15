// ==========================================
// SIMULADOR FSS - PATCH QUADRADO (BENCHMARK ANALÍTICO + HFSS)
// Interface de usuário e cálculos do gráfico
// ==========================================

import { mmToCm, FF, calcS21 } from "./math.js";

let patchChartInstance = null;
let patchHfssData = null;

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. AUTO-DETETOR DE IDs (Suporta HTML antigo da Espira)
  // ==========================================
  const id_c = document.getElementById("c_num") ? "c" : "d";
  const id_g = document.getElementById("g_num") ? "g" : "w";

  // ==========================================
  // 2. INJEÇÃO DE VALORES INICIAIS (Mata o erro de Null/NaN)
  // ==========================================
  const defaultValues = {
    fStart: "1.0",
    fEnd: "15.0",
    p: "15.000",
    [id_c]: "14.000", // Tamanho do Patch
    [id_g]: "1.000", // Gap
    h_sub: "1.52",
    er: "4.40", // Padrão FR4
  };

  // Preenche as caixas e sliders no HTML automaticamente
  for (const [key, value] of Object.entries(defaultValues)) {
    const numEl = document.getElementById(`${key}_num`);
    const sliderEl = document.getElementById(`${key}_slider`);
    if (numEl) numEl.value = value;
    if (sliderEl) sliderEl.value = value;
  }

  // ==========================================
  // 3. MOTOR DE CÁLCULO AUTOMÁTICO (Two-Way Binding)
  // ==========================================
  function handlePCG(changed) {
    const pNum = document.getElementById("p_num");
    const cNum = document.getElementById(id_c + "_num");
    const gNum = document.getElementById(id_g + "_num");
    const cSlider = document.getElementById(id_c + "_slider");
    const gSlider = document.getElementById(id_g + "_slider");

    if (!pNum || !cNum) return;

    let p = parseFloat(pNum.value) || 15;
    let c = parseFloat(cNum.value) || 14;

    if (changed === "p" || changed === id_c) {
      let g = p - c;
      if (g <= 0) g = 0.001;
      if (gNum) gNum.value = g.toFixed(3);
      if (gSlider) gSlider.value = g.toFixed(3);
    } else if (changed === id_g) {
      if (!gNum) return;
      let g = parseFloat(gNum.value) || 1;
      c = p - g;
      if (c <= 0) c = 0.001;
      cNum.value = c.toFixed(3);
      if (cSlider) cSlider.value = c.toFixed(3);
    }
  }

  function bindInputs(idPrefix) {
    const slider = document.getElementById(idPrefix + "_slider");
    const num = document.getElementById(idPrefix + "_num");
    if (!slider || !num) return;

    slider.addEventListener("input", (e) => {
      const decimals = ["fStart", "fEnd"].includes(idPrefix)
        ? 1
        : ["er", "h_sub"].includes(idPrefix)
          ? 2
          : 3;
      num.value = parseFloat(e.target.value).toFixed(decimals);
      handlePCG(idPrefix);
      updateAll();
    });

    num.addEventListener("input", (e) => {
      slider.value = e.target.value;
      handlePCG(idPrefix);
      updateAll();
    });
  }

  ["fStart", "fEnd", "p", id_c, id_g, "h_sub", "er"].forEach(bindInputs);

  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    subSelect.addEventListener("change", (e) => {
      if (e.target.value === "RO3003") {
        document.getElementById("er_num").value = "3.00";
        if (document.getElementById("er_slider"))
          document.getElementById("er_slider").value = "3.00";
        document.getElementById("h_sub_num").value = "1.52";
        if (document.getElementById("h_sub_slider"))
          document.getElementById("h_sub_slider").value = "1.52";
      } else if (e.target.value === "RO3006") {
        document.getElementById("er_num").value = "6.50";
        if (document.getElementById("er_slider"))
          document.getElementById("er_slider").value = "6.50";
        document.getElementById("h_sub_num").value = "1.28";
        if (document.getElementById("h_sub_slider"))
          document.getElementById("h_sub_slider").value = "1.28";
      }
      updateAll();
    });
  }

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

  // Aciona o primeiro cálculo com os valores padrão injetados
  updateAll();
});

function handleHFSSUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split("\n");
    patchHfssData = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        const freq = parseFloat(parts[0]);
        const s21 = parseFloat(parts[1]);
        if (!isNaN(freq) && !isNaN(s21)) {
          patchHfssData.push({ x: freq, y: s21 });
        }
      }
    }
    alert(
      `Dados do HFSS carregados com sucesso! (${patchHfssData.length} pontos encontrados)`,
    );
    updateAll();
  };
  reader.readAsText(file);
}

function drawGeometry(p, c) {
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;

  ctx.clearRect(0, 0, size, size);

  const viewSize = p * 2.2;
  const scale = size / viewSize;
  const center = size / 2;

  const pPixel = p * scale;
  const cPixel = c * scale;

  function drawSinglePatch(cx, cy, isCenter) {
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";
    ctx.fillRect(cx - cPixel / 2, cy - cPixel / 2, cPixel, cPixel);
  }

  const offsets = [-1, 0, 1];
  offsets.forEach((dx) => {
    offsets.forEach((dy) => {
      drawSinglePatch(
        center + dx * pPixel,
        center + dy * pPixel,
        dx === 0 && dy === 0,
      );
    });
  });

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]);
}

// Função auxiliar segura para buscar valores do HTML
function getSafeValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el || isNaN(parseFloat(el.value))) return fallback;
  return parseFloat(el.value);
}

function updateAll() {
  const id_c = document.getElementById("c_num") ? "c" : "d";
  const id_g = document.getElementById("g_num") ? "g" : "w";

  // Leitura blindada: se o elemento não existir ou falhar, usa um valor padrão
  const fStart = getSafeValue("fStart_num", 1.0);
  const fEnd = getSafeValue("fEnd_num", 15.0);
  const p = getSafeValue("p_num", 15.0);
  let c = getSafeValue(id_c + "_num", 14.0);
  const h_sub = getSafeValue("h_sub_num", 1.52);
  const er_real = getSafeValue("er_num", 4.4);

  if (fStart >= fEnd) return;

  if (c >= p) {
    c = p - 0.001;
    const el_c = document.getElementById(id_c + "_num");
    const el_c_slider = document.getElementById(id_c + "_slider");
    if (el_c) el_c.value = c.toFixed(3);
    if (el_c_slider) el_c_slider.value = c.toFixed(3);
  }

  const g = p - c;

  // O confinamento do patch sólido tende para Pi (3.14)
  const alpha = Math.PI;

  const er_media = (er_real + 1) / 2;
  const er_nova =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));
  const er_tentativa = (er_media + 3 * er_nova) / 4;
  const er_antiga =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const er_tanh = 1 + ((er_real - 1) / 2) * Math.tanh((Math.PI * h_sub) / p);
  const er_puro = er_real;

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_nova.toFixed(3);

  drawGeometry(p, c);

  const df = 0.001;
  const pCm = mmToCm(p);
  const gCm = mmToCm(g);

  const data_nova = [],
    data_tentativa = [],
    data_antiga = [],
    data_media = [],
    data_tanh = [],
    data_puro = [],
    labels = [];
  const f_limit = 30 / pCm;

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      // EQUAÇÃO 36 DA TESE (Transformada para B_patch)
      const B_base = 4 * FF(pCm, gCm, lamb, ang);

      const calcPt = (er_val) => {
        const B_patch = B_base * er_val;
        return calcS21(B_patch);
      };

      labels.push(freq.toFixed(3));

      const val_nova = calcPt(er_nova);
      data_nova.push(isNaN(val_nova) ? -60 : Math.max(-60, val_nova));
      data_tentativa.push(Math.max(-60, calcPt(er_tentativa)));
      data_antiga.push(Math.max(-60, calcPt(er_antiga)));
      data_media.push(Math.max(-60, calcPt(er_media)));
      data_tanh.push(Math.max(-60, calcPt(er_tanh)));
      data_puro.push(Math.max(-60, calcPt(er_puro)));
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
  if (patchHfssData && patchHfssData.length > 0) {
    let hfssIndex = 0;
    hfssPlotData = labels.map((labelStr) => {
      const f = parseFloat(labelStr);
      while (
        hfssIndex < patchHfssData.length - 1 &&
        patchHfssData[hfssIndex].x < f
      )
        hfssIndex++;
      return Math.abs(patchHfssData[hfssIndex].x - f) < 0.005
        ? patchHfssData[hfssIndex].y
        : null;
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
  if (patchChartInstance) patchChartInstance.destroy();

  const validData =
    limitIndex !== -1 ? data_nova.slice(0, limitIndex) : data_nova;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  const datasets = [
    {
      label: "1. ε_eff Fator Forma Fixo (Costa, Patch ≈ π)",
      data: data_nova,
      borderColor: "#000000",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
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
    },
  ];

  if (patchHfssData && patchHfssData.length > 0) {
    datasets.push({
      label: "Ansys HFSS (Medição 3D)",
      data: hfssPlotData,
      borderColor: "#dc3545",
      borderWidth: 3,
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  if (minIndex !== -1 && !isNaN(frFreq)) {
    const frPointData = labels.map((_, idx) =>
      idx === minIndex ? data_nova[idx] : null,
    );
    datasets.push({
      label: `fr = ${frFreq.toFixed(2)} GHz (Corte)`,
      data: frPointData,
      borderColor: "#ff0000",
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: "#ff0000",
      showLine: false,
    });
  }

  if (limitIndex !== -1) {
    const limitPointData = labels.map((_, idx) =>
      idx === limitIndex ? data_nova[idx] : null,
    );
    datasets.push({
      label: `Limite ECM (λ=p) em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",
      pointRadius: 9,
      pointStyle: "triangle",
      showLine: false,
    });
  }

  patchChartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
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

  let infoHtml = `<strong>Ressonância (Corte):</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz | <strong style="color:#0056b3;">Fator (α) Fixo Aplicado: ${alpha.toFixed(3)}</strong> | <strong>ε_eff (Sua Tentativa):</strong> ${er_tentativa.toFixed(3)}`;
  if (patchHfssData && patchHfssData.length > 0) {
    infoHtml += `<br><span style="color:#dc3545; font-weight:bold;">Comparativo ativo: Avalie qual curva aproxima melhor o corte do Patch no Ansys HFSS.</span>`;
  }
  if (limitIndex !== -1)
    infoHtml += `<br><small style="color:#d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo ECM perde precisão.</small>`;
  infoBox.innerHTML = infoHtml;
}

function exportToCSV() {
  if (!patchChartInstance) return;
  let csv =
    "\uFEFF" +
    "Frequência (GHz);S21 Nova (dB);S21 Tentativa (dB);S21 Tanh (dB);S21 Antiga (dB);S21 Media (dB);S21 Sem Correcao (dB)\n";
  patchChartInstance.data.labels.forEach((freq, index) => {
    let s21_nova = patchChartInstance.data.datasets[0].data[index];
    let s21_tentativa = patchChartInstance.data.datasets[1].data[index];
    let s21_tanh = patchChartInstance.data.datasets[2].data[index];
    let s21_antiga = patchChartInstance.data.datasets[3].data[index];
    let s21_media = patchChartInstance.data.datasets[4].data[index];
    let s21_puro = patchChartInstance.data.datasets[5].data[index];

    let fBR = Number(freq).toFixed(3).replace(".", ",");
    let sN_BR = Number(s21_nova).toFixed(4).replace(".", ",");
    let sTent_BR = Number(s21_tentativa).toFixed(4).replace(".", ",");
    let sT_BR = Number(s21_tanh).toFixed(4).replace(".", ",");
    let sA_BR = Number(s21_antiga).toFixed(4).replace(".", ",");
    let sM_BR = Number(s21_media).toFixed(4).replace(".", ",");
    let sP_BR = Number(s21_puro).toFixed(4).replace(".", ",");

    csv += `${fBR};${sN_BR};${sTent_BR};${sT_BR};${sA_BR};${sM_BR};${sP_BR}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_patch_quadrado_comparacao.csv";
  link.click();
}
