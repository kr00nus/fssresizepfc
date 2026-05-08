// ==========================================
// SIMULADOR FSS - CRUZ DE JERUSALÉM
// Interface de usuário e atualização de gráficos
// Geometria: Espira em forma de cruz (Jerusalem Cross)
// ==========================================

import { mmToCm, FF } from "./math.js";

// Variável global para armazenar a instância do gráfico Chart.js
let chart = null;

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // FUNÇÃO: bindInputs()
  // Sincroniza pares slider-input numérico
  // - Quando o slider muda, atualiza o input numérico com o valor formatado
  // - Quando o input numérico muda, atualiza o slider com o mesmo valor
  // - Ambos acionam updateAll() para recalcular gráfico e geometria
  // ==========================================
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

  // Aplica bindInputs() a todos os parâmetros que têm pares slider-input
  // Inclui: frequências, período, dimensões e parâmetros do substrato
  ["fStart", "fEnd", "p", "d", "w", "h", "h_sub", "er"].forEach(bindInputs);

  // ==========================================
  // LISTENER: Seletor de Substrato
  // Quando usuário seleciona um substrato pré-definido (RO3003, RO3006)
  // atualiza automaticamente seus parâmetros (permissividade e altura)
  // ==========================================
  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    subSelect.addEventListener("change", (e) => {
      if (e.target.value === "RO3003") {
        // Substrato RO3003: εr=3.00, h=1.52mm
        document.getElementById("er_num").value = "3.00";
        document.getElementById("er_slider").value = "3.00";
        document.getElementById("h_sub_num").value = "1.52";
        document.getElementById("h_sub_slider").value = "1.52";
      } else if (e.target.value === "RO3006") {
        // Substrato RO3006: εr=6.50, h=1.28mm
        document.getElementById("er_num").value = "6.50";
        document.getElementById("er_slider").value = "6.50";
        document.getElementById("h_sub_num").value = "1.28";
        document.getElementById("h_sub_slider").value = "1.28";
      }
      updateAll(); // Recalcula com novos parâmetros do substrato
    });
  }

  // ==========================================
  // LISTENER: Botão Exportar CSV
  // ==========================================
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToCSV);
  }

  // Realiza primeiro cálculo na inicialização
  updateAll();
});

// ==========================================
// FUNÇÃO: drawGeometry()
// Desenha a célula unitária da Cruz de Jerusalém no canvas
// Mostra:
// - Elemento central (preenchido em azul escuro)
// - Elementos vizinhos ao redor em 4 direções (azul claro)
// - Contorno pontilhado mostrando o período p
//
// Parâmetros:
//   p: período da célula (mm)
//   d: comprimento externo da cruz (mm)
//   w: largura da fita/braço (mm)
//   h_arm: comprimento adicional dos braços estendidos (mm)
//   g: gap calculado (p - d) em mm
// ==========================================
function drawGeometry(p, d, w, h_arm, g) {
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;

  // Limpa o canvas para desenho limpo
  ctx.clearRect(0, 0, size, size);

  // Define escala: viewSize = p * 2.2 para mostrar célula + vizinhos
  const viewSize = p * 2.2;
  const scale = size / viewSize;
  const center = size / 2;
  const pPixel = p * scale;
  const dPixel = d * scale;
  const wPixel = w * scale;
  const hPixel = h_arm * scale;

  // =========================================
  // Função interna: drawJerusalemCross()
  // Desenha um braço de cruz em posição especificada
  // Se isCenter=true: cor azul escuro (célula principal)
  // Se isCenter=false: cor azul claro (células vizinhas)
  //
  // A cruz é formada por:
  // 1. Braço horizontal central (d x w)
  // 2. Braço vertical central (w x d)
  // 3. Quatro braços estendidos nas 4 direções (CapLength x w)
  // =========================================
  function drawJerusalemCross(cx, cy, isCenter) {
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";

    // Braço horizontal central
    ctx.fillRect(cx - dPixel / 2, cy - wPixel / 2, dPixel, wPixel);

    // Braço vertical central
    ctx.fillRect(cx - wPixel / 2, cy - dPixel / 2, wPixel, dPixel);

    // Comprimento total dos braços estendidos
    const capLength = 2 * hPixel + wPixel;

    // Braço superior estendido
    ctx.fillRect(cx - capLength / 2, cy - dPixel / 2, capLength, wPixel);

    // Braço inferior estendido
    ctx.fillRect(
      cx - capLength / 2,
      cy + dPixel / 2 - wPixel,
      capLength,
      wPixel,
    );

    // Braço esquerdo estendido
    ctx.fillRect(cx - dPixel / 2, cy - capLength / 2, wPixel, capLength);

    // Braço direito estendido
    ctx.fillRect(
      cx + dPixel / 2 - wPixel,
      cy - capLength / 2,
      wPixel,
      capLength,
    );
  }

  // Desenha células vizinhas em 4 direções (up, down, left, right)
  const neighbors = [
    { i: 0, j: -1 },
    { i: 0, j: 1 },
    { i: -1, j: 0 },
    { i: 1, j: 0 },
  ];
  neighbors.forEach((n) =>
    drawJerusalemCross(center + n.i * pPixel, center + n.j * pPixel, false),
  );

  // Desenha a célula central (elemento principal)
  drawJerusalemCross(center, center, true);

  // Desenha contorno pontilhado mostrando o período p
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]);
}

