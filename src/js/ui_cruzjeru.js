import { mmToCm, csc, FF, GG } from './math.js';
import { exportChartToCSV } from './visual.js';

let chart = null;

function bindInputs(idPrefix) {
  const slider = document.getElementById(idPrefix + '_slider');
  const num = document.getElementById(idPrefix + '_num');
  if (!slider || !num) return;
  slider.addEventListener('input', (e) => {
    num.value = parseFloat(e.target.value).toFixed(idPrefix === 'g' || idPrefix === 'd' ? 3 : 2);
    updateAll();
  });
  num.addEventListener('input', (e) => {
    slider.value = e.target.value;
    updateAll();
  });
}

function applySubstratePreset(preset) {
  if (preset === 'RO3003') {
    document.getElementById('er_num').value = 3.0;
    document.getElementById('h_sub_num').value = 1.52;
    document.getElementById('er_slider').value = 3.0;
    document.getElementById('h_sub_slider').value = 1.52;
  } else if (preset === 'RO3006') {
    document.getElementById('er_num').value = 6.5;
    document.getElementById('h_sub_num').value = 1.28;
    document.getElementById('er_slider').value = 6.5;
    document.getElementById('h_sub_slider').value = 1.28;
  }
  updateAll();
}

function drawGeometry(p, d, w, h, g) {
  const canvas = document.getElementById('shapeCanvas');
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  const viewSize = p * 2.2;
  const scale = size / viewSize;
  const center = size / 2;
  const pPixel = p * scale;
  const dPixel = d * scale;
  const wPixel = w * scale;
  const hPixel = h * scale;

  function drawJerusalemCross(cx, cy, isCenter) {
    ctx.fillStyle = isCenter ? '#003366' : 'rgba(0, 51, 102, 0.12)';
    ctx.fillRect(cx - dPixel / 2, cy - wPixel / 2, dPixel, wPixel);
    ctx.fillRect(cx - wPixel / 2, cy - dPixel / 2, wPixel, dPixel);
    const capLength = 2 * hPixel + wPixel;
    ctx.fillRect(cx - capLength / 2, cy - dPixel / 2, capLength, wPixel);
    ctx.fillRect(cx - capLength / 2, cy + dPixel / 2 - wPixel, capLength, wPixel);
    ctx.fillRect(cx - dPixel / 2, cy - capLength / 2, wPixel, capLength);
    ctx.fillRect(cx + dPixel / 2 - wPixel, cy - capLength / 2, wPixel, capLength);
  }

  const neighbors = [
    { i: 0, j: -1 },
    { i: 0, j: 1 },
    { i: -1, j: 0 },
    { i: 1, j: 0 },
  ];
  neighbors.forEach((n) => drawJerusalemCross(center + n.i * pPixel, center + n.j * pPixel, false));
  drawJerusalemCross(center, center, true);

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]);
}

function updateChart(labels, data) {
  const ctx = document.getElementById('fssChart').getContext('2d');
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
      fUpper = i < data.length - 1 ? parseFloat(labels[i]) : parseFloat(labels[data.length - 1]);
      break;
    }
  }
  if (fLower === null) fLower = parseFloat(labels[0]);
  if (fUpper === null) fUpper = parseFloat(labels[data.length - 1]);
  const bw = fUpper - fLower;

  let frIndex = minIndex;
  let lowerIndex = minIndex;
  for (let i = minIndex; i >= 0; i--) {
    if (Math.abs(parseFloat(labels[i]) - fLower) < Math.abs(parseFloat(labels[lowerIndex]) - fLower)) {
      lowerIndex = i;
    }
  }
  let upperIndex = minIndex;
  for (let i = minIndex; i < data.length; i++) {
    if (Math.abs(parseFloat(labels[i]) - fUpper) < Math.abs(parseFloat(labels[upperIndex]) - fUpper)) {
      upperIndex = i;
    }
  }

  const frPointData = labels.map((_, idx) => (idx === frIndex ? data[idx] : null));
  const bwPointsData = labels.map((_, idx) => (idx === lowerIndex || idx === upperIndex ? data[idx] : null));

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Simulados (Cruz de Jerusalém)',
          data: data,
          borderColor: '#000',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        },
        {
          label: `fr = ${frFreq.toFixed(2)} GHz`,
          data: frPointData,
          borderColor: '#ff0000',
          borderWidth: 3,
          borderDash: [5, 5],
          pointRadius: 6,
          pointBackgroundColor: '#ff0000',
          pointBorderColor: '#ff0000',
          fill: false,
          tension: 0,
          showLine: false,
        },
        {
          label: `BW = ${bw.toFixed(2)} GHz (-3dB)`,
          data: bwPointsData,
          borderColor: '#0066cc',
          borderWidth: 3,
          borderDash: [3, 3],
          pointRadius: 6,
          pointBackgroundColor: '#0066cc',
          pointBorderColor: '#0066cc',
          fill: false,
          tension: 0,
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
          title: { display: true, text: 'Frequency (GHz)', font: { family: 'Times New Roman', size: 14 } },
          grid: { color: '#eee' },
        },
        y: {
          min: -60,
          max: 0,
          title: { display: true, text: 'Potência Transmitida (dB)', font: { family: 'Times New Roman', size: 14 } },
          grid: { color: '#eee' },
        },
      },
      plugins: { legend: { labels: { font: { family: 'Times New Roman' } } } },
    },
  });

  let infoBox = document.getElementById('resonanceInfo');
  if (!infoBox) {
    infoBox = document.createElement('div');
    infoBox.id = 'resonanceInfo';
    infoBox.style.cssText = "margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 4px; font-family: 'Times New Roman'; font-size: 14px;";
    document.querySelector('.chart-container').parentNode.insertBefore(infoBox, document.querySelector('.chart-container').nextSibling);
  }
  infoBox.innerHTML = `<strong>Resonant Frequency (fr):</strong> ${frFreq.toFixed(2)} GHz | <strong>Bandwidth (BW):</strong> ${bw.toFixed(2)} GHz (${fLower.toFixed(2)} - ${fUpper.toFixed(2)} GHz)`;
}

