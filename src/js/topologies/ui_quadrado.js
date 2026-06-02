// ==========================================
// SIMULADOR FSS - PATCH QUADRADO (BENCHMARK ANALÍTICO + HFSS)
// Interface de usuário e cálculos do gráfico
// ==========================================

import { mmToCm } from "../core/math.js";
import { initSubstrateSelector } from "../common/substrate-selector.js";

let patchChartInstance = null;
let patchHfssData = null;

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. AUTO-DETETOR DE IDs (Suporta HTML antigo da Espira)
  // ==========================================
  const id_c = document.getElementById("c_num") ? "c" : "d";
  const id_g = document.getElementById("g_num") ? "g" : "w";

  // ==========================================
  // 2. INJEÇÃO DE VALORES INICIAIS
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

  // ==========================================
  // SELETOR DE SUBSTRATO CENTRALIZADO
  // ==========================================
  initSubstrateSelector(() => updateAll());
  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
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

function getSafeValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el || isNaN(parseFloat(el.value))) return fallback;
  return parseFloat(el.value);
}

// ========================================================
// MOTOR MATEMÁTICO COMPLEXO (Para o Modelo de Cascata Dielétrica)
// ========================================================
const C = {
  add: (A, B) => ({ r: A.r + B.r, i: A.i + B.i }),
  sub: (A, B) => ({ r: A.r - B.r, i: A.i - B.i }),
  mul: (A, B) => ({ r: A.r * B.r - A.i * B.i, i: A.r * B.i + A.i * B.r }),
  div: (A, B) => {
    const den = B.r * B.r + B.i * B.i;
    return {
      r: (A.r * B.r + A.i * B.i) / den,
      i: (A.i * B.r - A.r * B.i) / den,
    };
  },
  exp: (A) => {
    const ea = Math.exp(A.r);
    return { r: ea * Math.cos(A.i), i: ea * Math.sin(A.i) };
  },
  abs: (A) => Math.sqrt(A.r * A.r + A.i * A.i),
  fromReal: (x) => ({ r: x, i: 0 }),
};

// ========================================================
// FÓRMULAS APROXIMADAS DE Ycap DO E-BOOK (Páginas 120-123)
// ========================================================

// 1. Fórmula de Chen (Página 121)
function calcChen(a, c_patch, l) {
  let l_a_sq = Math.pow(l / a, 2);
  if (l_a_sq <= 1) return 1e6; // Frequência acima do limite (Grating Lobes)

  let f1 = Math.sqrt(l_a_sq - 1);
  let x = c_patch / a;
  let f2;
  if (Math.abs(x - 0.5) < 1e-5) {
    f2 = Math.pow(Math.PI / 4, 2);
  } else {
    f2 = Math.pow(Math.cos(Math.PI * x) / (1 - 4 * x * x), 2);
  }
  let f3 = x < 1e-5 ? 1 : Math.pow(Math.sin(Math.PI * x) / (Math.PI * x), 2);
  let f4 = Math.sqrt(Math.max(0, 2 * l_a_sq - 1));

  if (f1 < 1e-5) return 1e6;

  let den = f1 * f2 - (1 / f1) * f3 + (f4 - 1 / f4) * f2 * f3;
  if (Math.abs(den) < 1e-6) return 1e6;
  return 0.5 / den; // Retorna magnitude de ycap
}

// 2. Fórmula de Lee e Zarrillo (Página 123)
function calcLee(a, c_patch, l) {
  let d = (a - c_patch) / 2;
  let b = (1 - 0.41 * (d / a)) / (a / l);
  if (Math.abs(b * b - 1) < 1e-5) return 1e6;
  return (
    (b * Math.log(1 / Math.sin((Math.PI * d) / (2 * a)))) /
    ((b * b - 1) * (a / c_patch + 0.5 * Math.pow(a / l, 2)))
  );
}

// 3. Fórmula de Ulrich (Página 120)
function calcUlrich(a, c_patch, l) {
  let d = (a - c_patch) / 2;
  let b = (1 - 0.27 * (d / a)) / (a / l);
  if (Math.abs(b * b - 1) < 1e-5) return 1e6;
  return (b * Math.log(1 / Math.sin((Math.PI * d) / (2 * a)))) / (b * b - 1);
}

