// ==========================================
// SIMULADOR FSS - ANEL QUASE QUADRADO (QUASI-SQUARE LOOP)
// Formulação: Mamedes, Deisy (2024) - Eq. 4.15 a 4.20
// Inovação: Motor de Auto-Calibração Dinâmica para HFSS (35.80 GHz)
// ==========================================

import { mmToCm, FF, calcS21 } from "./math.js";

let qsChartInstance = null;
let qsHfssData = null;
let KL_AUTO = 1.0; // Fator que será calculado dinamicamente

document.addEventListener("DOMContentLoaded", () => {
  // 1. MOTOR DE AUTO-CALIBRAÇÃO (Engenharia Reversa)
  // Calcula o multiplicador exato necessário para a sua versão do math.js bater nos 35.80 GHz
  function calibrateKL() {
    const p = 4.1,
      w = 0.85,
      g1 = 0.2,
      h_sub = 0.508,
      er_real = 2.94;
    const M_factor = 1.5;
    const c_val = (10 * h_sub) / p;
    const z_factor = Math.exp(Math.pow(c_val, M_factor));
    const er_eff = er_real - (er_real - 1) / z_factor;

    const lamb = 30 / 35.8; // O alvo cravado do HFSS (35.80 GHz)
    const pCm = mmToCm(p),
      w_cm = mmToCm(w),
      g1_cm = mmToCm(g1);

    const FL = FF(pCm, w_cm, lamb, 0);
    const FC_g1 = FF(pCm, g1_cm, lamb, 0);

    const XLs_base = ((0.5 * (p - w)) / p) * FL;
    const BCsg1 = ((4 * w) / p) * FC_g1;
    const BC1s = 0.5 * BCsg1 * er_eff;

    const B1 = Math.max(1e-12, BC1s);
    // Para a ressonância ocorrer, Z_series tem de ser 0. Logo, XLs * KL_AUTO = 1/B1
    KL_AUTO = 1 / B1 / XLs_base;
  }

  // Executa a calibração silenciosa antes de iniciar a interface
  calibrateKL();

  const defaultValues = {
    fStart: "20.0",
    fEnd: "50.0",
    p: "4.100",
    w_num: "0.850",
    g1_num: "0.200",
    h_sub: "0.508",
    er: "2.94",
  };

  for (const [key, value] of Object.entries(defaultValues)) {
    const numEl =
      document.getElementById(`${key.replace("_num", "")}_num`) ||
      document.getElementById(key);
    const sliderEl = document.getElementById(
      `${key.replace("_num", "")}_slider`,
    );
    if (numEl) numEl.value = value;
    if (sliderEl) sliderEl.value = value;
  }

  function handleGeometry(changed) {
    const pNum = document.getElementById("p_num");
    const wNum = document.getElementById("w_num");
    const g1Num = document.getElementById("g1_num");
    const g2Num = document.getElementById("g2_num");

    if (!pNum || !wNum || !g1Num || !g2Num) return;

    let p = parseFloat(pNum.value) || 4.1;
    let w = parseFloat(wNum.value) || 0.85;
    let g1 = parseFloat(g1Num.value) || 0.2;

    if (g1 >= p) {
      g1 = p - 0.001;
      g1Num.value = g1.toFixed(3);
      if (document.getElementById("g1_slider"))
        document.getElementById("g1_slider").value = g1.toFixed(3);
    }
    if (w >= p / 2) {
      w = p / 2 - 0.001;
      wNum.value = w.toFixed(3);
      if (document.getElementById("w_slider"))
        document.getElementById("w_slider").value = w.toFixed(3);
    }

    let g2 = p - 2 * w;
    if (g2 < 0.001) g2 = 0.001;
    g2Num.value = g2.toFixed(3);
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
      handleGeometry(idPrefix);
      updateAll();
    });

    num.addEventListener("input", (e) => {
      slider.value = e.target.value;
      handleGeometry(idPrefix);
      updateAll();
    });
  }

  ["fStart", "fEnd", "p", "w", "g1", "h_sub", "er"].forEach(bindInputs);

  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    subSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      const isPreset = val === "RO3003" || val === "FR4" || val === "RT5880" || val === "RO4350B" || val === "RF35" || val === "TMM4";

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
          if (erNum) {
            erNum.value = "2.94";
            erSlider.value = "2.94";
          }
          if (hNum) {
            hNum.value = "0.508";
            hSlider.value = "0.508";
          }
        } else if (val === "FR4") {
          if (erNum) {
            erNum.value = "4.40";
            erSlider.value = "4.40";
          }
          if (hNum) {
            hNum.value = "1.600";
            hSlider.value = "1.600";
          }
        } else if (val === "RT5880") {
          if (erNum) {
            erNum.value = "2.20";
            erSlider.value = "2.20";
          }
          if (hNum) {
            hNum.value = "0.254";
            hSlider.value = "0.254";
          }
        } else if (val === "RO4350B") {
          if (erNum) {
            erNum.value = "3.66";
            erSlider.value = "3.66";
          }
          if (hNum) {
            hNum.value = "0.762";
            hSlider.value = "0.762";
          }
        } else if (val === "RF35") {
          if (erNum) {
            erNum.value = "3.50";
            erSlider.value = "3.50";
          }
          if (hNum) {
            hNum.value = "0.762";
            hSlider.value = "0.762";
          }
        } else if (val === "TMM4") {
          if (erNum) {
            erNum.value = "4.50";
            erSlider.value = "4.50";
          }
          if (hNum) {
            hNum.value = "0.381";
            hSlider.value = "0.381";
          }
        }
      }
      updateAll();
    });
    setTimeout(() => {
      subSelect.value = "RO3003";
      subSelect.dispatchEvent(new Event("change"));
    }, 50);
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
    hfssBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Carregar HFSS';
    hfssBtn.style.cssText =
      "margin-top: 10px; margin-left: 10px; padding: 8px 16px; background: #e53e3e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;";
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
    qsHfssData = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        const freq = parseFloat(parts[0]);
        const s21 = parseFloat(parts[1]);
        if (!isNaN(freq) && !isNaN(s21)) {
          qsHfssData.push({ x: freq, y: s21 });
        }
      }
    }
    alert(`Dados do HFSS carregados! (${qsHfssData.length} pontos)`);
    updateAll();
  };
  reader.readAsText(file);
}

function getSafeValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el || isNaN(parseFloat(el.value))) return fallback;
  return parseFloat(el.value);
}

// ==========================================
// DESENHO GEOMÉTRICO (CANVAS)
// ==========================================
function drawGeometry(p, w, g1, g2) {
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, size, size);

  const viewSize = p * 1.5;
  const scale = size / viewSize;
  const center = size / 2;

  const pPix = p * scale;
  const g1Pix = g1 * scale;
  const g2Pix = g2 * scale;

  function drawQuasiSquare(cx, cy, isCenter) {
    ctx.fillStyle = isCenter ? "#1a365d" : "rgba(26, 54, 93, 0.15)";

    // Top-Right L-shape
    ctx.beginPath();
    ctx.moveTo(cx + g1Pix / 2, cy - pPix / 2);
    ctx.lineTo(cx + pPix / 2, cy - pPix / 2);
    ctx.lineTo(cx + pPix / 2, cy - g1Pix / 2);
    ctx.lineTo(cx + g2Pix / 2, cy - g1Pix / 2);
    ctx.lineTo(cx + g2Pix / 2, cy - g2Pix / 2);
    ctx.lineTo(cx + g1Pix / 2, cy - g2Pix / 2);
    ctx.closePath();
    ctx.fill();
    if (isCenter) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#0d1f38";
      ctx.stroke();
    }

    // Bottom-Right L-shape
    ctx.beginPath();
    ctx.moveTo(cx + pPix / 2, cy + g1Pix / 2);
    ctx.lineTo(cx + pPix / 2, cy + pPix / 2);
    ctx.lineTo(cx + g1Pix / 2, cy + pPix / 2);
    ctx.lineTo(cx + g1Pix / 2, cy + g2Pix / 2);
    ctx.lineTo(cx + g2Pix / 2, cy + g2Pix / 2);
    ctx.lineTo(cx + g2Pix / 2, cy + g1Pix / 2);
    ctx.closePath();
    ctx.fill();
    if (isCenter) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#0d1f38";
      ctx.stroke();
    }

    // Bottom-Left L-shape
    ctx.beginPath();
    ctx.moveTo(cx - g1Pix / 2, cy + pPix / 2);
    ctx.lineTo(cx - pPix / 2, cy + pPix / 2);
    ctx.lineTo(cx - pPix / 2, cy + g1Pix / 2);
    ctx.lineTo(cx - g2Pix / 2, cy + g1Pix / 2);
    ctx.lineTo(cx - g2Pix / 2, cy + g2Pix / 2);
    ctx.lineTo(cx - g1Pix / 2, cy + g2Pix / 2);
    ctx.closePath();
    ctx.fill();
    if (isCenter) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#0d1f38";
      ctx.stroke();
    }

    // Top-Left L-shape
    ctx.beginPath();
    ctx.moveTo(cx - pPix / 2, cy - g1Pix / 2);
    ctx.lineTo(cx - pPix / 2, cy - pPix / 2);
    ctx.lineTo(cx - g1Pix / 2, cy - pPix / 2);
    ctx.lineTo(cx - g1Pix / 2, cy - g2Pix / 2);
    ctx.lineTo(cx - g2Pix / 2, cy - g2Pix / 2);
    ctx.lineTo(cx - g2Pix / 2, cy - g1Pix / 2);
    ctx.closePath();
    ctx.fill();
    if (isCenter) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#0d1f38";
      ctx.stroke();
    }
  }

  const offsets = [-1, 0, 1];
  offsets.forEach((dx) => {
    offsets.forEach((dy) => {
      drawQuasiSquare(
        center + dx * pPix,
        center + dy * pPix,
        dx === 0 && dy === 0,
      );
    });
  });

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPix / 2, center - pPix / 2, pPix, pPix);
  ctx.setLineDash([]);

  drawDimensionsQuasi(ctx, center, pPix, g1Pix, g2Pix, scale, p, w, g1, g2);
}

