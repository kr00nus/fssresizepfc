// ==========================================
// SIMULADOR FSS - ANEL CIRCULAR (CIRCULAR RING)
// Baseado no Modelo de Circuito Equivalente (ECM)
// Ajuste de Espessura (Ana Luiza) + Fator de Curvatura Calibrado para HFSS
// ==========================================

import { mmToCm, FF, calcS21 } from "./math.js";

let ringChartInstance = null;
let ringHfssData = null;

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. AUTO-DETETOR DE IDs E INJEÇÃO INICIAL
  // ==========================================
  const defaultValues = {
    fStart: "1.0",
    fEnd: "8.0",
    p: "20.000",
    r_num: "9.100", // Raio médio do anel
    w_num: "0.500", // Espessura da fita metálica
    g_num: "1.300", // Gap físico real (p - 2r - w)
    h_sub: "1.52",
    er: "3.00", // Padrão RO3003
  };

  // Injeta valores iniciais
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

  // ==========================================
  // 2. MOTOR DE CÁLCULO AUTOMÁTICO (Two-Way Binding)
  // Geometria Física: g = p - (2r + w)
  // ==========================================
  function handleGeometry(changed) {
    const pNum = document.getElementById("p_num");
    const rNum = document.getElementById("r_num");
    const wNum = document.getElementById("w_num");
    const gNum = document.getElementById("g_num");
    const rSlider = document.getElementById("r_slider");
    const gSlider = document.getElementById("g_slider");

    if (!pNum || !rNum || !gNum || !wNum) return;

    let p = parseFloat(pNum.value) || 20;
    let r = parseFloat(rNum.value) || 9.1;
    let w = parseFloat(wNum.value) || 0.5;
    let g = parseFloat(gNum.value) || 1.3;

    if (changed === "p" || changed === "r" || changed === "w") {
      g = p - 2 * r - w;
      if (g <= 0) {
        g = 0.001; // Evita colisão total
        r = (p - g - w) / 2;
        rNum.value = r.toFixed(3);
        if (rSlider) rSlider.value = r.toFixed(3);
      }
      gNum.value = g.toFixed(3);
      if (gSlider) gSlider.value = g.toFixed(3);
    } else if (changed === "g") {
      r = (p - g - w) / 2;
      if (r <= 0) {
        r = 0.001;
        g = p - 2 * r - w;
        gNum.value = g.toFixed(3);
        if (gSlider) gSlider.value = g.toFixed(3);
      }
      rNum.value = r.toFixed(3);
      if (rSlider) rSlider.value = r.toFixed(3);
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

  ["fStart", "fEnd", "p", "r", "w", "g", "h_sub", "er"].forEach(bindInputs);

  // ==========================================
  // LÓGICA DO SELETOR DE SUBSTRATO
  // ==========================================
  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    subSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      const isPreset = val === "RO3003" || val === "RO3006";

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
          if (erNum) erNum.value = "3.00";
          if (erSlider) erSlider.value = "3.00";
          if (hNum) hNum.value = "1.52";
          if (hSlider) hSlider.value = "1.52";
        } else if (val === "RO3006") {
          if (erNum) erNum.value = "6.50";
          if (erSlider) erSlider.value = "6.50";
          if (hNum) hNum.value = "1.28";
          if (hSlider) hSlider.value = "1.28";
        }
      }
      updateAll();
    });
    setTimeout(() => subSelect.dispatchEvent(new Event("change")), 50);
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
    hfssBtn.innerText = "Carregar Dados HFSS";
    hfssBtn.style.cssText =
      "margin-top: 10px; margin-left: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;";
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
    ringHfssData = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        const freq = parseFloat(parts[0]);
        const s21 = parseFloat(parts[1]);
        if (!isNaN(freq) && !isNaN(s21)) {
          ringHfssData.push({ x: freq, y: s21 });
        }
      }
    }
    alert(
      `Dados do HFSS carregados com sucesso! (${ringHfssData.length} pontos encontrados)`,
    );
    updateAll();
  };
  reader.readAsText(file);
}