// ==========================================
// FUNÇÃO: updateAll()
// Função PRINCIPAL que orquestra todo o cálculo
// Executa quando qualquer parâmetro muda
//
// Etapas:
// 1. Lê todos os parâmetros dos inputs
// 2. Valida entrada (valores > 0, fStart < fEnd, etc)
// 3. Garante d < p (evita overflow)
// 4. Calcula gap g = p - d
// 5. Calcula permissividade efetiva (er_eff) do substrato
// 6. Simula resposta de transmissão (S21) em alta resolução
// 7. Atualiza gráfico e desenho da geometria
// ==========================================
function updateAll() {
  // Lê todos os parâmetros do formulário
  const fStart = parseFloat(document.getElementById("fStart_num").value);
  const fEnd = parseFloat(document.getElementById("fEnd_num").value);
  const p = parseFloat(document.getElementById("p_num").value);
  let d = parseFloat(document.getElementById("d_num").value);
  const w = parseFloat(document.getElementById("w_num").value);
  const h_arm = parseFloat(document.getElementById("h_num").value);
  const h_sub = parseFloat(document.getElementById("h_sub_num").value);
  const er_real = parseFloat(document.getElementById("er_num").value);

  // Valida se todos os valores são válidos (> 0) e fStart < fEnd
  if (
    fStart <= 0 ||
    fEnd <= 0 ||
    p <= 0 ||
    d <= 0 ||
    w <= 0 ||
    er_real <= 0 ||
    fStart >= fEnd
  ) {
    // Se algum valor inválido, destroi gráfico anterior
    if (chart) chart.destroy();
    return;
  }

  // Garante que d nunca seja >= p (cruz precisa de espaço)
  if (d >= p) {
    d = p - 0.001;
    document.getElementById("d_num").value = d.toFixed(3);
  }

  // Calcula gap (espaço entre cruzes)
  const g = p - d;
  const gEl = document.getElementById("g_num");
  if (gEl) gEl.value = g.toFixed(3);

  // Calcula Permissividade Efetiva (er_eff)
  const er_eff = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  // Desenha a geometria da cruz com os parâmetros atuais
  drawGeometry(p, d, w, h_arm, g);

  // =========================================
  // SIMULAÇÃO: Cálculo de S21 em alta resolução
  // =========================================
  const df = 0.001; // Passo de frequência: 0.001 GHz (1 MHz)
  const pCm = mmToCm(p); // Converte período para cm
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const hCm = mmToCm(h_arm);
  const gCm = mmToCm(g);
  const Rs = 0.008; // Resistência superficial (para modelar perdas)

  const data = []; // Array com valores S21 em dB
  const labels = []; // Array com frequências em GHz
  const f_limit = 30 / pCm; // Limite de difração

  // Loop de frequência: calcula S21 para cada frequência
  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq; // Comprimento de onda em cm
    const ang = 0; // Ângulo de incidência (0° = normal)

    try {
      // Impedância série do braço horizontal (XL1)
      const XL1 = (dCm / pCm) * FF(pCm, wCm, lamb, ang) * Math.cos(ang);

      // Admitância paralela: gap (Bg) + braços estendidos (Bd)
      const Bg = ((4 * dCm) / pCm) * FF(pCm, gCm, lamb, ang);
      const Bd = ((4 * (2 * hCm + gCm)) / pCm) * FF(pCm, pCm - dCm, lamb, ang);
      const BC1 = er_eff * (Bg + Bd);
      const X1 = XL1 - 1 / BC1;

      // Impedância série do braço vertical (XL2)
      const XL2 = (dCm / pCm) * FF(pCm, wCm, lamb, ang) * Math.cos(ang);
      const lamb3 = dCm / 0.43;
      const f3_eff = 30 / lamb3 / Math.sqrt(er_eff);
      const BC2 = (1 / XL2) * Math.pow(freq / f3_eff, 2);
      const X2 = XL2 - 1 / BC2;

      // Converte impedâncias para admitâncias (parte real e imaginária)
      const Y1_re = Rs / (Rs * Rs + X1 * X1);
      const Y1_im = -X1 / (Rs * Rs + X1 * X1);
      const Y2_re = Rs / (Rs * Rs + X2 * X2);
      const Y2_im = -X2 / (Rs * Rs + X2 * X2);

      // Admitância total
      const Y_total_re = Y1_re + Y2_re;
      const Y_total_im = Y1_im + Y2_im;

      // Calcula transmissão: pt = 4 / (2 + Y_re)² + Y_im²
      const den = Math.pow(2 + Y_total_re, 2) + Math.pow(Y_total_im, 2);
      const pt = 4 / den;
      let pt_dB = 10 * Math.log10(pt);

      labels.push(freq.toFixed(3));
      data.push(Math.max(-60, pt_dB));
    } catch (e) {
      data.push(0);
    }
  }

  // Identifica limite de difração
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

  const datasets = [
    {
      label: "S21 Simulado ECM (Cruz de Jerusalém)",
      data: data,
      borderColor: "#000",
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.1, // Mantido conforme seu gosto original
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
  ];

  if (limitIndex !== -1) {
    datasets.push({
      label: `Limite ECM (λ=p) em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",
      pointRadius: 9,
      pointStyle: "triangle",
      showLine: false,
    });
  }

  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { maxTicksLimit: 20 } },
        y: { min: -60, max: 0 },
      },
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
  if (limitIndex !== -1)
    infoHtml += `<br><small style="color:#d35400">⚠️ Limite de Difração: ${f_limit.toFixed(2)} GHz</small>`;
  infoBox.innerHTML = infoHtml;
}

function exportToCSV() {
  if (!chart) return;
  let csv = "\uFEFF" + "Frequência (GHz);S21 (dB)\n";
  chart.data.labels.forEach((freq, index) => {
    let s21 = chart.data.datasets[0].data[index];
    // Conversão para padrão brasileiro (vírgula decimal)
    let fBR = Number(freq).toFixed(3).replace(".", ",");
    let sBR = Number(s21).toFixed(4).replace(".", ",");
    csv += `${fBR};${sBR}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_fss_cruz.csv";
  link.click();
}
