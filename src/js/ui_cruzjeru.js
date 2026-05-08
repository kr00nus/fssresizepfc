import { mmToCm, FF } from "./math.js";
import { createLineChart, exportChartToCSV } from "./visual.js";

let chart = null;

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

function applySubstratePreset(preset) {
  if (preset === "RO3003") {
    document.getElementById("er_num").value = "3.00";
    document.getElementById("er_slider").value = "3.00";
    document.getElementById("h_sub_num").value = "1.52";
    document.getElementById("h_sub_slider").value = "1.52";
  } else if (preset === "RO3006") {
    document.getElementById("er_num").value = "6.50";
    document.getElementById("er_slider").value = "6.50";
    document.getElementById("h_sub_num").value = "1.28";
    document.getElementById("h_sub_slider").value = "1.28";
  }
  updateAll();
}

document.addEventListener("DOMContentLoaded", () => {
  ["fStart", "fEnd", "p", "d", "w", "h", "h_sub", "er"].forEach(bindInputs);

  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    subSelect.addEventListener("change", (e) =>
      applySubstratePreset(e.target.value),
    );
  }

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (chart) exportChartToCSV(chart, "fss_cruz_jerusalem.csv");
    });
  }

  updateAll();
});

function drawGeometry(p, d, w, h_arm) {
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
  const hPixel = h_arm * scale;

  function drawJerusalemCross(cx, cy, isCenter) {
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";
    // Braços centrais
    ctx.fillRect(cx - dPixel / 2, cy - wPixel / 2, dPixel, wPixel);
    ctx.fillRect(cx - wPixel / 2, cy - dPixel / 2, wPixel, dPixel);

    // Chapéus (extremidades)
    const capLength = 2 * hPixel + wPixel;
    ctx.fillRect(cx - capLength / 2, cy - dPixel / 2, capLength, wPixel);
    ctx.fillRect(
      cx - capLength / 2,
      cy + dPixel / 2 - wPixel,
      capLength,
      wPixel,
    );
    ctx.fillRect(cx - dPixel / 2, cy - capLength / 2, wPixel, capLength);
    ctx.fillRect(
      cx + dPixel / 2 - wPixel,
      cy - capLength / 2,
      wPixel,
      capLength,
    );
  }

  const neighbors = [
    { i: 0, j: -1 },
    { i: 0, j: 1 },
    { i: -1, j: 0 },
    { i: 1, j: 0 },
  ];
  neighbors.forEach((n) =>
    drawJerusalemCross(center + n.i * pPixel, center + n.j * pPixel, false),
  );
  drawJerusalemCross(center, center, true);

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
  const h_arm = parseFloat(document.getElementById("h_num").value);
  const h_sub = parseFloat(document.getElementById("h_sub_num").value);
  const er_real = parseFloat(document.getElementById("er_num").value);

  if (d >= p) {
    d = p - 0.001;
    document.getElementById("d_num").value = d.toFixed(3);
  }

  const g = p - d;
  const gEl = document.getElementById("g_num");
  if (gEl) gEl.value = g.toFixed(3);

  // --- CÁLCULO DA PERMISSIVIDADE EFETIVA DEPENDENTE DE H ---
  const er_eff = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  drawGeometry(p, d, w, h_arm);

  const df = 0.05;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const hCm = mmToCm(h_arm);
  const gCm = mmToCm(g);

  // Resistência Superficial Rs para evitar infinito e simular perdas reais (CST)
  const Rs = 0.008;

  const data = [];
  const labels = [];

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      // Ramo 1: Estrutura Principal
      const XL1 = (dCm / pCm) * FF(pCm, wCm, lamb, ang) * Math.cos(ang);
      const Bg = ((4 * dCm) / pCm) * FF(pCm, gCm, lamb, ang);
      const Bd = ((4 * (2 * hCm + gCm)) / pCm) * FF(pCm, pCm - dCm, lamb, ang);
      const BC1 = er_eff * (Bg + Bd);
      const X1 = XL1 - 1 / BC1;

      // Ramo 2: Braços Laterais
      const XL2 = (dCm / pCm) * FF(pCm, wCm, lamb, ang) * Math.cos(ang);
      const lamb3 = dCm / 0.43;
      const f3_eff = 30 / lamb3 / Math.sqrt(er_eff);
      const BC2 = (1 / XL2) * Math.pow(freq / f3_eff, 2);
      const X2 = XL2 - 1 / BC2;

      // Admitâncias com componente real (Perdas)
      // Y = 1 / (Rs + jX) = (Rs - jX) / (Rs^2 + X^2)
      const Y1_re = Rs / (Rs * Rs + X1 * X1);
      const Y1_im = -X1 / (Rs * Rs + X1 * X1);
      const Y2_re = Rs / (Rs * Rs + X2 * X2);
      const Y2_im = -X2 / (Rs * Rs + X2 * X2);

      const Y_total_re = Y1_re + Y2_re;
      const Y_total_im = Y1_im + Y2_im;

      // Potência Transmitida: Pt = | 2 / (2 + Y_total) |^2
      const den = Math.pow(2 + Y_total_re, 2) + Math.pow(Y_total_im, 2);
      const pt = 4 / den;
      let pt_dB = 10 * Math.log10(pt);

      labels.push(freq.toFixed(2));
      data.push(Math.max(-60, pt_dB));
    } catch (e) {
      data.push(0);
    }
  }

  const ctx = document.getElementById("fssChart").getContext("2d");

  // Cálculo de Ressonância e Banda (-10dB)
  const minIndex = data.indexOf(Math.min(...data));
  const frFreq = parseFloat(labels[minIndex]);
  const threshold = -10.0;
  let fL = null,
    fU = null,
    iL = 0,
    iU = data.length - 1;

  for (let i = minIndex; i >= 0; i--) {
    if (data[i] >= threshold) {
      fL = labels[i];
      iL = i;
      break;
    }
  }
  for (let i = minIndex; i < data.length; i++) {
    if (data[i] >= threshold) {
      fU = labels[i];
      iU = i;
      break;
    }
  }

  const bw = fL && fU ? parseFloat(fU) - parseFloat(fL) : 0;

  const datasets = [
    { label: "S21 (dB)", data: data, borderColor: "#000", borderWidth: 2 },
    {
      label: `fr = ${frFreq.toFixed(2)} GHz`,
      data: labels.map((_, i) => (i === minIndex ? data[i] : null)),
      pointRadius: 6,
      pointBackgroundColor: "#ff0000",
      showLine: false,
    },
    {
      label: `BW = ${bw.toFixed(2)} GHz`,
      data: labels.map((_, i) => (i === iL || i === iU ? data[i] : null)),
      pointRadius: 6,
      pointBackgroundColor: "#0066cc",
      showLine: false,
    },
  ];

  chart = createLineChart(ctx, labels, datasets, { min: -60, max: 0 });

  const info =
    document.getElementById("resonanceInfo") || document.createElement("div");
  info.id = "resonanceInfo";
  info.style.cssText =
    "margin-top:10px; padding:10px; background:#f0f0f0; border-radius:4px; font-family:serif;";
  info.innerHTML = `<strong>Frequência de Ressonância:</strong> ${frFreq.toFixed(2)} GHz | <strong>Banda (-10dB):</strong> ${bw.toFixed(2)} GHz`;
  if (!document.getElementById("resonanceInfo"))
    document.querySelector(".chart-container").after(info);
}