// 4. Fórmula de Arnaud et al. (Página 122)
function calcArnaud(a, c_patch, l) {
  let d = (a - c_patch) / 2;
  return 2 * (a / l) * Math.log(1 / Math.sin((Math.PI * d) / a));
}

// ========================================================
// CASCATEAMENTO DIELÉTRICO DE LINHA DE TRANSMISSÃO (Pág. 125)
// ========================================================
function cascadeDielectric(ycap_mag, freq, er, h_sub_cm) {
  if (isNaN(ycap_mag) || !isFinite(ycap_mag)) return -60;

  // Coeficientes do anteparo metálico
  let t1 = C.div(C.fromReal(1), { r: 1, i: ycap_mag });
  let r1 = C.sub(t1, C.fromReal(1)); // R1 = T1 - 1

  // Propriedades do meio
  let l = 30 / freq;
  let k = (2 * Math.PI) / l;
  let kl = k * Math.sqrt(er);
  let r_val = (1 - Math.sqrt(er)) / (1 + Math.sqrt(er));

  // Fatores de fase exponencial
  let exp1 = C.exp({ r: 0, i: (k - kl) * h_sub_cm });
  let exp2 = C.exp({ r: 0, i: -2 * kl * h_sub_cm });
  let exp3 = C.exp({ r: 0, i: k * h_sub_cm });

  // Coeficientes do dielétrico
  let num_t2 = C.mul(C.fromReal(1 - r_val * r_val), exp1);
  let den_t2 = C.sub(C.fromReal(1), C.mul(C.fromReal(r_val * r_val), exp2));
  let t2 = C.div(num_t2, den_t2);

  let num_r2 = C.mul(
    C.fromReal(r_val),
    C.mul(C.sub(C.fromReal(1), exp2), exp3),
  );
  let r2 = C.div(num_r2, den_t2);

  // Combinação FSS + Dielétrico
  let num_tf = C.mul(t1, t2);
  let den_tf = C.sub(C.fromReal(1), C.mul(r1, r2));
  let tf = C.div(num_tf, den_tf);

  // Potência Final (dB)
  let ct = C.abs(tf);
  if (ct === 0) return -60;
  let pt_dB = 10 * Math.log10(ct * ct);
  return Math.max(-60, pt_dB);
}

