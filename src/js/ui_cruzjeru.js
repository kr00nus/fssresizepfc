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

  ["fStart", "fEnd", "p", "d", "w", "h", "h_sub", "er"].forEach(bindInputs);

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

function drawGeometry(p, d, w, h_arm, g) {
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
    ctx.fillRect(cx - dPixel / 2, cy - wPixel / 2, dPixel, wPixel);
    ctx.fillRect(cx - wPixel / 2, cy - dPixel / 2, wPixel, dPixel);

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

  const dY = center + wPixel / 2 + 25;
  ctx.strokeStyle = "rgba(204, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.moveTo(center - dPixel / 2, center + wPixel / 2);
  ctx.lineTo(center - dPixel / 2, dY + 5);
  ctx.moveTo(center + dPixel / 2, center + wPixel / 2);
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

  drawGeometry(p, d, w, h_arm, g);

  const df = 0.05;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const hCm = mmToCm(h_arm);
  const gCm = mmToCm(g);

  const Rs = 0.008;

  const data = [];
  const labels = [];

  // Limite de Difração (onde o Comprimento de Onda é igual ao Período)
  const f_limit = 30 / pCm;

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      const XL1 = (dCm / pCm) * FF(pCm, wCm, lamb, ang) * Math.cos(ang);
      const Bg = ((4 * dCm) / pCm) * FF(pCm, gCm, lamb, ang);
      const Bd = ((4 * (2 * hCm + gCm)) / pCm) * FF(pCm, pCm - dCm, lamb, ang);
      const BC1 = er_eff * (Bg + Bd);
      const X1 = XL1 - 1 / BC1;

      const XL2 = (dCm / pCm) * FF(pCm, wCm, lamb, ang) * Math.cos(ang);
      const lamb3 = dCm / 0.43;
      const f3_eff = 30 / lamb3 / Math.sqrt(er_eff);
      const BC2 = (1 / XL2) * Math.pow(freq / f3_eff, 2);
      const X2 = XL2 - 1 / BC2;

      const Y1_re = Rs / (Rs * Rs + X1 * X1);
      const Y1_im = -X1 / (Rs * Rs + X1 * X1);
      const Y2_re = Rs / (Rs * Rs + X2 * X2);
      const Y2_im = -X2 / (Rs * Rs + X2 * X2);

      const Y_total_re = Y1_re + Y2_re;
      const Y_total_im = Y1_im + Y2_im;

      const den = Math.pow(2 + Y_total_re, 2) + Math.pow(Y_total_im, 2);
      const pt = 4 / den;
      let pt_dB = 10 * Math.log10(pt);

      labels.push(freq.toFixed(2));
      data.push(Math.max(-60, pt_dB));
    } catch (e) {
      data.push(0);
    }
  }

  // Encontra o índice exato onde a quebra do gráfico acontece
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

  // Ignorar picos loucos pós-limite para o cálculo da ressonância verdadeira
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

  if (fLower === null) {
    fLower = parseFloat(labels[0]);
    lowerIndex = 0;
  }
  if (fUpper === null) {
    fUpper = parseFloat(labels[data.length - 1]);
    upperIndex = data.length - 1;
  }
  const bw = fUpper - fLower;

  const frPointData = labels.map((_, idx) =>
    idx === minIndex ? data[idx] : null,
  );
  const bwPointsData = labels.map((_, idx) =>
    idx === lowerIndex || idx === upperIndex ? data[idx] : null,
  );

  // Conjunto de dados para o ponto de Limite de Difração
  const limitPointData = labels.map((_, idx) =>
    idx === limitIndex ? data[idx] : null,
  );

  const datasets = [
    {
      label: "S21 Simulado ECM com Perdas (Cruz de Jerusalém)",
      data: data,
      borderColor: "#000",
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.1,
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
      fill: false,
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
      pointBorderColor: "#0066cc",
      fill: false,
      showLine: false,
    },
  ];

  // Adiciona o marcador do limite apenas se o limite ocorrer dentro da faixa visível do gráfico
  if (limitIndex !== -1) {
    datasets.push({
      label: `Limite ECM (λ=p) em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",
      borderWidth: 2,
      pointRadius: 9,
      pointBackgroundColor: "#ff8c00",
      pointBorderColor: "#fff",
      pointStyle: "triangle",
      fill: false,
      showLine: false,
    });
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "Frequência (GHz)",
            font: { family: "Times New Roman", size: 14 },
          },
          grid: { color: "#eee" },
          ticks: { maxTicksLimit: 20 },
        },
        y: {
          min: -60,
          max: 0,
          title: {
            display: true,
            text: "Potência Transmitida (dB)",
            font: { family: "Times New Roman", size: 14 },
          },
          grid: { color: "#eee" },
        },
      },
      plugins: { legend: { labels: { font: { family: "Times New Roman" } } } },
    },
  });

  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText =
      "margin-top: 10px; padding: 10px; background: #fdfd96; border-radius: 4px; font-family: 'Times New Roman'; font-size: 14px;";
    document
      .querySelector(".chart-container")
      .parentNode.insertBefore(
        infoBox,
        document.querySelector(".chart-container").nextSibling,
      );
  }

  let infoHtml = `<strong>Frequência de Ressonância (fr):</strong> ${frFreq.toFixed(2)} GHz | <strong>Banda de Rejeição (BW):</strong> ${bw.toFixed(2)} GHz (${fLower.toFixed(2)} - ${fUpper.toFixed(2)} GHz)`;

  if (limitIndex !== -1) {
    infoHtml += `<br><span style="color: #d35400; font-size: 0.9em; display: block; margin-top: 5px;">⚠️ <strong>Aviso:</strong> A partir de <strong>${f_limit.toFixed(2)} GHz</strong> (onde o período $p$ supera o comprimento de onda $\\lambda$), o modelo ECM entra na região de Lóbulos de Difração (Grating Lobes) e sofre instabilidade matemática.</span>`;
  }

  infoBox.innerHTML = infoHtml;
}

function exportToCSV() {
  if (!chart || !chart.data.labels.length) {
    alert("Nenhum dado disponível.");
    return;
  }
  let csv = "Frequência (GHz);S21 (dB)\n";
  chart.data.labels.forEach((freq, index) => {
    const s21 = chart.data.datasets[0].data[index];
    csv += `${freq};${s21}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "dados_s21_cruz_jerusalem.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
