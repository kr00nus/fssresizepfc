import { mmToCm, FF, GG } from "./math.js";
import { exportChartToCSV, createLineChart } from "./visual.js";

let chart = null;

function bindInputs(idPrefix) {
  const slider = document.getElementById(idPrefix + "_slider");
  const num = document.getElementById(idPrefix + "_num");
  if (!slider || !num) return;
  slider.addEventListener("input", (e) => {
    num.value = parseFloat(e.target.value).toFixed(2);
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

function drawGeometry(p, c) {
  const canvas = document.getElementById("shapeCanvas");
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  const viewSize = p * 2.2;
  const scale = size / viewSize;
  const center = size / 2;
  const pPixel = p * scale;
  const cPixel = c * scale;
  const offsets = [-pPixel, 0, pPixel];

  function drawSinglePatch(offsetX, offsetY, fillColor) {
    const cellLeft = center - pPixel / 2 + offsetX;
    const cellTop = center - pPixel / 2 + offsetY;
    const patchLeft = center - cPixel / 2 + offsetX;
    const patchTop = center - cPixel / 2 + offsetY;

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(153, 153, 153, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cellLeft, cellTop, pPixel, pPixel);
    ctx.setLineDash([]);

    ctx.fillStyle = fillColor;
    ctx.fillRect(patchLeft, patchTop, cPixel, cPixel);
  }

  offsets.forEach((dx) =>
    offsets.forEach((dy) =>
      drawSinglePatch(
        dx,
        dy,
        dx === 0 && dy === 0 ? "#003366" : "rgba(0, 51, 102, 0.12)",
      ),
    ),
  );

  // labels/cotas
  ctx.fillStyle = "#000";
  ctx.font = "bold 13px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
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

function exportToCSVHandler() {
  exportChartToCSV(chart, "dados_s21_patch_quadrado.csv");
}

export function init() {
  ["fStart", "fEnd", "p", "c"].forEach(bindInputs);

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
  if (exportBtn) exportBtn.addEventListener("click", exportToCSVHandler);

  updateAll();
}

function updateAll() {
  const fStart = parseFloat(document.getElementById("fStart_num").value);
  const fEnd = parseFloat(document.getElementById("fEnd_num").value);
  let p = parseFloat(document.getElementById("p_num").value); // 'a' no documento
  let c = parseFloat(document.getElementById("c_num").value); // 'c' no documento

  // Allow fStart == 0 (start at 0 GHz). Only require fEnd > 0 and physical params > 0
  if (fEnd <= 0 || p <= 0 || c <= 0 || fStart >= fEnd) {
    if (chart) chart.destroy();
    return;
  }

  if (c >= p) {
    c = p - 0.01;
    document.getElementById("c_num").value = c.toFixed(2);
    document.getElementById("c_slider").value = c;
  }

  drawGeometry(p, c);

  const df = 0.001;

  const a_cm = mmToCm(p);
  const c_cm = mmToCm(c);

  const data = [];
  const labels = [];

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    let pt_dB = -60;

    try {
      const lamb_a = lamb / a_cm;
      const c_a = c_cm / a_cm;

      if (lamb_a > 1) {
        const F1_sq = Math.pow(lamb_a, 2) - 1;
        const F1 = Math.sqrt(Math.abs(F1_sq));

        const pi_c_a = Math.PI * c_a;
        const denom_F2 = 1 - 2 * Math.pow(c_a, 2);
        const F2 = Math.cos(pi_c_a) / denom_F2;

        const F3 = pi_c_a !== 0 ? Math.sin(pi_c_a) / pi_c_a : 1;
        const F3_sq = Math.pow(F3, 2);

        const F4_sq = 2 * Math.pow(lamb_a, 2) - 1;

        const term_inv_F1_sq_minus_1 = 1 / Math.sqrt(Math.abs(F1_sq - 1));
        const term_F1_sq_minus_F3_sq = Math.sqrt(Math.abs(F1_sq - F3_sq));
        const term_inv_F4_sq_minus_1 = 1 / Math.sqrt(Math.abs(F4_sq - 1));

        const B =
          0.5 *
          F1 *
          F2 *
          term_inv_F1_sq_minus_1 *
          term_F1_sq_minus_F3_sq *
          term_inv_F4_sq_minus_1;

        const pt = 1 / (1 + Math.pow(B, 2));
        pt_dB = 10 * Math.log10(pt);
      } else {
        pt_dB = -60;
      }

      labels.push(freq.toFixed(3));
      if (!isFinite(pt_dB) || pt_dB < -60) pt_dB = -60;
      data.push(pt_dB);
    } catch (e) {
      data.push(-60);
    }
  }

  updateChart(labels, data);
}

// Auto-init
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init);
else init();