function updateAll() {
  const id_c = document.getElementById("c_num") ? "c" : "d";
  const id_g = document.getElementById("g_num") ? "g" : "w";

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

  drawGeometry(p, c);

  // Arrays de dados
  const data_chen = [],
    data_lee = [],
    data_ulrich = [],
    data_arnaud = [],
    labels = [];

  const pCm = mmToCm(p);
  const cCm = mmToCm(c);
  const h_sub_cm = mmToCm(h_sub);
  const f_limit = 30 / pCm;
  const df = 0.001;

  for (let freq = fStart; freq <= fEnd; freq += df) {
    let l = 30 / freq;
    labels.push(freq.toFixed(3));

    try {
      // 1. Chen (A Mais Precisa)
      let ycap_chen = calcChen(pCm, cCm, l);
      let pt_chen = cascadeDielectric(ycap_chen, freq, er_real, h_sub_cm);
      data_chen.push(pt_chen);

      // 2. Lee e Zarrillo
      let ycap_lee = calcLee(pCm, cCm, l);
      let pt_lee = cascadeDielectric(ycap_lee, freq, er_real, h_sub_cm);
      data_lee.push(pt_lee);

      // 3. Ulrich
      let ycap_ulrich = calcUlrich(pCm, cCm, l);
      let pt_ulrich = cascadeDielectric(ycap_ulrich, freq, er_real, h_sub_cm);
      data_ulrich.push(pt_ulrich);

      // 4. Arnaud
      let ycap_arnaud = calcArnaud(pCm, cCm, l);
      let pt_arnaud = cascadeDielectric(ycap_arnaud, freq, er_real, h_sub_cm);
      data_arnaud.push(pt_arnaud);
    } catch (e) {
      data_chen.push(-60);
      data_lee.push(-60);
      data_ulrich.push(-60);
      data_arnaud.push(-60);
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
    data_chen,
    data_lee,
    data_ulrich,
    data_arnaud,
    hfssPlotData,
    limitIndex,
    f_limit,
  );
}

function updateChart(
  labels,
  data_chen,
  data_lee,
  data_ulrich,
  data_arnaud,
  hfssPlotData,
  limitIndex,
  f_limit,
) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (patchChartInstance) patchChartInstance.destroy();

  const validData =
    limitIndex !== -1 ? data_chen.slice(0, limitIndex) : data_chen;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  // ===== DATASETS =====
  const datasets = [
    {
      label: "Fórmula de Chen (Mais Precisa)",
      data: data_chen,
      borderColor: "#000000",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
    },

    /* === OUTRAS FÓRMULAS DO LIVRO (PÁG 120-123) OCULTADAS ===
    ,
    {
      label: "Fórmula de Lee e Zarrillo",
      data: data_lee,
      borderColor: "#007bff",
      borderWidth: 2,
      borderDash: [2, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "Fórmula de Ulrich",
      data: data_ulrich,
      borderColor: "#28a745",
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "Fórmula de Arnaud et al.",
      data: data_arnaud,
      borderColor: "#fd7e14",
      borderWidth: 2,
      borderDash: [8, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    }
    ======================================================== */
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
      idx === minIndex ? data_chen[idx] : null,
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
      idx === limitIndex ? data_chen[idx] : null,
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

  // === CÁLCULO DA BANDA DE -10 dB PARA ECM ===
  let f_low = null;
  let f_high = null;
  let idx_low = -1;
  let idx_high = -1;
  for (let i = 0; i < data_chen.length; i++) {
    if (data_chen[i] <= -10) {
      if (f_low === null) { f_low = parseFloat(labels[i]); idx_low = i; }
      f_high = parseFloat(labels[i]);
      idx_high = i;
    }
  }
  let bw = f_low !== null ? (f_high - f_low).toFixed(2) : "-";

  if (idx_low !== -1 && idx_high !== -1) {
    const bwPointData = labels.map((_, idx) =>
      (idx === idx_low || idx === idx_high) ? data_chen[idx] : null
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

  // === CÁLCULO DA BANDA E FR DO HFSS ===
  let hfss_fr = null;
  let hfss_bw = "-";
  if (patchHfssData && patchHfssData.length > 0) {
    let minS21 = Infinity;
    let minFreq = null;
    let h_low = null;
    let h_high = null;

    for (let i = 0; i < patchHfssData.length; i++) {
      const pt = patchHfssData[i];
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

  let infoHtml = `<strong>Ressonância (Corte):</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz <br> <strong>Banda (-10 dB):</strong> ${bw} GHz <br> <strong style="color:#0056b3;">Modelo Analítico: Fórmulas Aproximadas (Livro pág. 120-126)</strong>`;
  if (patchHfssData && patchHfssData.length > 0) {
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
    
    infoHtml += `<br><br><span style="color:#dc3545; font-weight:bold;">Dados Ansys HFSS:</span><br>
                 <strong>Ressonância HFSS:</strong> ${hfss_fr !== null ? hfss_fr.toFixed(2) : "-"} GHz <span style="color:#e65100; font-weight:bold; margin-left:8px;">${frErrorHtml}</span><br>
                 <strong>Banda HFSS (-10 dB):</strong> ${hfss_bw} GHz <span style="color:#e65100; font-weight:bold; margin-left:8px;">${bwErrorHtml}</span>`;
  }
  if (limitIndex !== -1)
    infoHtml += `<br><small style="color:#d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo ECM perde precisão.</small>`;
  infoBox.innerHTML = infoHtml;
}

function exportToCSV() {
  if (!patchChartInstance) return;

  // Cabeçalho limpo focando apenas na Fórmula de Chen (Curva visível)
  let csv = "\uFEFF" + "Frequência (GHz);S21 Fórmula de Chen (dB)\n";

  patchChartInstance.data.labels.forEach((freq, index) => {
    // Extrai o valor S21 apenas do primeiro dataset
    let s21_chen = patchChartInstance.data.datasets[0].data[index];

    let fBR = Number(freq).toFixed(3).replace(".", ",");
    let sC_BR = Number(s21_chen).toFixed(4).replace(".", ",");

    csv += `${fBR};${sC_BR}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_patch_quadrado_modelo_chen.csv";
  link.click();
}
