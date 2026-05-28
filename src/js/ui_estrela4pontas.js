// ==========================================
// SIMULADOR FSS - ESTRELA DE 4 PONTAS (FOUR-ARMS STAR)
// Formulação: Mamedes, Deisy (2024) - Eq. 4.6 a 4.12
// Geometria: Polígono Estrelado Afilado (Tapered Arms)
// ==========================================

import { mmToCm, FF, calcS21 } from "./math.js";

let starChartInstance = null;
let starHfssData = null;

document.addEventListener("DOMContentLoaded", () => {
  // Valores padrão validados para a ressonância em 28 GHz (Mamedes, 2024)
  const defaultValues = {
    fStart: "20.0",
    fEnd: "35.0",
    p: "4.100",
    a_num: "3.250",
    b_num: "0.600",
    s_num: "1.000",
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
    const aNum = document.getElementById("a_num");
    const bNum = document.getElementById("b_num");
    const sNum = document.getElementById("s_num");

    if (!pNum || !aNum || !bNum || !sNum) return;

    let p = parseFloat(pNum.value) || 4.1;
    let a = parseFloat(aNum.value) || 3.25;
    let b = parseFloat(bNum.value) || 0.6;
    let s = parseFloat(sNum.value) || 1.0;

    // Travas físicas rigorosas da Geometria (Four-Arms Star)
    // 1. O comprimento total (a) não pode exceder o período (p)
    if (a >= p) {
      a = p - 0.001;
      aNum.value = a.toFixed(3);
      if (document.getElementById("a_slider"))
        document.getElementById("a_slider").value = a.toFixed(3);
    }
    // 2. O quadrado central (s) não pode ser maior que o comprimento total (a)
    if (s >= a) {
      s = a - 0.001;
      sNum.value = s.toFixed(3);
      if (document.getElementById("s_slider"))
        document.getElementById("s_slider").value = s.toFixed(3);
    }
    // 3. A largura da ponta (b) não pode ser maior que o quadrado central (s)
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
// DESENHO GEOMÉTRICO (CANVAS) - ESTRELA 4 PONTAS
// ==========================================
function drawGeometry(p, a, b, s) {
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
  const aPix = a * scale;
  const bPix = b * scale;
  const sPix = s * scale;

  // Função para traçar exatamente o polígono da Estrela de 4 Pontas
  function drawStar(cx, cy, isCenter) {
    ctx.fillStyle = isCenter ? "#1a365d" : "rgba(26, 54, 93, 0.15)";

    ctx.beginPath();
    // Inicia na ponta direita, lado superior
    ctx.moveTo(cx + aPix / 2, cy - bPix / 2);
    // Ponta direita, lado inferior
    ctx.lineTo(cx + aPix / 2, cy + bPix / 2);
    // Fresta interna (diagonal) até o quadrado central inferior-direito
    ctx.lineTo(cx + sPix / 2, cy + sPix / 2);
    // Ponta inferior, lado direito
    ctx.lineTo(cx + bPix / 2, cy + aPix / 2);
    // Ponta inferior, lado esquerdo
    ctx.lineTo(cx - bPix / 2, cy + aPix / 2);
    // Fresta interna (diagonal) até o quadrado central inferior-esquerdo
    ctx.lineTo(cx - sPix / 2, cy + sPix / 2);
    // Ponta esquerda, lado inferior
    ctx.lineTo(cx - aPix / 2, cy + bPix / 2);
    // Ponta esquerda, lado superior
    ctx.lineTo(cx - aPix / 2, cy - bPix / 2);
    // Fresta interna (diagonal) até o quadrado central superior-esquerdo
    ctx.lineTo(cx - sPix / 2, cy - sPix / 2);
    // Ponta superior, lado esquerdo
    ctx.lineTo(cx - bPix / 2, cy - aPix / 2);
    // Ponta superior, lado direito
    ctx.lineTo(cx + bPix / 2, cy - aPix / 2);
    // Fresta interna (diagonal) até o quadrado central superior-direito
    ctx.lineTo(cx + sPix / 2, cy - sPix / 2);

    ctx.closePath();
    ctx.fill();

    // Desenha uma borda leve para realçar as quinas
    if (isCenter) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#000";
      ctx.stroke();
    }
  }

  // Desenha a rede 3x3 para ilustrar a periodicidade
  const offsets = [-1, 0, 1];
  offsets.forEach((dx) => {
    offsets.forEach((dy) => {
      drawStar(center + dx * pPix, center + dy * pPix, dx === 0 && dy === 0);
    });
  });

  // Linhas da célula unitária (Tracejado)
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPix / 2, center - pPix / 2, pPix, pPix);
  ctx.setLineDash([]);

  drawDimensionsStar(ctx, center, pPix, aPix, bPix, sPix, scale, p, a, b, s);
}

function drawDimensionsStar(
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

  // Linhas guias para "a"
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
  ctx.fillText(`a = ${a.toFixed(2)}`, center, aY - offset * 0.3);

  // ===== p (Período) =====
  ctx.strokeStyle = "#d32f2f";
  ctx.fillStyle = "#d32f2f";
  const pX = center - pPix / 2 - offset;
  drawArrow(ctx, pX, center - pPix / 2, pX, center + pPix / 2, arrowSize);
  ctx.save();
  ctx.translate(pX - offset * 0.4, center);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`p = ${p.toFixed(2)}`, 0, 0);
  ctx.restore();

  // ===== b (Largura da ponta do Braço) =====
  ctx.strokeStyle = "#f57c00";
  ctx.fillStyle = "#f57c00";
  const bX = center + aPix / 2 + offset * 0.6;
  drawArrow(ctx, bX, center - bPix / 2, bX, center + bPix / 2, arrowSize);

  // Linhas guias para "b"
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(center + aPix / 2, center - bPix / 2);
  ctx.lineTo(bX, center - bPix / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(center + aPix / 2, center + bPix / 2);
  ctx.lineTo(bX, center + bPix / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText(`b = ${b.toFixed(2)}`, bX + offset * 0.5, center);

  // ===== s (Quadrado central) =====
  ctx.strokeStyle = "#388e3c";
  ctx.fillStyle = "#388e3c";
  const sY = center + sPix / 2 + offset * 0.8;
  drawArrow(ctx, center - sPix / 2, sY, center + sPix / 2, sY, arrowSize);

  // Linhas guias para "s"
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(center - sPix / 2, center + sPix / 2);
  ctx.lineTo(center - sPix / 2, sY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(center + sPix / 2, center + sPix / 2);
  ctx.lineTo(center + sPix / 2, sY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText(`s = ${s.toFixed(2)}`, center, sY + offset * 0.3);
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
// CÁLCULO ECM - MAMEDES (2024) Eq. 4.6 a 4.12
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

  // Ajuste Dielétrico (Ana Luiza, 2023)
  const N_ajuste = 1.8;
  const c_factor = (10 * h_sub) / p;
  const z_factor = Math.exp(c_factor);
  const er_eff = er_real + (er_real - 1) * (-1 / Math.pow(z_factor, N_ajuste));

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  drawGeometry(p, a, b, s);

  const data_modelo = [],
    labels = [];
  const pCm = mmToCm(p);
  const df = 0.05;

  // Gaps definidos pela geometria cruzada
  const gf1_cm = mmToCm(p - a);
  const gf2_cm = mmToCm(p - b);
  const gf3_cm = mmToCm(p - s);

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;

    try {
      // Funções de Dispersão de Marcuvitz
      const FL = FF(pCm, mmToCm(b), lamb, 0);
      const FC_gf1 = FF(pCm, gf1_cm, lamb, 0);
      const FC_gf2 = FF(pCm, gf2_cm, lamb, 0);
      const FC_gf3 = FF(pCm, gf3_cm, lamb, 0);

      // Reatâncias Normalizadas (Eq. 4.6 a 4.9)
      const XLf = ((1.5 * a) / p) * FL;
      const BCgf = ((4 * b) / (1.5 * p)) * FC_gf1;
      const BCa1f = ((4 * (p - b)) / (1.5 * p)) * FC_gf2;
      const BCa2f = ((4 * (p - s)) / p) * FC_gf3;

      // Capacitâncias Efetivas com Dielétrico (Eq. 4.10 e 4.11)
      const BC1f = (BCa1f + BCgf) * er_eff;
      const BC2f = 0.25 * (BCa2f + BCgf) * er_eff;

      // Impedância em Série do Circuito (Eq. 4.12)
      // Evita divisão por zero
      const B1 = Math.max(1e-12, BC1f);
      const B2 = Math.max(1e-12, BC2f);

      let Zf = XLf - 1 / B1 - 1 / B2;
      if (Math.abs(Zf) < 1e-12) Zf = 1e-12; // Previne Infinity

      const B_norm = 1 / Zf;
      const pt_dB = calcS21(B_norm); // S21 = 4 / (4 + B_norm^2)

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

  infoBox.innerHTML = `<strong>Ressonância Observada (Band-Stop):</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz <br> <span style="color:#2f855a;">A geometria estrela de 4 pontas atua como um circuito ressonante série associado em paralelo à onda de propagação.</span>`;
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
  link.download = "dados_fss_estrela4pontas.csv";
  link.click();
}
