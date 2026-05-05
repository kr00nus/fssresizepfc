import { mmToCm, csc, GG, FF } from "./math.js";
import { exportChartToCSV, createLineChart } from "./visual.js";

let chart = null;

function bindInputs(idPrefix) {
  const slider = document.getElementById(idPrefix + "_slider");
  const num = document.getElementById(idPrefix + "_num");
  if (!slider || !num) return;
  slider.addEventListener("input", (e) => {
    const decimals =
      idPrefix === "fStart" || idPrefix === "fEnd"
        ? 0
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

function applySubstratePreset(preset) {
  if (preset === "RO3003") {
    document.getElementById("er_num").value = 3.0;
    document.getElementById("h_sub_num").value = 1.52;
    document.getElementById("er_slider").value = 3.0;
    document.getElementById("h_sub_slider").value = 1.52;
  } else if (preset === "RO3006") {
    document.getElementById("er_num").value = 6.5;
    document.getElementById("h_sub_num").value = 1.28;
    document.getElementById("er_slider").value = 6.5;
    document.getElementById("h_sub_slider").value = 1.28;
  }
  updateAll();
}

function drawGeometry(p, d, w, g) {
  const canvas = document.getElementById("shapeCanvas");
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

  ctx.fillStyle = "#cc0000";
  ctx.strokeStyle = "#cc0000";
  ctx.lineWidth = 1.2;
  ctx.font = "bold 13px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  function drawCota(
    x1,
    y1,
    x2,
    y2,
    text,
    textOffsetX,
    textOffsetY,
    isVertical = false,
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const tick = 4;
    ctx.beginPath();
    if (isVertical) {
      ctx.moveTo(x1 - tick, y1);
      ctx.lineTo(x1 + tick, y1);
      ctx.moveTo(x2 - tick, y2);
      ctx.lineTo(x2 + tick, y2);
    } else {
      ctx.moveTo(x1, y1 - tick);
      ctx.lineTo(x1, y1 + tick);
      ctx.moveTo(x2, y2 - tick);
      ctx.lineTo(x2, y2 + tick);
    }
    ctx.stroke();

    const txtX = (x1 + x2) / 2 + textOffsetX;
    const txtY = (y1 + y2) / 2 + textOffsetY;
    const m = ctx.measureText(text);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(txtX - m.width / 2 - 2, txtY - 8, m.width + 4, 16);
    ctx.fillStyle = "#cc0000";
    ctx.fillText(text, txtX, txtY);
  }

  const topY = center - pPixel / 2;
  ctx.strokeStyle = "rgba(204, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.moveTo(center - pPixel / 2, topY);
  ctx.lineTo(center - pPixel / 2, topY - 25);
  ctx.moveTo(center + pPixel / 2, topY);
  ctx.lineTo(center + pPixel / 2, topY - 25);
  ctx.stroke();
  ctx.strokeStyle = "#cc0000";
  drawCota(
    center - pPixel / 2,
    topY - 18,
    center + pPixel / 2,
    topY - 18,
    "p = " + p.toFixed(3),
    0,
    -10,
  );

  const dY = center + dPixel / 2 + 25;
  ctx.strokeStyle = "rgba(204, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.moveTo(center - dPixel / 2, center + dPixel / 2);
  ctx.lineTo(center - dPixel / 2, dY + 5);
  ctx.moveTo(center + dPixel / 2, center + dPixel / 2);
  ctx.lineTo(center + dPixel / 2, dY + 5);
  ctx.stroke();
  ctx.strokeStyle = "#cc0000";
  drawCota(
    center - dPixel / 2,
    dY,
    center + dPixel / 2,
    dY,
    "d = " + d.toFixed(3),
    0,
    10,
  );

  const leftX = center - dPixel / 2;
  ctx.strokeStyle = "rgba(204, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.moveTo(leftX, center);
  ctx.lineTo(leftX - 25, center);
  ctx.moveTo(leftX + wPixel, center);
  ctx.lineTo(leftX + wPixel - 25, center);
  ctx.stroke();
  ctx.strokeStyle = "#cc0000";
  drawCota(
    leftX - 18,
    center,
    leftX + wPixel - 18,
    center,
    "w = " + w.toFixed(3),
    -15,
    0,
    true,
  );

  const centralRightEdge = center + dPixel / 2;
  const neighborLeftEdge = center + pPixel - dPixel / 2;
  ctx.strokeStyle = "rgba(204, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.moveTo(centralRightEdge, center);
  ctx.lineTo(centralRightEdge, center + 20);
  ctx.moveTo(neighborLeftEdge, center);
  ctx.lineTo(neighborLeftEdge, center + 20);
  ctx.stroke();
  ctx.strokeStyle = "#cc0000";
  drawCota(
    centralRightEdge,
    center + 12,
    neighborLeftEdge,
    center + 12,
    "g = " + g.toFixed(3),
    0,
    10,
  );
}

function updateChart(labels, data) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (chart) chart.destroy();

  const minIndex = data.indexOf(Math.min(...data));
  const frFreq = parseFloat(labels[minIndex]);
  const minValue = data[minIndex];
  const threshold = minValue + 3;

  let fLower = null,
    fUpper = null;
  for (let i = minIndex; i >= 0; i--) {
    if (data[i] >= threshold) {
      fLower = i > 0 ? parseFloat(labels[i]) : parseFloat(labels[0]);
      break;
    }
  }
  for (let i = minIndex; i < data.length; i++) {
    if (data[i] >= threshold) {
      fUpper =
        i < data.length - 1
          ? parseFloat(labels[i])
          : parseFloat(labels[data.length - 1]);
      break;
    }
  }
  if (fLower === null) fLower = parseFloat(labels[0]);
  if (fUpper === null) fUpper = parseFloat(labels[data.length - 1]);
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

  chart = createLineChart(ctx, labels, [
    { label: 'S21 Simulado (Espira Quadrada)', data: data, borderColor: '#000', borderWidth: 2 },
    { label: `fr = ${frFreq.toFixed(2)} GHz`, data: frPointData, borderColor: '#ff0000', borderWidth: 3, borderDash: [5,5], pointRadius: 6, pointBackgroundColor: '#ff0000', pointBorderColor: '#ff0000', showLine: false },
    { label: `BW = ${bw.toFixed(2)} GHz (-3dB)`, data: bwPointsData, borderColor: '#0066cc', borderWidth: 3, borderDash: [3,3], pointRadius: 6, pointBackgroundColor: '#0066cc', pointBorderColor: '#0066cc', showLine: false },
  ], { yTitle: 'Potência Transmitida (dB)', yMin: -50, yMax: 0 });

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

function exportToCSVHandler() {
  exportChartToCSV(chart, "dados_s21_espira_quadrada.csv");
}

export function init() {
  // Bind inputs
  ["fStart", "fEnd", "p", "d", "w", "h_sub", "er"].forEach(bindInputs);

  const substrateSelect = document.getElementById("substrate_select");
  if (substrateSelect) {
    substrateSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "manual") {
        document.getElementById("er_num").removeAttribute("disabled");
        document.getElementById("h_sub_num").removeAttribute("disabled");
        document.getElementById("er_slider").removeAttribute("disabled");
        document.getElementById("h_sub_slider").removeAttribute("disabled");
      } else {
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

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToCSVHandler);
  }

  // Initial render
  updateAll();
}

// Main simulation logic (adapted from original)
function updateAll() {
  const fStart = parseFloat(document.getElementById("fStart_num").value);
  const fEnd = parseFloat(document.getElementById("fEnd_num").value);
  let p = parseFloat(document.getElementById("p_num").value);
  let d = parseFloat(document.getElementById("d_num").value);
  let w = parseFloat(document.getElementById("w_num").value);
  let h_sub = parseFloat(document.getElementById("h_sub_num").value);
  const er_real = parseFloat(document.getElementById("er_num").value);

  if (d >= p) {
    d = p - 0.001;
    document.getElementById("d_num").value = d.toFixed(3);
    document.getElementById("d_slider").value = d;
  }
  if (2 * w >= d) {
    w = d / 2 - 0.001;
    document.getElementById("w_num").value = w.toFixed(3);
    document.getElementById("w_slider").value = w;
  }

  const g = p - d;
  document.getElementById("g_num").value = g.toFixed(3);

  const er_eff = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  document.getElementById("er_eff_num").value = er_eff.toFixed(3);

  drawGeometry(p, d, w, g);

  const df = 0.001;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);

  const data = [];
  const labels = [];

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      const XL = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);
      const BC = 4 * er_eff * (dCm / pCm) * FF(pCm, gCm, lamb, ang);

      const ct = 1 / (XL - 1 / BC);
      const pt = 1 / (1 + 0.25 * Math.pow(ct, 2));
      let pt_dB = 10 * Math.log10(pt);

      labels.push(freq.toFixed(3));
      data.push(Math.max(-60, pt_dB));
    } catch (e) {
      data.push(0);
    }
  }

  updateChart(labels, data);
}

// Auto-init when module is loaded in the page
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
