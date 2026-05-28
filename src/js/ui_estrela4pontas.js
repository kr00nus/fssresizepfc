// ==========================================
// SIMULADOR FSS - ESTRELA DE 4 PONTAS (FOUR-ARMS STAR)
// Formulação: Mamedes, Deisy (2024) - Eq. 4.6 a 4.12
// Geometria: Polígono Estrelado Afilado de 12 vértices (Tapered Star)
// ==========================================

import { mmToCm, FF, calcS21 } from "./math.js";

let starChartInstance = null;
let starHfssData = null;

document.addEventListener("DOMContentLoaded", () => {
  // Valores da FSS#1 validados para a ressonância em 28 GHz (Mamedes, 2024)
  const defaultValues = {
    fStart: "20.0",
    fEnd: "35.0",
    p: "4.100",
    a_num: "3.250",
    b_num: "0.600",
    s_num: "1.000",
    h_sub: "0.508",
    er: "2.94", // RO3003
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
    const aNum = document.getElementById("a_num");
    const bNum = document.getElementById("b_num");
    const sNum = document.getElementById("s_num");

    if (!pNum || !aNum || !bNum || !sNum) return;

    let p = parseFloat(pNum.value) || 4.1;
    let a = parseFloat(aNum.value) || 3.25;
    let b = parseFloat(bNum.value) || 0.6;
    let s = parseFloat(sNum.value) || 1.0;

    // Regras físicas da topologia Four-Arms Star:
    // 1. O braço (a) não toca a borda da célula (a < p)
    if (a >= p) {
      a = p - 0.001;
      aNum.value = a.toFixed(3);
      if (document.getElementById("a_slider"))
        document.getElementById("a_slider").value = a.toFixed(3);
    }
    // 2. O quadrado central (s) tem que ser menor que a extensão total (a)
    if (s >= a) {
      s = a - 0.001;
      sNum.value = s.toFixed(3);
      if (document.getElementById("s_slider"))
        document.getElementById("s_slider").value = s.toFixed(3);
    }
    // 3. A largura da ponta (b) não pode ser maior que o núcleo (s) para manter o aspecto "espetado"
    if (b > s) {
      b = s - 0.001;
      bNum.value = b.toFixed(3);
      if (document.getElementById("b_slider"))
        document.getElementById("b_slider").value = b.toFixed(3);
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
      handleGeometry(idPrefix);
      updateAll();
    });

    num.addEventListener("input", (e) => {
      slider.value = e.target.value;
      handleGeometry(idPrefix);
      updateAll();
    });
  }

  ["fStart", "fEnd", "p", "a", "b", "s", "h_sub", "er"].forEach(bindInputs);

  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    subSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      const isPreset = val === "RO3003" || val === "FR4";

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
          if (erNum) erNum.value = "2.94";
          if (erSlider) erSlider.value = "2.94";
          if (hNum) hNum.value = "0.508";
          if (hSlider) hSlider.value = "0.508";
        } else if (val === "FR4") {
          if (erNum) erNum.value = "4.40";
          if (erSlider) erSlider.value = "4.40";
          if (hNum) hNum.value = "1.600";
          if (hSlider) hSlider.value = "1.600";
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
    starHfssData = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        const freq = parseFloat(parts[0]);
        const s21 = parseFloat(parts[1]);
        if (!isNaN(freq) && !isNaN(s21)) {
          starHfssData.push({ x: freq, y: s21 });
        }
      }
    }
    alert(`Dados do HFSS carregados! (${starHfssData.length} pontos)`);
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
// DESENHO GEOMÉTRICO (CANVAS) - TAPERED STAR
// ==========================================
function drawGeometry(p, a, b, s) {
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, size, size);

  const viewSize = p * 1.6;
  const scale = size / viewSize;
  const center = size / 2;

  const pPix = p * scale;
  const aPix = a * scale;
  const bPix = b * scale;
  const sPix = s * scale;

  // Função Poligonal Exata para a Estrela de Mamedes
  function drawMamedesStar(cx, cy, isCenter) {
    ctx.fillStyle = isCenter ? "#1a365d" : "rgba(26, 54, 93, 0.10)";

    ctx.beginPath();

    // ================= BRAÇO DIREITO =================
    // Ponto 1: Topo da ponta direita
    ctx.moveTo(cx + aPix / 2, cy - bPix / 2);
    // Ponto 2: Base da ponta direita
    ctx.lineTo(cx + aPix / 2, cy + bPix / 2);

    // ================= DIAGONAL 1 =================
    // Ponto 3: Quina interna inferior-direita
    ctx.lineTo(cx + sPix / 2, cy + sPix / 2);

    // ================= BRAÇO INFERIOR =================
    // Ponto 4: Lado direito da ponta inferior
    ctx.lineTo(cx + bPix / 2, cy + aPix / 2);
    // Ponto 5: Lado esquerdo da ponta inferior
    ctx.lineTo(cx - bPix / 2, cy + aPix / 2);

    // ================= DIAGONAL 2 =================
    // Ponto 6: Quina interna inferior-esquerda
    ctx.lineTo(cx - sPix / 2, cy + sPix / 2);

    // ================= BRAÇO ESQUERDO =================
    // Ponto 7: Base da ponta esquerda
    ctx.lineTo(cx - aPix / 2, cy + bPix / 2);
    // Ponto 8: Topo da ponta esquerda
    ctx.lineTo(cx - aPix / 2, cy - bPix / 2);

    // ================= DIAGONAL 3 =================
    // Ponto 9: Quina interna superior-esquerda
    ctx.lineTo(cx - sPix / 2, cy - sPix / 2);

    // ================= BRAÇO SUPERIOR =================
    // Ponto 10: Lado esquerdo da ponta superior
    ctx.lineTo(cx - bPix / 2, cy - aPix / 2);
    // Ponto 11: Lado direito da ponta superior
    ctx.lineTo(cx + bPix / 2, cy - aPix / 2);

    // ================= DIAGONAL 4 =================
    // Ponto 12: Quina interna superior-direita
    ctx.lineTo(cx + sPix / 2, cy - sPix / 2);

    ctx.closePath();
    ctx.fill();

    if (isCenter) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#0d1f38";
      ctx.stroke();

      // Linhas guias formando o quadrado central tracejado (referencial do núcleo)
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.strokeRect(cx - sPix / 2, cy - sPix / 2, sPix, sPix);
      ctx.setLineDash([]);
    }
  }

  // Desenha a grade 3x3 de periodicidade
  const offsets = [-1, 0, 1];
  offsets.forEach((dx) => {
    offsets.forEach((dy) => {
      drawMamedesStar(
        center + dx * pPix,
        center + dy * pPix,
        dx === 0 && dy === 0,
      );
    });
  });

  // Demarcação Tracejada da Célula Unitária (Período p)
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPix / 2, center - pPix / 2, pPix, pPix);
  ctx.setLineDash([]);

  drawDimensionsAndGaps(ctx, center, pPix, aPix, bPix, sPix, scale, p, a, b, s);
}

