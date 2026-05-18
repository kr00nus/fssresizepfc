// ==========================================
// SIMULADOR FSS - ANEL CIRCULAR (CIRCULAR RING)
// Baseado no Modelo de Circuito Equivalente de Langley e Parker (1985)
// ==========================================

import { mmToCm, FF, calcS21 } from "./math.js";

let ringChartInstance = null;
let ringHfssData = null;

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. AUTO-DETETOR DE IDs E INJEÇÃO INICIAL
  // ==========================================
  // Para o anel, a variável principal é o Raio (r) e a espessura (w)
  const defaultValues = {
    fStart: "1.0",
    fEnd: "15.0",
    p: "15.000",
    r_num: "6.000",   // Raio médio do anel
    w_num: "1.000",   // Espessura da fita metálica
    g_num: "3.000",   // Gap (calculado como p - 2r)
    h_sub: "1.52",
    er: "4.40",       // Padrão FR4
  };

  // Injeta valores iniciais
  for (const [key, value] of Object.entries(defaultValues)) {
    const numEl = document.getElementById(`${key.replace('_num', '')}_num`) || document.getElementById(key);
    const sliderEl = document.getElementById(`${key.replace('_num', '')}_slider`);
    if (numEl) numEl.value = value;
    if (sliderEl) sliderEl.value = value;
  }

  // ==========================================
  // 2. MOTOR DE CÁLCULO AUTOMÁTICO (Two-Way Binding)
  // Geometria do Anel: p = 2r + g  =>  g = p - 2r
  // ==========================================
  function handleGeometry(changed) {
    const pNum = document.getElementById("p_num");
    const rNum = document.getElementById("r_num");
    const gNum = document.getElementById("g_num");
    const rSlider = document.getElementById("r_slider");
    const gSlider = document.getElementById("g_slider");

    if (!pNum || !rNum || !gNum) return;

    let p = parseFloat(pNum.value) || 15;
    let r = parseFloat(rNum.value) || 6;
    let g = parseFloat(gNum.value) || 3;

    // Se alterou o Período ou o Raio, atualiza o Gap
    if (changed === "p" || changed === "r") {
      g = p - 2 * r;
      if (g <= 0) {
        g = 0.001; // Evita colisão total
        r = (p - g) / 2;
        rNum.value = r.toFixed(3);
        if (rSlider) rSlider.value = r.toFixed(3);
      }
      gNum.value = g.toFixed(3);
      if (gSlider) gSlider.value = g.toFixed(3);
    } 
    // Se alterou o Gap, atualiza o Raio
    else if (changed === "g") {
      r = (p - g) / 2;
      if (r <= 0) {
        r = 0.001;
        g = p - 2 * r;
        gNum.value = g.toFixed(3);
        if (gSlider) gSlider.value = g.toFixed(3);
      }
      rNum.value = r.toFixed(3);
      if (rSlider) rSlider.value = r.toFixed(3);
    }
  }

  function bindInputs(idPrefix) {
    const slider = document.getElementById(idPrefix + "_slider");
    const num = document.getElementById(idPrefix + "_num");
    if (!slider || !num) return;

    slider.addEventListener("input", (e) => {
      const decimals = ["fStart", "fEnd"].includes(idPrefix) ? 1 : ["er", "h_sub"].includes(idPrefix) ? 2 : 3;
      num.value = parseFloat(e.target.value).toFixed(decimals);
      handleGeometry(idPrefix);
      updateAll();
    });

    num.addEventListener("input", (e) => {
      slider.value = e.target.value;
      handleGeometry(idPrefix);
      updateAll();
    });
  }

  ["fStart", "fEnd", "p", "r", "w", "g", "h_sub", "er"].forEach(bindInputs);

  // ==========================================
  // LÓGICA DO SELETOR DE SUBSTRATO
  // ==========================================
  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    subSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      const isPreset = (val === "RO3003" || val === "RO3006");

      const erNum = document.getElementById("er_num");
      const erSlider = document.getElementById("er_slider");
      const hNum = document.getElementById("h_sub_num");
      const hSlider = document.getElementById("h_sub_slider");

      if (!isPreset) {
        if (erNum) erNum.disabled = false;
        if (erSlider) erSlider.disabled = false;
        if (hNum) hNum.disabled = false;
        if (hSlider) hSlider.disabled = false;
      } else {
        if (erNum) erNum.disabled = true;
        if (erSlider) erSlider.disabled = true;
        if (hNum) hNum.disabled = true;
        if (hSlider) hSlider.disabled = true;

        if (val === "RO3003") {
          if (erNum) erNum.value = "3.00";
          if (erSlider) erSlider.value = "3.00";
          if (hNum) hNum.value = "1.52";
          if (hSlider) hSlider.value = "1.52";
        } else if (val === "RO3006") {
          if (erNum) erNum.value = "6.50";
          if (erSlider) erSlider.value = "6.50";
          if (hNum) hNum.value = "1.28";
          if (hSlider) hSlider.value = "1.28";
        }
      }
      updateAll();
    });
    setTimeout(() => subSelect.dispatchEvent(new Event("change")), 50);
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

  updateAll();
});

function handleHFSSUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split("\n");
    ringHfssData = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        const freq = parseFloat(parts[0]);
        const s21 = parseFloat(parts[1]);
        if (!isNaN(freq) && !isNaN(s21)) {
          ringHfssData.push({ x: freq, y: s21 });
        }
      }
    }
    alert(`Dados do HFSS carregados com sucesso! (${ringHfssData.length} pontos encontrados)`);
    updateAll();
  };
  reader.readAsText(file);
}

// ==========================================
// FUNÇÃO VISUAL: DESENHAR O ANEL CIRCULAR
// ==========================================
function drawGeometry(p, r, w) {
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;

  ctx.clearRect(0, 0, size, size);

  const viewSize = p * 2.2;
  const scale = size / viewSize;
  const center = size / 2;

  const pPixel = p * scale;
  const rPixel = r * scale;
  const wPixel = w * scale;

  function drawSingleRing(cx, cy, isCenter) {
    ctx.beginPath();
    ctx.arc(cx, cy, rPixel, 0, 2 * Math.PI);
    // Para anéis, desenhamos um arco com espessura de linha correspondente a 'w'
    ctx.lineWidth = wPixel;
    ctx.strokeStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.25)";
    ctx.stroke();
  }

  // Grade 3x3
  const offsets = [-1, 0, 1];
  offsets.forEach((dx) => {
    offsets.forEach((dy) => {
      drawSingleRing(center + dx * pPixel, center + dy * pPixel, dx === 0 && dy === 0);
    });
  });

  // Linha tracejada da Célula Unitária (Período)
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]);
}

function getSafeValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el || isNaN(parseFloat(el.value))) return fallback;
  return parseFloat(el.value);
}