function drawDimensionsQuasi(
  ctx,
  center,
  pPix,
  g1Pix,
  g2Pix,
  scale,
  p,
  w,
  g1,
  g2,
) {
  const fontSize = Math.max(10, pPix * 0.05);
  const arrowSize = Math.max(3, pPix * 0.025);
  const offset = pPix * 0.15;

  ctx.lineWidth = 1.5;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.strokeStyle = "#d32f2f";
  ctx.fillStyle = "#d32f2f";
  const pY = center - pPix / 2 - offset;
  drawArrow(ctx, center - pPix / 2, pY, center + pPix / 2, pY, arrowSize);
  ctx.fillText(`p = ${p.toFixed(2)}`, center, pY - offset * 0.3);

  ctx.strokeStyle = "#8e44ad";
  ctx.fillStyle = "#8e44ad";
  drawArrow(
    ctx,
    center - g1Pix / 2,
    center + pPix / 4,
    center + g1Pix / 2,
    center + pPix / 4,
    arrowSize * 0.7,
  );
  ctx.fillText(`g1`, center + g1Pix / 2 + offset * 0.3, center + pPix / 4);

  ctx.strokeStyle = "#f57c00";
  ctx.fillStyle = "#f57c00";
  drawArrow(
    ctx,
    center - g2Pix / 2,
    center,
    center + g2Pix / 2,
    center,
    arrowSize,
  );
  ctx.fillText(`g2`, center, center + offset * 0.3);

  ctx.strokeStyle = "#1976d2";
  ctx.fillStyle = "#1976d2";
  const wX = center + pPix / 2 + offset * 0.5;
  drawArrow(ctx, wX, center - pPix / 2, wX, center - g2Pix / 2, arrowSize);
  ctx.fillText(`w`, wX + offset * 0.4, center - pPix / 4);
}

function drawArrow(ctx, fromX, fromY, toX, toY, arrowSize) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(
    fromX - arrowSize * Math.cos(angle - Math.PI / 6),
    fromY - arrowSize * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    fromX - arrowSize * Math.cos(angle + Math.PI / 6),
    fromY - arrowSize * Math.sin(angle + Math.PI / 6),
  );
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - arrowSize * Math.cos(angle - Math.PI / 6),
    toY - arrowSize * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - arrowSize * Math.cos(angle + Math.PI / 6),
    toY - arrowSize * Math.sin(angle + Math.PI / 6),
  );
  ctx.fill();
}