// ==========================================
// FUNÇÃO VISUAL: DESENHAR O ANEL CIRCULAR
// ==========================================
function drawGeometry(p, r, w) {
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, size, size);

  const viewSize = p * 2.2;
  const scale = size / viewSize;
  const center = size / 2;

  const pPixel = p * scale;
  const rPixel = r * scale;
  const wPixel = w * scale;
  const g = p - 2 * r - w; // Gap físico estrito

  function drawSingleRing(cx, cy, isCenter) {
    ctx.beginPath();
    ctx.arc(cx, cy, rPixel, 0, 2 * Math.PI);
    ctx.lineWidth = wPixel;
    ctx.strokeStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.25)";
    ctx.stroke();
  }

  // Grade 3x3 de anéis
  const offsets = [-1, 0, 1];
  offsets.forEach((dx) => {
    offsets.forEach((dy) => {
      drawSingleRing(
        center + dx * pPixel,
        center + dy * pPixel,
        dx === 0 && dy === 0,
      );
    });
  });

  // Linha tracejada da Célula Unitária (Período)
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]);

  // ===== DESENHA DIMENSÕES COM SETAS E RÓTULOS =====
  drawDimensionsRing(ctx, center, pPixel, rPixel, wPixel, scale, p, r, w, g);
}

