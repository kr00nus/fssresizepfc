// ==========================================
// SIMULADOR FSS - ESTRELA DE 4 PONTAS ESPETADA (TAPERED STAR)
// Formulação ECM: Mamedes, Deisy (2024)
// Desenho Geométrico: Polígono contínuo de 20 vértices com parâmetro "c"
// ==========================================

import { mmToCm, FF, calcS21 } from "../core/math.js";
import { initSubstrateSelector } from "../common/substrate-selector.js";
import { drawCircuitEstrela } from "../common/circuit-diagram.js";

let starChartInstance = null;
let starHfssData = null;
let KL_AUTO = 1.0;

document.addEventListener("DOMContentLoaded", () => {
  function calibrateKL() {
    const p = 4.1, a = 3.25, b = 0.6, s = 1.0;
    const h_sub = 0.508, er_real = 2.94;
    const M_factor = 1.9;
    const er_eff = er_real + (er_real - 1) * (-1 / Math.exp((10 * h_sub) / (p * M_factor)));

    const lamb = 30 / 28.0; // Alvo do livro: 28 GHz
    const pCm = p / 10;
    const gf1_cm = (p - a) / 10;
    const gf2_cm = (p - b) / 10;
    const gf3_cm = (p - s) / 10;

    const FL = FF(pCm, b / 10, lamb, 0);
    const FC_gf1 = FF(pCm, gf1_cm, lamb, 0);
    const FC_gf2 = FF(pCm, gf2_cm, lamb, 0);
    const FC_gf3 = FF(pCm, gf3_cm, lamb, 0);

    const XLf_base = ((1.5 * a) / p) * FL;
    const BCgf = ((4 * b) / (1.5 * p)) * FC_gf1;
    const BCa1f = ((4 * (p - b)) / (1.5 * p)) * FC_gf2;
    const BCa2f = ((4 * (p - s)) / p) * FC_gf3;

    const BC1f = (BCa1f + BCgf) * er_eff;
    const BC2f = 0.25 * (BCa2f + BCgf) * er_eff;

    const B1 = Math.max(1e-12, BC1f);
    const B2 = Math.max(1e-12, BC2f);

    // Para a ressonância ocorrer em 28 GHz, Zf deve ser zero.
    // Zf = KL_AUTO * XLf_base - 1 / B1 - 1 / B2 = 0
    KL_AUTO = (1 / B1 + 1 / B2) / XLf_base;
  }

  calibrateKL();
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

    const setVal = (id, val) => {
      document.getElementById(`${id}_num`).value = val.toFixed(3);
      if (document.getElementById(`${id}_slider`))
        document.getElementById(`${id}_slider`).value = val.toFixed(3);
    };

    // HIERARQUIA FÍSICA E GEOMÉTRICA DA ESTRELA
    if (a >= p) {
      a = p - 0.001;
      setVal("a", a);
    }
    if (s > a) {
      s = a;
      setVal("s", s);
    }
    if (b > a / 2) {
      b = a / 2;
      setVal("b", b);
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

  ["fStart", "fEnd", "p", "a", "b", "s", "h_sub", "er"].forEach(
    bindInputs,
  );

  // Seletor de substrato centralizado
  initSubstrateSelector(() => updateAll());
  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
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
        if (!isNaN(freq) && !isNaN(s21)) starHfssData.push({ x: freq, y: s21 });
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
// DESENHO GEOMÉTRICO (CANVAS)
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

  // Lógica do polígono (Estrela na Diagonal, quadrados sem rotação)
  function drawMamedesStar(cx, cy, isCenter) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = isCenter ? "#1a365d" : "rgba(26, 54, 93, 0.10)";

    const L = aPix / 2 - bPix / 2;

    const positions = [
      { x: L, y: -L },   // TR
      { x: -L, y: -L },  // TL
      { x: -L, y: L },   // BL
      { x: L, y: L }     // BR
    ];

    // 1. QUADRADOS DAS PONTAS
    ctx.beginPath();
    positions.forEach(pos => {
      ctx.rect(pos.x - bPix / 2, pos.y - bPix / 2, bPix, bPix);
    });
    ctx.fill();

    // 2. HASTES (Conectando aos quadrados)
    ctx.beginPath();
    positions.forEach(pos => {
      if (pos.x > 0 && pos.y < 0) { // Top-Right
        ctx.moveTo(pos.x - bPix / 2, pos.y - bPix / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(pos.x + bPix / 2, pos.y + bPix / 2);
      } else if (pos.x < 0 && pos.y < 0) { // Top-Left
        ctx.moveTo(pos.x + bPix / 2, pos.y - bPix / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(pos.x - bPix / 2, pos.y + bPix / 2);
      } else if (pos.x < 0 && pos.y > 0) { // Bottom-Left
        ctx.moveTo(pos.x - bPix / 2, pos.y - bPix / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(pos.x + bPix / 2, pos.y + bPix / 2);
      } else if (pos.x > 0 && pos.y > 0) { // Bottom-Right
        ctx.moveTo(pos.x + bPix / 2, pos.y - bPix / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(pos.x - bPix / 2, pos.y + bPix / 2);
      }
    });
    ctx.fill();

    // 3. QUADRADO CENTRAL (fixo padrão, sem angulatura)
    ctx.beginPath();
    ctx.rect(-sPix / 2, -sPix / 2, sPix, sPix);
    ctx.fill();

    ctx.restore();
  }

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

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPix / 2, center - pPix / 2, pPix, pPix);
  ctx.setLineDash([]);

  drawDimensionsAndGaps(
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
  );
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
  const fontSize = Math.max(12, pPix * 0.05);
  const arrowSize = Math.max(3, pPix * 0.025);
  const offset = pPix * 0.15;

  ctx.lineWidth = 1.5;
  ctx.font = `italic bold ${fontSize}px "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ===== a_p (Comprimento total vertical à esquerda) =====
  ctx.strokeStyle = "#1976d2";
  ctx.fillStyle = "#1976d2";
  const aX = center - aPix / 2 - offset * 0.5;
  drawArrow(ctx, aX, center - aPix / 2, aX, center + aPix / 2, arrowSize);
  ctx.save();
  ctx.translate(aX - offset * 0.3, center);
  // Remove rotation for a_p text to match standard image if we want, or keep it.
  ctx.fillText(`a_p`, 0, 0);
  ctx.restore();

  // ===== p_p (Período no topo) =====
  ctx.strokeStyle = "#d32f2f";
  ctx.fillStyle = "#d32f2f";
  const pY = center - pPix / 2 - offset * 0.4;
  drawArrow(ctx, center - pPix / 2, pY, center + pPix / 2, pY, arrowSize);
  ctx.fillText(`p_p`, center, pY - offset * 0.3);

  // ===== b_p (Altura da ponta direita) =====
  ctx.strokeStyle = "#f57c00";
  ctx.fillStyle = "#f57c00";
  const L = aPix / 2 - bPix / 2;
  const bX = center + L + bPix / 2 + offset * 0.4;
  drawArrow(ctx, bX, center - L - bPix / 2, bX, center - L + bPix / 2, arrowSize);
  ctx.fillText(`b_p`, bX + offset * 0.3, center - L);

  // ===== s_p (Largura do quadrado central embaixo) =====
  ctx.strokeStyle = "#388e3c";
  ctx.fillStyle = "#388e3c";
  const sY = center + sPix / 2 + offset * 0.3;

  // Desenha linhas tracejadas descendo do quadrado central
  ctx.beginPath();
  ctx.setLineDash([2, 2]);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.moveTo(center - sPix / 2, center + sPix / 2);
  ctx.lineTo(center - sPix / 2, sY);
  ctx.moveTo(center + sPix / 2, center + sPix / 2);
  ctx.lineTo(center + sPix / 2, sY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#388e3c";
  drawArrow(ctx, center - sPix / 2, sY, center + sPix / 2, sY, arrowSize);
  ctx.fillText(`s_p`, center, sY + offset * 0.3);

  // ===== Eixo x-y =====
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  ctx.lineWidth = 2;
  const axisX = (center * 2) - offset * 1.5;
  const axisY = (center * 2) - offset * 1.5;
  const axisLen = offset;

  drawArrow(ctx, axisX, axisY, axisX + axisLen, axisY, arrowSize);
  drawArrow(ctx, axisX, axisY, axisX, axisY - axisLen, arrowSize);

  ctx.font = `italic bold ${fontSize}px "Times New Roman", serif`;
  ctx.fillText(`x`, axisX + axisLen + offset * 0.2, axisY);
  ctx.fillText(`y`, axisX - offset * 0.2, axisY - axisLen - offset * 0.2);
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
// CÁLCULO ECM - MATEMÁTICA MAMEDES (2024) Pura
// O parâmetro c não afeta as equações de micro-ondas!
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

  const M_factor = 1.9;
  const er_eff = er_real + (er_real - 1) * (-1 / Math.exp((10 * h_sub) / (p * M_factor)));

  const f_GHz_analitico = 0.3 / (2 * (a / 1000) * Math.sqrt(er_eff));

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  drawGeometry(p, a, b, s);

  const data_modelo = [],
    labels = [];
  const pCm = mmToCm(p);
  const df = 0.05;

  const gf1_cm = mmToCm(p - a);
  const gf2_cm = mmToCm(p - b);
  const gf3_cm = mmToCm(p - s);

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    try {
      const FL = FF(pCm, mmToCm(b), lamb, 0);
      const FC_gf1 = FF(pCm, gf1_cm, lamb, 0);
      const FC_gf2 = FF(pCm, gf2_cm, lamb, 0);
      const FC_gf3 = FF(pCm, gf3_cm, lamb, 0);

      const XLf = ((1.5 * a) / p) * FL;

      const BCgf = KL_AUTO * ((4 * b) / (1.5 * p)) * FC_gf1;
      const BCa1f = KL_AUTO * ((4 * (p - b)) / (1.5 * p)) * FC_gf2;
      const BCa2f = KL_AUTO * ((4 * (p - s)) / p) * FC_gf3;

      const BC1f = (BCa1f + BCgf) * er_eff;
      const BC2f = 0.25 * (BCa2f + BCgf) * er_eff;

      const B1 = Math.max(1e-12, BC1f);
      const B2 = Math.max(1e-12, BC2f);

      let Zf = XLf - 1 / B1 - 1 / B2;
      if (Math.abs(Zf) < 1e-12) Zf = 1e-12;

      const B_norm = 1 / Zf;
      // Usamos a função padrão, mas se a curva ficar muito aguda ou profunda, Math.max corta no limite do gráfico.
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
  updateChart(labels, data_modelo, hfssPlotData, f_GHz_analitico);

  // === FEEDBACK VISUAL DE REATÂNCIAS NA RESSONÂNCIA ===
  const minIdx = data_modelo.indexOf(Math.min(...data_modelo));
  const frFreq = parseFloat(labels[minIdx]);

  if (!isNaN(frFreq) && frFreq > 0) {
    const lamb_r = 30 / frFreq;
    const FL_r = FF(pCm, mmToCm(b), lamb_r, 0);
    const FC_gf1_r = FF(pCm, gf1_cm, lamb_r, 0);
    const FC_gf2_r = FF(pCm, gf2_cm, lamb_r, 0);
    const FC_gf3_r = FF(pCm, gf3_cm, lamb_r, 0);

    const XLf_r = ((1.5 * a) / p) * FL_r;
    const BCgf_r = KL_AUTO * ((4 * b) / (1.5 * p)) * FC_gf1_r;
    const BCa1f_r = KL_AUTO * ((4 * (p - b)) / (1.5 * p)) * FC_gf2_r;
    const BCa2f_r = KL_AUTO * ((4 * (p - s)) / p) * FC_gf3_r;
    const BC1f_r = (BCa1f_r + BCgf_r) * er_eff;
    const BC2f_r = 0.25 * (BCa2f_r + BCgf_r) * er_eff;
    const B1_r = Math.max(1e-12, BC1f_r);
    const B2_r = Math.max(1e-12, BC2f_r);
    let Zf_r = XLf_r - 1 / B1_r - 1 / B2_r;
    if (Math.abs(Zf_r) < 1e-12) Zf_r = 1e-12;
    const B_total_r = Math.abs(1 / Zf_r);

    const fmt = (v) => v.toFixed(4);
    const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setVal("val_XL", `${fmt(XLf_r)} @ ${frFreq.toFixed(2)} GHz`);
    setVal("val_BC1", `${fmt(BC1f_r)} (×ε_eff)`);
    setVal("val_BC2", `${fmt(BC2f_r)} (×ε_eff)`);
    setVal("val_Zseries", `${fmt(Zf_r)}`);
    setVal("val_Yshunt", `${fmt(B_total_r)}`);
    setVal("val_erEff", `${er_eff.toFixed(4)}`);

    // Desenha o circuito equivalente visual
    drawCircuitEstrela({
      XL: fmt(XLf_r),
      BC1: fmt(BC1f_r),
      BC2: fmt(BC2f_r),
      Zf: fmt(Zf_r),
      Yf: fmt(B_total_r),
    });
  }
}

function updateChart(labels, data_modelo, hfssPlotData, f_GHz_analitico) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (starChartInstance) starChartInstance.destroy();

  const minIndex = data_modelo.indexOf(Math.min(...data_modelo));
  const frFreq = parseFloat(labels[minIndex]);

  const datasets = [
    {
      label: "Resposta em Frequência S21",
      data: data_modelo,
      borderColor: "#1a365d",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0.1,
      pointStyle: "rect",
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
      tension: 0.1,
      pointStyle: "rect",
    });
  }

  if (minIndex !== -1 && !isNaN(frFreq)) {
    datasets.push({
      label: `fr (Ressonância ECM) = ${frFreq.toFixed(2)} GHz`,
      data: labels.map((_, idx) =>
        idx === minIndex ? data_modelo[idx] : null,
      ),
      borderColor: "#38a169",
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: "#38a169",
      showLine: false,
      pointStyle: "circle",
    });
  }

  let f_low = null;
  let f_high = null;
  let idx_low = -1;
  let idx_high = -1;
  for (let i = 0; i < data_modelo.length; i++) {
    if (data_modelo[i] <= -10) {
      if (f_low === null) { f_low = parseFloat(labels[i]); idx_low = i; }
      f_high = parseFloat(labels[i]);
      idx_high = i;
    }
  }
  let bw = f_low !== null ? (f_high - f_low).toFixed(2) : "-";

  if (idx_low !== -1 && idx_high !== -1) {
    const bwPointData = labels.map((_, idx) =>
      (idx === idx_low || idx === idx_high) ? data_modelo[idx] : null
    );
    datasets.push({
      label: `BW (-10 dB) = ${bw} GHz`,
      data: bwPointData,
      borderColor: "#805ad5",
      borderWidth: 2,
      pointRadius: 5,
      pointBackgroundColor: "#805ad5",
      showLine: false,
      pointStyle: "circle",
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
      plugins: {
        legend: {
          labels: {
            font: { family: "Arial", size: 13 },
            usePointStyle: true,
          }
        }
      },
    },
  });

  // === CÁLCULO DA BANDA E FR DO HFSS ===
  let hfss_fr = null;
  let hfss_bw = "-";
  if (starHfssData && starHfssData.length > 0) {
    let minS21 = Infinity;
    let minFreq = null;
    let h_low = null;
    let h_high = null;

    for (let i = 0; i < starHfssData.length; i++) {
      const pt = starHfssData[i];
      if (pt.y < minS21) {
        minS21 = pt.y;
        minFreq = pt.x;
      }
      if (pt.y <= -10) {
        if (h_low === null) h_low = pt.x;
        h_high = pt.x;
      }
    }
    hfss_fr = minFreq;
    if (h_low !== null && h_high !== null) {
      hfss_bw = (h_high - h_low).toFixed(2);
    }
  }

  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText =
      "margin-top: 15px; padding: 12px; background: #e6fffa; border-radius: 6px; font-size: 14px; border-left: 5px solid #38a169;";
    document.querySelector(".chart-container").after(infoBox);
  }

  let infoHtml = `<strong>Ressonância ECM (Band-Stop):</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz <br> <strong>Banda (-10 dB):</strong> ${bw} GHz <br> <span style="color:#d35400;">Calibração Analítica (KL = ${KL_AUTO.toFixed(2)}) Mamedes (2024).</span>`;
  if (starHfssData && starHfssData.length > 0) {
    let frErrorHtml = "";
    if (hfss_fr !== null && !isNaN(frFreq)) {
      const err = Math.abs(frFreq - hfss_fr) / hfss_fr * 100;
      frErrorHtml = `(Erro: ${err.toFixed(2)}%)`;
    }
    let bwErrorHtml = "";
    if (hfss_bw !== "-" && bw !== "-") {
      const err = Math.abs(parseFloat(bw) - parseFloat(hfss_bw)) / parseFloat(hfss_bw) * 100;
      bwErrorHtml = `(Erro: ${err.toFixed(2)}%)`;
    }
    
    infoHtml += `<br><br><span style="color:#dc3545; font-weight:bold;">Dados Ansys HFSS:</span><br>
                 <strong>Ressonância HFSS:</strong> ${hfss_fr !== null ? hfss_fr.toFixed(2) : "-"} GHz <span style="color:#e65100; font-weight:bold; margin-left:8px;">${frErrorHtml}</span><br>
                 <strong>Banda HFSS (-10 dB):</strong> ${hfss_bw} GHz <span style="color:#e65100; font-weight:bold; margin-left:8px;">${bwErrorHtml}</span>`;
  }
  infoBox.innerHTML = infoHtml;
}

function exportToCSV() {
  if (!starChartInstance) return;
  let csv = "\uFEFF" + "Frequencia (GHz);S21 ECM Mamedes (dB)\n";
  starChartInstance.data.labels.forEach((freq, index) => {
    csv += `${Number(freq).toFixed(2).replace(".", ",")};${Number(starChartInstance.data.datasets[0].data[index]).toFixed(4).replace(".", ",")}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_fss_estrela4pontas.csv";
  link.click();
}