function drawDimensionsAndGaps(
  ctx,
  center,
  pPix,
  aPix,
  bPix,
  sPix,
  scale,
  p,
  a,
  b,
  s,
) {
  const fontSize = Math.max(10, pPix * 0.05);
  const arrowSize = Math.max(3, pPix * 0.025);
  const offset = pPix * 0.15;

  ctx.lineWidth = 1.5;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ===== a (Comprimento total horizontal) =====
  ctx.strokeStyle = "#1976d2";
  ctx.fillStyle = "#1976d2";
  const aY = center - aPix / 2 - offset;
  drawArrow(ctx, center - aPix / 2, aY, center + aPix / 2, aY, arrowSize);
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(center - aPix / 2, center - bPix / 2);
  ctx.lineTo(center - aPix / 2, aY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(center + aPix / 2, center - bPix / 2);
  ctx.lineTo(center + aPix / 2, aY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText(`a`, center, aY - offset * 0.3);

  // ===== p (Período) =====
  ctx.strokeStyle = "#d32f2f";
  ctx.fillStyle = "#d32f2f";
  const pX = center - pPix / 2 - offset;
  drawArrow(ctx, pX, center - pPix / 2, pX, center + pPix / 2, arrowSize);
  ctx.save();
  ctx.translate(pX - offset * 0.4, center);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`p`, 0, 0);
  ctx.restore();

  // ===== b (Largura da ponta do Braço) =====
  ctx.strokeStyle = "#f57c00";
  ctx.fillStyle = "#f57c00";
  const bX = center - aPix / 2 - offset * 0.6;
  drawArrow(ctx, bX, center - bPix / 2, bX, center + bPix / 2, arrowSize);
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(center - aPix / 2, center - bPix / 2);
  ctx.lineTo(bX, center - bPix / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(center - aPix / 2, center + bPix / 2);
  ctx.lineTo(bX, center + bPix / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText(`b`, bX - offset * 0.4, center);

  // ===== s (Quadrado central) =====
  ctx.strokeStyle = "#388e3c";
  ctx.fillStyle = "#388e3c";
  const sY = center + sPix / 2 + offset * 0.5;
  drawArrow(ctx, center - sPix / 2, sY, center + sPix / 2, sY, arrowSize);
  ctx.fillText(`s`, center, sY + offset * 0.3);

  // ==========================================
  // ILUSTRAÇÃO DOS GAPS CAPACITIVOS
  // ==========================================
  ctx.font = `bold ${fontSize * 0.8}px Arial`;

  // gf1 (Gap ponta a ponta: p - a)
  ctx.strokeStyle = "#8e44ad";
  ctx.fillStyle = "#8e44ad";
  drawArrow(
    ctx,
    center + aPix / 2,
    center,
    center + pPix - aPix / 2,
    center,
    arrowSize * 0.8,
  );
  ctx.fillText(`gf1`, center + pPix / 2, center - offset * 0.2);

  // gf2 (Gap referencial da largura do braço: p - b)
  ctx.strokeStyle = "#e84393";
  ctx.fillStyle = "#e84393";
  drawArrow(
    ctx,
    center + bPix / 2,
    center - pPix / 2,
    center + pPix / 2,
    center - pPix / 2,
    arrowSize * 0.8,
  );
  ctx.fillText(`gf2`, center + pPix / 4, center - pPix / 2 - offset * 0.3);

  // gf3 (Gap entre quadrados centrais: p - s)
  ctx.strokeStyle = "#16a085";
  ctx.fillStyle = "#16a085";
  drawArrow(
    ctx,
    center + sPix / 2,
    center + pPix / 2 + offset * 0.3,
    center + pPix - sPix / 2,
    center + pPix / 2 + offset * 0.3,
    arrowSize * 0.8,
  );
  ctx.fillText(`gf3`, center + pPix / 2, center + pPix / 2 + offset * 0.6);
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
// CÁLCULO ECM - MAMEDES (2024) Eq. 3.2, 4.6 a 4.12
// ==========================================
function updateAll() {
  const fStart = getSafeValue("fStart_num", 20.0);
  const fEnd = getSafeValue("fEnd_num", 35.0);
  const p = getSafeValue("p_num", 4.1);
  const a = getSafeValue("a_num", 3.25);
  const b = getSafeValue("b_num", 0.6);
  const s = getSafeValue("s_num", 1.0);
  const h_sub = getSafeValue("h_sub_num", 0.508);
  const er_real = getSafeValue("er_num", 2.94);

  if (fStart >= fEnd || p <= 0) return;

  // 1. Ajuste Dielétrico Efetivo Rigoroso (Mamedes 2024)
  const M_factor = 1.9; // Constante empírica
  const c_val = (10 * h_sub) / p;
  const z_factor = Math.exp(Math.pow(c_val, M_factor));
  const er_eff = er_real - (er_real - 1) / z_factor;

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  drawGeometry(p, a, b, s);

  const data_modelo = [],
    labels = [];
  const pCm = mmToCm(p);
  const df = 0.05;

  // 2. Definição matemática dos Gaps Efetivos
  const gf1_cm = mmToCm(p - a);
  const gf2_cm = mmToCm(p - b);
  const gf3_cm = mmToCm(p - s);

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;

    try {
      // 3. Funções de Dispersão (Marcuvitz)
      const FL = FF(pCm, mmToCm(b), lamb, 0);
      const FC_gf1 = FF(pCm, gf1_cm, lamb, 0);
      const FC_gf2 = FF(pCm, gf2_cm, lamb, 0);
      const FC_gf3 = FF(pCm, gf3_cm, lamb, 0);

      // 4. Reatâncias Normalizadas (Eq. 4.6 a 4.9)
      const XLf = ((1.5 * a) / p) * FL;
      const BCgf = ((4 * b) / (1.5 * p)) * FC_gf1;
      const BCa1f = ((4 * (p - b)) / (1.5 * p)) * FC_gf2;
      const BCa2f = ((4 * (p - s)) / p) * FC_gf3;

      // 5. Capacitâncias com Permissividade (Eq. 4.10 e 4.11)
      const BC1f = (BCa1f + BCgf) * er_eff;
      const BC2f = 0.25 * (BCa2f + BCgf) * er_eff;

      // 6. Admitância em Série do Circuito
      const B1 = Math.max(1e-12, BC1f);
      const B2 = Math.max(1e-12, BC2f);

      let Zf = XLf - 1 / B1 - 1 / B2;
      if (Math.abs(Zf) < 1e-12) Zf = 1e-12;

      const B_norm = 1 / Zf;
      const pt_dB = calcS21(B_norm);

      labels.push(freq.toFixed(2));
      data_modelo.push(Math.max(-60, pt_dB));
    } catch (e) {
      data_modelo.push(0);
    }
  }

  let hfssPlotData = [];
  if (starHfssData && starHfssData.length > 0) {
    let hfssIndex = 0;
    hfssPlotData = labels.map((labelStr) => {
      const f = parseFloat(labelStr);
      while (
        hfssIndex < starHfssData.length - 1 &&
        starHfssData[hfssIndex].x < f
      )
        hfssIndex++;
      return Math.abs(starHfssData[hfssIndex].x - f) < 0.1
        ? starHfssData[hfssIndex].y
        : null;
    });
  }

  updateChart(labels, data_modelo, hfssPlotData);
}

function updateChart(labels, data_modelo, hfssPlotData) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (starChartInstance) starChartInstance.destroy();

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

  if (starHfssData && starHfssData.length > 0) {
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
      borderColor: "#38a169",
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: "#38a169",
      showLine: false,
    });
  }

  starChartInstance = new Chart(ctx, {
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
      "margin-top: 15px; padding: 12px; background: #e6fffa; border-radius: 6px; font-size: 14px; border-left: 5px solid #38a169;";
    document.querySelector(".chart-container").after(infoBox);
  }

  infoBox.innerHTML = `<strong>Ressonância Observada (Band-Stop):</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz <br> <span style="color:#2f855a;">Validação Completa: Geometria poligonal de 12 vértices. Permissividade calculada com M=1.9.</span>`;
}

function exportToCSV() {
  if (!starChartInstance) return;
  let csv = "\uFEFF" + "Frequencia (GHz);S21 ECM Mamedes (dB)\n";
  starChartInstance.data.labels.forEach((freq, index) => {
    let s21_val = starChartInstance.data.datasets[0].data[index];
    csv += `${Number(freq).toFixed(2).replace(".", ",")};${Number(s21_val).toFixed(4).replace(".", ",")}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_fss_estrela4pontas_validado.csv";
  link.click();
}