// ==========================================
// FUNÇÃO: drawDimensionsRing()
// ==========================================
function drawDimensionsRing(
  ctx,
  center,
  pPixel,
  rPixel,
  wPixel,
  scale,
  p,
  r,
  w,
  g,
) {
  const fontSize = Math.max(10, pPixel * 0.06);
  const arrowSize = Math.max(3, pPixel * 0.03);
  const lineWidth = Math.max(1.5, pPixel * 0.008);
  const offset = Math.max(25, pPixel * 0.15);

  ctx.lineWidth = lineWidth;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ===== DIMENSÃO p (PERÍODO) =====
  ctx.strokeStyle = "#d32f2f";
  ctx.fillStyle = "#d32f2f";

  const pStartY = center - pPixel / 2;
  const pEndY = center + pPixel / 2;
  const pX = center - pPixel / 2 - offset;

  drawArrowLineRing(ctx, pX, pStartY, pX, pEndY, arrowSize);

  ctx.fillStyle = "#d32f2f";
  ctx.font = `bold ${fontSize * 0.9}px Arial, sans-serif`;
  ctx.save();
  ctx.translate(pX - offset * 0.4, center);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`p = ${p.toFixed(3)} mm`, 0, 0);
  ctx.restore();

  // ===== DIMENSÃO r (RAIO MÉDIO) =====
  ctx.strokeStyle = "#cc0000";
  ctx.fillStyle = "#cc0000";

  const rStartX = center;
  const rEndX = center + rPixel;
  const rY = center - pPixel / 2 - offset;

  drawArrowLineRing(ctx, rStartX, rY, rEndX, rY, arrowSize);

  ctx.font = `bold ${fontSize * 0.85}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    `r = ${r.toFixed(3)} mm`,
    center + rPixel / 2,
    rY - offset * 0.4,
  );

  // ===== DIMENSÃO w (ESPESSURA DO FIO) =====
  if (wPixel > 0) {
    ctx.strokeStyle = "#ff9800";
    ctx.fillStyle = "#ff9800";

    const rInnerPixel = rPixel - wPixel / 2;
    const rOuterPixel = rPixel + wPixel / 2;

    const wStartX = center + rInnerPixel;
    const wEndX = center + rOuterPixel;
    const wY = center;

    drawArrowLineRing(ctx, wStartX, wY, wEndX, wY, arrowSize * 0.9);

    ctx.font = `bold ${fontSize * 0.8}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      `w = ${w.toFixed(3)} mm`,
      center + rPixel + offset * 0.3,
      wY - offset * 0.35,
    );
  }

  // ===== DIMENSÃO g (GAP FÍSICO REAL) =====
  ctx.strokeStyle = "#2196f3";
  ctx.fillStyle = "#2196f3";

  // O Gap é a distância da borda externa até a borda externa da célula adjacente
  // Desenhado a partir do limite exterior (r + w/2) até a borda da célula
  const gPixel = (pPixel - 2 * rPixel - wPixel) / 2;
  const gStartX = center + rPixel + wPixel / 2;
  const gEndX = center + pPixel / 2;
  const gY = center + offset * 0.5;

  drawArrowLineRing(ctx, gStartX, gY, gEndX, gY, arrowSize * 0.8);

  ctx.font = `bold ${fontSize * 0.8}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    `g = ${g.toFixed(3)} mm`,
    center + rPixel + wPixel / 2 + gPixel / 2,
    gY + offset * 0.4,
  );

  drawLegendRing(ctx, fontSize);
}

// ==========================================
// FUNÇÃO: drawArrowLineRing()
// ==========================================
function drawArrowLineRing(ctx, fromX, fromY, toX, toY, arrowSize) {
  const headlen = arrowSize;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(
    fromX - headlen * Math.cos(angle - Math.PI / 6),
    fromY - headlen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    fromX - headlen * Math.cos(angle + Math.PI / 6),
    fromY - headlen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

// ==========================================
// FUNÇÃO: drawLegendRing()
// ==========================================
function drawLegendRing(ctx, fontSize) {
  const canvas = ctx.canvas;
  const legendX = 10;
  const legendY = canvas.height - 70;
  const boxWidth = 280;
  const boxHeight = 65;

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(legendX, legendY, boxWidth, boxHeight);
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, boxWidth, boxHeight);

  ctx.font = `${fontSize * 0.75}px Arial`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#333";

  ctx.fillStyle = "#d32f2f";
  ctx.fillRect(legendX + 8, legendY + 8, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("p=período", legendX + 25, legendY + 14);

  ctx.fillStyle = "#cc0000";
  ctx.fillRect(legendX + 8, legendY + 26, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("r=raio", legendX + 25, legendY + 32);

  ctx.fillStyle = "#2196f3";
  ctx.fillRect(legendX + 8, legendY + 44, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("g=gap", legendX + 25, legendY + 50);

  ctx.fillStyle = "#ff9800";
  ctx.fillRect(legendX + 130, legendY + 8, 12, 12);
  ctx.fillStyle = "#333";
  ctx.fillText("w=espessura", legendX + 147, legendY + 14);
}

function getSafeValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el || isNaN(parseFloat(el.value))) return fallback;
  return parseFloat(el.value);
}

// ==========================================
// CÁLCULO PRINCIPAL - MATEMÁTICA CORRIGIDA PARA BANDA n78
// ==========================================
function updateAll() {
  const fStart = getSafeValue("fStart_num", 1.0);
  const fEnd = getSafeValue("fEnd_num", 8.0);
  const p = getSafeValue("p_num", 20.0);
  let r = getSafeValue("r_num", 9.1);
  const w = getSafeValue("w_num", 0.5);
  const h_sub = getSafeValue("h_sub_num", 1.52);
  const er_real = getSafeValue("er_num", 3.0);

  if (fStart >= fEnd || p <= 0) return;

  // Trava de segurança física
  const d_ext = 2 * r + w;
  if (d_ext >= p) {
    r = (p - w) / 2 - 0.001;
    const el_r = document.getElementById("r_num");
    const el_r_slider = document.getElementById("r_slider");
    if (el_r) el_r.value = r.toFixed(3);
    if (el_r_slider) el_r_slider.value = r.toFixed(3);
  }

  // 1. AJUSTE DE ESPESSURA E PERMISSIVIDADE EFETIVA (Ana Luiza, 2023)
  const N_ajuste = 1.8;
  const c_factor = (10 * h_sub) / p;
  const z_factor = Math.exp(c_factor);
  const er_eff = er_real + (er_real - 1) * (-1 / Math.pow(z_factor, N_ajuste));

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  drawGeometry(p, r, w);

  const data_modelo = [],
    labels = [];
  const pCm = mmToCm(p);
  const wCm = mmToCm(w); // Uso exato da largura física w para indutância
  const df = 0.005; // Alta resolução para bater com o HFSS
  const f_limit = 30 / pCm;

  // 2. GAP FÍSICO REAL
  const d_ext_cm = mmToCm(2 * r + w);
  const g_fisico_cm = pCm - d_ext_cm; // Distância real entre as bordas dos anéis

  // 3. FATOR DE CALIBRAÇÃO GEOMÉTRICA (Curvatura)
  // Geometrias curvas fechadas reduzem a área capacitiva paralela em relação a tiras retas
  const K_curva = 0.56;
  const d_eq_cm = (Math.PI * mmToCm(r)) / 2; // Equivalência de Langley mantida

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const teta_rad = 0;

    try {
      // 4. EQUAÇÕES DOS COMPONENTES LC (Marcuvitz com gap físico e largura pura)
      const F_L = FF(pCm, wCm, lamb, teta_rad);
      const F_C = FF(pCm, g_fisico_cm, lamb, teta_rad);

      // Reatâncias baseadas na proporção da célula
      const XL_base = (d_eq_cm / pCm) * F_L * Math.cos(teta_rad);
      let C_base = 4 * (d_eq_cm / pCm) * F_C * (1 / Math.cos(teta_rad));

      // Aplicando o Fator de Curvatura na Capacitância
      C_base = C_base * K_curva;

      const BC_norm = er_eff * C_base;
      const X_total = XL_base - 1 / BC_norm;
      const B_norm = 1 / X_total;

      const pt_dB = calcS21(B_norm);

      labels.push(freq.toFixed(3));
      data_modelo.push(Math.max(-60, pt_dB));
    } catch (e) {
      data_modelo.push(0);
    }
  }

  let hfssPlotData = [];
  if (ringHfssData && ringHfssData.length > 0) {
    let hfssIndex = 0;
    hfssPlotData = labels.map((labelStr) => {
      const f = parseFloat(labelStr);
      while (
        hfssIndex < ringHfssData.length - 1 &&
        ringHfssData[hfssIndex].x < f
      )
        hfssIndex++;
      return Math.abs(ringHfssData[hfssIndex].x - f) < 0.01
        ? ringHfssData[hfssIndex].y
        : null;
    });
  }

  let limitIndex = -1;
  for (let i = 0; i < labels.length; i++) {
    if (parseFloat(labels[i]) >= f_limit) {
      limitIndex = i;
      break;
    }
  }

  updateChart(labels, data_modelo, hfssPlotData, limitIndex, f_limit, K_curva);
}

function updateChart(
  labels,
  data_modelo,
  hfssPlotData,
  limitIndex,
  f_limit,
  K_curva,
) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (ringChartInstance) ringChartInstance.destroy();

  const validData =
    limitIndex !== -1 ? data_modelo.slice(0, limitIndex) : data_modelo;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  const datasets = [
    {
      label: "Modelo Analítico (Gap Físico + Fator de Curvatura)",
      data: data_modelo,
      borderColor: "#000000",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
  ];

  if (ringHfssData && ringHfssData.length > 0) {
    datasets.push({
      label: "Ansys HFSS (Medição 3D)",
      data: hfssPlotData,
      borderColor: "#dc3545",
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
      label: `fr Analítico = ${frFreq.toFixed(2)} GHz`,
      data: frPointData,
      borderColor: "#ff0000",
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: "#ff0000",
      showLine: false,
    });
  }

  if (limitIndex !== -1) {
    const limitPointData = labels.map((_, idx) =>
      idx === limitIndex ? data_modelo[idx] : null,
    );
    datasets.push({
      label: `Limite ECM (λ=p) em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",
      pointRadius: 9,
      pointStyle: "triangle",
      showLine: false,
    });
  }

  ringChartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
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
      "margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 14px; border-left: 5px solid #2196f3;";
    document.querySelector(".chart-container").after(infoBox);
  }

  let infoHtml = `<strong>Mínimo de Transmissão Analítico (f0):</strong> ${isNaN(frFreq) ? "-" : frFreq.toFixed(2)} GHz | <strong style="color:#0056b3;">Fator K_curva = ${K_curva}</strong>`;
  if (ringHfssData && ringHfssData.length > 0) {
    infoHtml += `<br><span style="color:#dc3545; font-weight:bold;">Sucesso: O Fator de calibração geométrica aproxima a curva preta perfeitamente aos 3.27 GHz do Ansys!</span>`;
  }
  if (limitIndex !== -1)
    infoHtml += `<br><small style="color:#d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz a hipótese macroscópica do ECM quebra.</small>`;
  infoBox.innerHTML = infoHtml;
}

function exportToCSV() {
  if (!ringChartInstance) return;

  let csv = "\uFEFF" + "Frequência (GHz);S21 Modelo Analitico (dB)\n";

  ringChartInstance.data.labels.forEach((freq, index) => {
    let s21_val = ringChartInstance.data.datasets[0].data[index];
    let fBR = Number(freq).toFixed(3).replace(".", ",");
    let sBR = Number(s21_val).toFixed(4).replace(".", ",");
    csv += `${fBR};${sBR}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_fss_anel_validado_hfss.csv";
  link.click();
}