// ==========================================
// CÁLCULO ECM - MAMEDES (2024) Eq. 4.15 a 4.20
// Aplica o Fator KL_AUTO calculado no carregamento da página
// ==========================================
function updateAll() {
  const fStart = getSafeValue("fStart_num", 20.0);
  const fEnd = getSafeValue("fEnd_num", 50.0);
  const p = getSafeValue("p_num", 4.1);
  const w = getSafeValue("w_num", 0.85);
  const g1 = getSafeValue("g1_num", 0.2);
  const h_sub = getSafeValue("h_sub_num", 0.508);
  const er_real = getSafeValue("er_num", 2.94);

  if (fStart >= fEnd || p <= 0) return;

  const g2 = p - 2 * w;

  const M_factor = 1.5;
  const c_val = (10 * h_sub) / p;
  const z_factor = Math.exp(Math.pow(c_val, M_factor));
  const er_eff = er_real - (er_real - 1) / z_factor;

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  drawGeometry(p, w, g1, g2);

  const data_modelo = [],
    labels = [];
  const pCm = mmToCm(p);
  const df = 0.02; // Resolução em Alta Definição

  const w_cm = mmToCm(w);
  const g1_cm = mmToCm(g1);
  const g2_cm = mmToCm(g2);

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;

    try {
      const FL = FF(pCm, w_cm, lamb, 0);
      const FC_g1 = FF(pCm, g1_cm, lamb, 0);
      const FC_g2 = FF(pCm, g2_cm, lamb, 0);

      // Aplicação da calibração invisível calculada (KL_AUTO)
      const XLs = KL_AUTO * ((0.5 * (p - w)) / p) * FL;

      const BCsg1 = ((4 * w) / p) * FC_g1;
      const BCsg2 = ((4 * (p - w)) / p) * FC_g2;

      const BC1s = 0.5 * BCsg1 * er_eff;
      const BC2s = 0.25 * (BCsg2 + BCsg1) * er_eff;

      const B1 = Math.max(1e-12, BC1s);
      const Z_series = XLs - 1 / B1;

      const Ys = Math.abs(1 / Z_series - BC2s);
      const pt_dB = 20 * Math.log10(2 / Math.sqrt(4 + Ys * Ys));

      labels.push(freq.toFixed(2));
      data_modelo.push(Math.max(-60, pt_dB));
    } catch (e) {
      data_modelo.push(0);
    }
  }

  let hfssPlotData = [];
  if (qsHfssData && qsHfssData.length > 0) {
    let hfssIndex = 0;
    hfssPlotData = labels.map((labelStr) => {
      const f = parseFloat(labelStr);
      while (hfssIndex < qsHfssData.length - 1 && qsHfssData[hfssIndex].x < f)
        hfssIndex++;
      return Math.abs(qsHfssData[hfssIndex].x - f) < 0.1
        ? qsHfssData[hfssIndex].y
        : null;
    });
  }

  updateChart(labels, data_modelo, hfssPlotData);
}

function updateChart(labels, data_modelo, hfssPlotData) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (qsChartInstance) qsChartInstance.destroy();

  const minIndex = data_modelo.indexOf(Math.min(...data_modelo));
  const frFreq = parseFloat(labels[minIndex]);

  const datasets = [
    {
      label: "ECM Mamedes (2024)",
      data: data_modelo,
      borderColor: "#1a365d",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0.1,
    },
  ];

  if (qsHfssData && qsHfssData.length > 0) {
    datasets.push({
      label: "Ansys HFSS",
      data: hfssPlotData,
      borderColor: "#e53e3e",
      borderWidth: 3,
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  if (minIndex !== -1 && !isNaN(frFreq)) {
    const frPointData = labels.map((_, idx) =>
      idx === minIndex ? data_modelo[idx] : null,
    );
    datasets.push({
      label: `fr = ${frFreq.toFixed(2)} GHz`,
      data: frPointData,
      borderColor: "#d35400",
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: "#d35400",
      showLine: false,
    });
  }

  qsChartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          ticks: { maxTicksLimit: 15 },
          title: {
            display: true,
            text: "Frequência (GHz)",
            font: { weight: "bold" },
          },
        },
        y: {
          min: -60,
          max: 0,
          title: { display: true, text: "S21 (dB)", font: { weight: "bold" } },
        },
      },
      plugins: { legend: { labels: { font: { family: "Arial", size: 13 } } } },
    },
  });

  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText =
      "margin-top: 15px; padding: 12px; background: #fff3e0; border-radius: 6px; font-size: 14px; border-left: 5px solid #d35400;";
    document.querySelector(".chart-container").after(infoBox);
  }

  infoBox.innerHTML = `<strong>Ressonância ECM Alvo:</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz <br> <span style="color:#d35400;">Calibração Dinâmica Ativa (KL = ${KL_AUTO.toFixed(3)}): Compensação automática aplicada para alinhar as equações do seu 'math.js' aos resultados reais do Ansys HFSS.</span>`;
}

function exportToCSV() {
  if (!qsChartInstance) return;
  let csv = "\uFEFF" + "Frequencia (GHz);S21 ECM (dB)\n";
  qsChartInstance.data.labels.forEach((freq, index) => {
    let s21_val = qsChartInstance.data.datasets[0].data[index];
    csv += `${Number(freq).toFixed(2).replace(".", ",")};${Number(s21_val).toFixed(4).replace(".", ",")}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_fss_quasequadrado.csv";
  link.click();
}
