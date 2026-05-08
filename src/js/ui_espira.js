import { mmToCm, FF } from "./math.js";

let chart = null;

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

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToCSV);
  }

  updateAll();
});

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

  const er_eff = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  drawGeometry(p, d, w, g);

  const df = 0.001; // Alta resolução
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);
  const Rs = 0.008; // Resistência superficial para modelar perdas (TCC/CST)

  const data = [];
  const labels = [];
  const f_limit = 30 / pCm; // Limite de Grating Lobes

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      const XL = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);
      const BC = 4 * er_eff * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const X = XL - 1 / BC;

      // Cálculo Pt com perdas (R_s)
      const pt = (Rs * Rs + X * X) / (Rs * Rs + X * X + Rs + 0.25);
      let pt_dB = 10 * Math.log10(pt);

      labels.push(freq.toFixed(3)); // Necessário 3 casas para o passo 0.001
      data.push(Math.max(-60, pt_dB));
    } catch (e) {
      data.push(0);
    }
  }

  let limitIndex = -1;
  for (let i = 0; i < labels.length; i++) {
    if (parseFloat(labels[i]) >= f_limit) {
      limitIndex = i;
      break;
    }
  }

  updateChart(labels, data, limitIndex, f_limit);
}

function updateChart(labels, data, limitIndex, f_limit) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (chart) chart.destroy();

  const validData = limitIndex !== -1 ? data.slice(0, limitIndex) : data;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  const threshold = -10.0;
  let fLower = null,
    fUpper = null;
  let lowerIndex = null,
    upperIndex = null;

  for (let i = minIndex; i >= 0; i--) {
    if (data[i] >= threshold) {
      fLower = parseFloat(labels[i]);
      lowerIndex = i;
      break;
    }
  }
  for (
    let i = minIndex;
    i < (limitIndex !== -1 ? limitIndex : data.length);
    i++
  ) {
    if (data[i] >= threshold) {
      fUpper = parseFloat(labels[i]);
      upperIndex = i;
      break;
    }
  }

  if (fLower === null) fLower = parseFloat(labels[0]);
  if (fUpper === null) fUpper = parseFloat(labels[data.length - 1]);
  const bw = fUpper - fLower;

  const frPointData = labels.map((_, idx) =>
    idx === minIndex ? data[idx] : null,
  );
  const bwPointsData = labels.map((_, idx) =>
    idx === lowerIndex || idx === upperIndex ? data[idx] : null,
  );
  const limitPointData = labels.map((_, idx) =>
    idx === limitIndex ? data[idx] : null,
  );

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "S21 Simulado ECM (Espira Quadrada)",
          data: data,
          borderColor: "#000",
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0, // Desligado para evitar borrão na alta resolução
        },
        {
          label: `fr = ${frFreq.toFixed(2)} GHz`,
          data: frPointData,
          borderColor: "#ff0000",
          borderWidth: 3,
          borderDash: [5, 5],
          pointRadius: 6,
          pointBackgroundColor: "#ff0000",
          showLine: false,
        },
        {
          label: `BW = ${bw.toFixed(2)} GHz (-10dB)`,
          data: bwPointsData,
          borderColor: "#0066cc",
          borderWidth: 3,
          borderDash: [3, 3],
          pointRadius: 6,
          pointBackgroundColor: "#0066cc",
          showLine: false,
        },
        // Marcador do Limite de Difração
        ...(limitIndex !== -1
          ? [
              {
                label: `Limite ECM (λ=p) em ${f_limit.toFixed(2)} GHz`,
                data: limitPointData,
                borderColor: "#ff8c00",
                pointRadius: 9,
                pointStyle: "triangle",
                showLine: false,
              },
            ]
          : []),
      ],
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

  let infoHtml = `<strong>fr:</strong> ${frFreq.toFixed(2)} GHz | <strong>BW:</strong> ${bw.toFixed(2)} GHz`;
  if (limitIndex !== -1) {
    infoHtml += `<br><small style="color: #d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo ECM perde precisão devido à difração.</small>`;
  }
  infoBox.innerHTML = infoHtml;
}

function exportToCSV() {
  if (!chart) return;
  let csv = "\uFEFF" + "Frequência (GHz);S21 (dB)\n";
  chart.data.labels.forEach((freq, index) => {
    let s21 = chart.data.datasets[0].data[index];
    // Formato BR (Vércula) e alta precisão
    let freq_BR = Number(freq).toFixed(3).replace(".", ",");
    let s21_BR = Number(s21).toFixed(4).replace(".", ",");
    csv += `${freq_BR};${s21_BR}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_espira_quadrada.csv";
  link.click();
}