// ==========================================
// CÁLCULO PRINCIPAL
// ==========================================
function updateAll() {
  const fStart = getSafeValue("fStart_num", 1.0);
  const fEnd = getSafeValue("fEnd_num", 15.0);
  const p = getSafeValue("p_num", 15.0);
  let r = getSafeValue("r_num", 6.0);
  const w = getSafeValue("w_num", 1.0);
  const h_sub = getSafeValue("h_sub_num", 1.52);
  const er_real = getSafeValue("er_num", 4.4);

  if (fStart >= fEnd || p <= 0) return;

  // Trava de segurança: O diâmetro externo não pode ser maior que o período
  if (2 * r + w >= p) {
    r = (p - w) / 2 - 0.001;
    const el_r = document.getElementById("r_num");
    const el_r_slider = document.getElementById("r_slider");
    if (el_r) el_r.value = r.toFixed(3);
    if (el_r_slider) el_r_slider.value = r.toFixed(3);
  }

  // O Gap efetivo entre os centros de gravidade das fitas metálicas adjacentes
  const g = p - 2 * r;

  // FATOR DE FORMA (ALPHA) - O Anel atua como uma Espira, aplicamos o Alpha Dinâmico de Costa
  const ratio = w / p;
  let alpha = 16 - (ratio - 0.05) * ((16 - 12.5) / (0.25 - 0.05));
  alpha = Math.max(12.5, Math.min(16, alpha));

  const er_media = (er_real + 1) / 2;
  const er_nova = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));
  const er_tentativa = (er_media + er_nova) / 2; // Heurística simples
  const er_antiga = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const er_tanh = 1 + ((er_real - 1) / 2) * Math.tanh((Math.PI * h_sub) / p);
  const er_puro = er_real;

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_nova.toFixed(3);

  drawGeometry(p, r, w);

  // Arrays de dados
  const data_nova = [], data_tentativa = [], data_antiga = [], data_media = [], data_tanh = [], data_puro = [], labels = [];
  
  const pCm = mmToCm(p);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);
  const df = 0.001;
  const f_limit = 30 / pCm;

  // ========================================================
  // PRINCÍPIO DA EQUIVALÊNCIA DE LANGLEY E PARKER (1985)
  // O Anel comporta-se como uma espira de lado "d_eq"
  // ========================================================
  const rCm = mmToCm(r);
  const d_eq = (Math.PI * rCm) / 2;

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      // Fórmulas de Macfarlane usando d_equivalente
      const F_L = FF(pCm, 2 * wCm, lamb, ang);
      const F_C = FF(pCm, gCm, lamb, ang);

      const XL_base = (d_eq / pCm) * F_L;
      const C_base = 4 * (d_eq / pCm) * F_C;

      const calcPt = (er_val) => {
        const BC = er_val * C_base;
        const X_total = XL_base - (1 / BC);
        const B_norm = 1 / X_total;
        return calcS21(B_norm); // S21 = 4 / (4 + B_norm^2) em dB
      };

      labels.push(freq.toFixed(3));
      data_nova.push(Math.max(-60, calcPt(er_nova)));
      data_tentativa.push(Math.max(-60, calcPt(er_tentativa)));
      data_antiga.push(Math.max(-60, calcPt(er_antiga)));
      data_media.push(Math.max(-60, calcPt(er_media)));
      data_tanh.push(Math.max(-60, calcPt(er_tanh)));
      data_puro.push(Math.max(-60, calcPt(er_puro)));

    } catch (e) {
      data_nova.push(0); data_tentativa.push(0); data_antiga.push(0); data_media.push(0); data_tanh.push(0); data_puro.push(0);
    }
  }

  let hfssPlotData = [];
  if (ringHfssData && ringHfssData.length > 0) {
    let hfssIndex = 0;
    hfssPlotData = labels.map((labelStr) => {
      const f = parseFloat(labelStr);
      while (hfssIndex < ringHfssData.length - 1 && ringHfssData[hfssIndex].x < f) hfssIndex++;
      return Math.abs(ringHfssData[hfssIndex].x - f) < 0.005 ? ringHfssData[hfssIndex].y : null;
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
    labels, data_nova, data_tentativa, data_antiga, data_media, data_tanh, data_puro,
    hfssPlotData, limitIndex, f_limit, alpha
  );
}

function updateChart(
  labels, data_nova, data_tentativa, data_antiga, data_media, data_tanh, data_puro,
  hfssPlotData, limitIndex, f_limit, alpha
) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (ringChartInstance) ringChartInstance.destroy();

  const validData = limitIndex !== -1 ? data_nova.slice(0, limitIndex) : data_nova;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  // ===== DATASETS =====
  const datasets = [
    {
      label: "ε_eff Fator Forma Dinâmico (Modelo Langley/Costa)",
      data: data_nova,
      borderColor: "#000000",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
    }
    
    /* === OUTRAS FÓRMULAS OCULTADAS PARA CLAREZA VISUAL ===
    ,
    {
      label: "ε_eff Média Clássica",
      data: data_media,
      borderColor: "#007bff",
      borderWidth: 2,
      borderDash: [2, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "ε_eff Heurística Personalizada",
      data: data_tentativa,
      borderColor: "#17a2b8",
      borderWidth: 2.5,
      borderDash: [8, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    }
    ======================================================== */
  ];

  if (ringHfssData && ringHfssData.length > 0) {
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
    const frPointData = labels.map((_, idx) => idx === minIndex ? data_nova[idx] : null);
    datasets.push({
      label: `fr = ${frFreq.toFixed(2)} GHz (Ressonância)`,
      data: frPointData,
      borderColor: "#ff0000",
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: "#ff0000",
      showLine: false,
    });
  }

  if (limitIndex !== -1) {
    const limitPointData = labels.map((_, idx) => idx === limitIndex ? data_nova[idx] : null);
    datasets.push({
      label: `Limite ECM (λ=p) em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",
      pointRadius: 9,
      pointStyle: "triangle",
      showLine: false,
    });
  }

  ringChartInstance = new Chart(ctx, {
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

  let infoHtml = `<strong>Ressonância (Bloqueio):</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz | <strong style="color:#0056b3;">Fator (α) Dinâmico Aplicado: ${alpha.toFixed(3)}</strong>`;
  if (ringHfssData && ringHfssData.length > 0) {
    infoHtml += `<br><span style="color:#dc3545; font-weight:bold;">Comparativo ativo: Avalie qual curva aproxima melhor a ressonância do Anel no Ansys HFSS.</span>`;
  }
  if (limitIndex !== -1)
    infoHtml += `<br><small style="color:#d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo Analítico perde precisão.</small>`;
  infoBox.innerHTML = infoHtml;
}

function exportToCSV() {
  if (!ringChartInstance) return;
  
  // Cabeçalho limpo focando apenas na Fórmula de Langley/Costa
  let csv = "\uFEFF" + "Frequência (GHz);S21 Modelo Langley (dB)\n";
    
  ringChartInstance.data.labels.forEach((freq, index) => {
    let s21_nova = ringChartInstance.data.datasets[0].data[index];
    let fBR = Number(freq).toFixed(3).replace(".", ",");
    let sN_BR = Number(s21_nova).toFixed(4).replace(".", ",");
    csv += `${fBR};${sN_BR}\n`;
  });
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_anel_circular_modelo.csv";
  link.click();
}