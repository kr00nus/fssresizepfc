import { mmToCm, FF } from "./math.js";

let chart;

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

function updateAll() {
  const fStart = parseFloat(document.getElementById("fStart_num").value);
  const fEnd = parseFloat(document.getElementById("fEnd_num").value);
  let p = parseFloat(document.getElementById("p_num").value);
  let d = parseFloat(document.getElementById("d_num").value);
  let w = parseFloat(document.getElementById("w_num").value);
  let h_sub = parseFloat(document.getElementById("h_sub_num").value);
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
    document.getElementById("d_slider").value = d;
  }
  if (2 * w >= d) {
    w = d / 2 - 0.001;
    document.getElementById("w_num").value = w.toFixed(3);
    document.getElementById("w_slider").value = w;
  }

  const g = p - d;
  const gEl = document.getElementById("g_num");
  if (gEl) gEl.value = g.toFixed(3);

  const er_eff = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  drawGeometry(p, d, w, g);

  const df = 0.05;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);

  // Resistência Superficial Rs inserida para modelar perdas ôhmicas e do substrato.
  // O valor 0.008 fixa a atenuação da ressonância perto de -36 dB simulando o CST do eBook.
  const Rs = 0.008;

  const data = [];
  const labels = [];

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      const XL = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);
      const BC = 4 * er_eff * (dCm / pCm) * FF(pCm, gCm, lamb, ang);

      // Reatância Total ideal (X)
      const X = XL - 1 / BC;

      // Potência Transmitida de um circuito RLC em série/paralelo com a linha
      // Pt = (Rs^2 + X^2) / (Rs^2 + X^2 + Rs + 0.25)
      const pt = (Rs * Rs + X * X) / (Rs * Rs + X * X + Rs + 0.25);
      let pt_dB = 10 * Math.log10(pt);

      labels.push(freq.toFixed(2));
      data.push(Math.max(-60, pt_dB));
    } catch (e) {
      data.push(0);
    }
  }

  updateChart(labels, data);
}

function updateChart(labels, data) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (chart) chart.destroy();

  const minIndex = data.indexOf(Math.min(...data));
  const frFreq = parseFloat(labels[minIndex]);

  // Medição da banda passante cravada nos -10 dB!
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
  for (let i = minIndex; i < data.length; i++) {
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

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "S21 Simulado ECM com Perdas (Espira Quadrada)",
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
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "Freqüência (GHz)",
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
      "margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 4px; font-family: 'Times New Roman'; font-size: 14px;";
    document
      .querySelector(".chart-container")
      .parentNode.insertBefore(
        infoBox,
        document.querySelector(".chart-container").nextSibling,
      );
  }
  infoBox.innerHTML = `<strong>Frequência de Ressonância (fr):</strong> ${frFreq.toFixed(2)} GHz | <strong>Banda de Rejeição (BW):</strong> ${bw.toFixed(2)} GHz (${fLower.toFixed(2)} - ${fUpper.toFixed(2)} GHz)`;
}

function exportToCSV() {
  if (!chart || !chart.data.labels.length) { 
    alert("Nenhum dado disponível."); 
    return; 
  }
  
  // Cabeçalho da tabela
  let csv = "Frequência (GHz);S21 (dB)\n";
  
  chart.data.labels.forEach((freq, index) => {
    // Pega o valor de S21
    let s21 = chart.data.datasets[0].data[index];

    // O SEGREDO: Troca o PONTO por VÍRGULA para o Excel brasileiro ler como decimal!
    let freq_BR = String(freq).replace(".", ",");
    let s21_BR = Number(s21).toFixed(4).replace(".", ",");

    // Adiciona a linha na tabela (colunas separadas por ponto-e-vírgula)
    csv += `${freq_BR};${s21_BR}\n`;
  });

  // O "\uFEFF" (BOM) garante que o Excel leia os acentos (UTF-8) corretamente
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "dados_s21.csv"); // Nome do arquivo exportado
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