function exportToCSVHandler() {
  exportChartToCSV(chart, 'dados_s21_cruz_jerusalem.csv');
}

export function init() {
  ['fStart', 'fEnd', 'p', 'd', 'w', 'h', 'g', 'er'].forEach(bindInputs);

  const substrateSelect = document.getElementById('substrate_select');
  if (substrateSelect) {
    substrateSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'manual') {
        document.getElementById('er_num').removeAttribute('disabled');
        document.getElementById('h_sub_num').removeAttribute('disabled');
        document.getElementById('er_slider').removeAttribute('disabled');
        document.getElementById('h_sub_slider').removeAttribute('disabled');
      } else {
        document.getElementById('er_num').setAttribute('disabled', 'true');
        document.getElementById('h_sub_num').setAttribute('disabled', 'true');
        document.getElementById('er_slider').setAttribute('disabled', 'true');
        document.getElementById('h_sub_slider').setAttribute('disabled', 'true');
        applySubstratePreset(val);
      }
    });
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportToCSVHandler);

  updateAll();
}

function updateAll() {
  const fStart = parseFloat(document.getElementById('fStart_num').value);
  const fEnd = parseFloat(document.getElementById('fEnd_num').value);
  let p = parseFloat(document.getElementById('p_num').value);
  let d = parseFloat(document.getElementById('d_num').value);
  const w = parseFloat(document.getElementById('w_num').value);
  const h = parseFloat(document.getElementById('h_num').value);
  const g = parseFloat(document.getElementById('g_num').value);
  const er = parseFloat(document.getElementById('er_num').value);

  if (
    fStart <= 0 ||
    fEnd <= 0 ||
    p <= 0 ||
    d <= 0 ||
    w <= 0 ||
    h <= 0 ||
    g <= 0 ||
    er <= 0 ||
    fStart >= fEnd
  ) {
    if (chart) chart.destroy();
    return;
  }

  if (d >= p) d = p - 0.01;

  drawGeometry(p, d, w, h, g);

  const df = 0.001;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);
  const hCm = mmToCm(h);

  const data = [];
  const labels = [];

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      const XL1 = FF(pCm, wCm, lamb, ang);
      const Bg = ((4 * er * dCm) / pCm) * FF(pCm, gCm, lamb, ang);
      const Bd = ((4 * er * (2 * hCm + gCm)) / pCm) * FF(pCm, pCm - dCm, lamb, ang);
      const BC1 = Bg + Bd;
      const XL2 = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);

      const lamb3 = dCm / 0.43;
      const f3 = 30 / lamb3;
      const BC2 = (1 / XL2) * Math.pow(freq / f3, 2);

      const Y1 = 1 / (XL1 - 1 / BC1);
      const Y2 = 1 / (XL2 - 1 / BC2);
      const Yt = Y1 + Y2;

      const ct = 1 / Math.sqrt(1 + 0.25 * Math.pow(Yt, 2));
      const pt = Math.pow(ct, 2);
      const pt_dB = 10 * Math.log10(pt);

      labels.push(freq.toFixed(3));
      data.push(Math.max(-60, pt_dB));
    } catch (e) {
      data.push(0);
    }
  }

  updateChart(labels, data);
}

// Auto-init
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
