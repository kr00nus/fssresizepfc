// ==========================================
// SIMULADOR FSS - ESPIRA QUADRADA
// Interface de usuário e atualização de gráficos
// ==========================================

import { mmToCm, FF } from "./math.js";

// Variável global para armazenar a instância do gráfico Chart.js
let chart = null;

// ==========================================
// EVENTO: DOMContentLoaded - Inicialização
// ==========================================
// Aguarda o carregamento completo do DOM antes de executar a inicialização
document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // FUNÇÃO: bindInputs()
  // Sincroniza pares slider-input numérico
  // - Quando o slider muda, atualiza o input numérico com o valor formatado
  // - Quando o input numérico muda, atualiza o slider com o mesmo valor
  // - Ambos acionam updateAll() para recalcular gráfico e geometria
  // 
  // Parâmetros:
  //   idPrefix (string): identificador base (ex: "p", "fStart", "er")
  // ==========================================
  function bindInputs(idPrefix) {
    const slider = document.getElementById(idPrefix + "_slider");
    const num = document.getElementById(idPrefix + "_num");
    if (!slider || !num) return;

    // Listener para quando o slider é movido
    slider.addEventListener("input", (e) => {
      // Define casas decimais conforme tipo de parâmetro:
      // - Frequência (fStart, fEnd): 1 casa decimal
      // - Permissividade (er) e altura (h_sub): 2 casas decimais
      // - Outros (p, d, w): 3 casas decimais
      const decimals =
        idPrefix === "fStart" || idPrefix === "fEnd"
          ? 1
          : idPrefix === "er" || idPrefix === "h_sub"
            ? 2
            : 3;
      num.value = parseFloat(e.target.value).toFixed(decimals);
      updateAll(); // Recalcula tudo com novo valor
    });

    // Listener para quando o input numérico é modificado
    num.addEventListener("input", (e) => {
      slider.value = e.target.value; // Sincroniza slider com input
      updateAll(); // Recalcula tudo com novo valor
    });
  }

  // Aplica bindInputs() a todos os parâmetros que têm pares slider-input
  ["fStart", "fEnd", "p", "d", "w", "h_sub", "er"].forEach(bindInputs);

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
  // Permite ao usuário baixar os dados calculados em formato CSV
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
// Desenha a célula unitária da espira quadrada no canvas
// Mostra a geometria da estrutura com:
// - Elemento central (preenchido em azul escuro)
// - Elementos vizinhos ao redor (preenchido em azul claro)
// - Contorno pontilhado mostrando o período p
//
// Parâmetros:
//   p: período da célula (mm)
//   d: tamanho externo do quadrado (mm)
//   w: largura da fita/linha (mm)
//   g: gap calculado (p - d) em mm
//
// O desenho é feito em escala apropriada para caber no canvas
// ==========================================
function drawGeometry(p, d, w, g) {
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;

  // Limpa o canvas para desenho limpo
  ctx.clearRect(0, 0, size, size);

  // Define escala: viewSize = p * 2.2 para mostrar célula + vizinhos
  const viewSize = p * 2.2;
  const scale = size / viewSize; // pixels por mm
  const center = size / 2; // Centro do canvas em pixels
  const pPixel = p * scale; // Período em pixels
  const dPixel = d * scale; // Tamanho do quadrado em pixels
  const wPixel = w * scale; // Largura da fita em pixels
  // Tamanho do "buraco" interno (d - 2*w), mas nunca negativo
  const innerPixel = Math.max(0, dPixel - 2 * wPixel);

  // =========================================
  // Função interna: drawSquareLoop()
  // Desenha um quadrado oco (espira) em posição especificada
  // Se isCenter=true: cor azul escuro (célula principal)
  // Se isCenter=false: cor azul claro (células vizinhas)
  // =========================================
  function drawSquareLoop(cx, cy, isCenter) {
    // Preenchimento do quadrado externo
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";
    ctx.fillRect(cx - dPixel / 2, cy - dPixel / 2, dPixel, dPixel);
    
    // Se houver espaço interno (buraco), limpa ele
    if (innerPixel > 0) {
      ctx.clearRect(
        cx - innerPixel / 2,
        cy - innerPixel / 2,
        innerPixel,
        innerPixel,
      );
      // Preenche o interior com branco (para vizinhos)
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

  // =========================================
  // Desenha célula vizinha em 4 direções (up, down, left, right)
  // =========================================
  const neighbors = [
    { i: 0, j: -1 }, // De cima
    { i: 0, j: 1 },  // De baixo
    { i: -1, j: 0 }, // Da esquerda
    { i: 1, j: 0 },  // Da direita
  ];
  neighbors.forEach((n) =>
    drawSquareLoop(center + n.i * pPixel, center + n.j * pPixel, false),
  );
  
  // Desenha a célula central (elemento principal)
  drawSquareLoop(center, center, true);

  // =========================================
  // Desenha contorno pontilhado mostrando o período p
  // =========================================
  ctx.setLineDash([5, 5]); // Padrão de linha: 5px traço, 5px vazio
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)"; // Preto semitransparente
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]); // Remove padrão de tracejado
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

  // Garante que d nunca seja >= p (espira precisa de espaço)
  if (d >= p) {
    d = p - 0.001;
    document.getElementById("d_num").value = d.toFixed(3);
  }

  // Calcula gap (espaço entre espiras)
  const g = p - d;
  const gEl = document.getElementById("g_num");
  if (gEl) gEl.value = g.toFixed(3);

  // =========================================
  // Calcula Permissividade Efetiva (er_eff)
  // Fórmula: er_eff = 1 + (er-1)/2 * (1 - exp(-1.8*h/p))
  // Efeito: conforme h/p aumenta, er_eff aproxima de er
  //         quando h/p é pequeno, er_eff ≈ 1 (ar)
  // =========================================
  const er_eff = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_eff.toFixed(3);

  // Desenha a geometria da espira com os parâmetros atuais
  drawGeometry(p, d, w, g);

  // =========================================
  // SIMULAÇÃO: Cálculo de S21 em alta resolução
  // =========================================
  const df = 0.001; // Passo de frequência: 0.001 GHz (1 MHz)
  const pCm = mmToCm(p); // Converte período para cm
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);
  const Rs = 0.008; // Resistência superficial (para modelar perdas)

  const data = []; // Array com valores S21 em dB
  const labels = []; // Array com frequências em GHz
  const f_limit = 30 / pCm; // Limite de difração (Grating Lobes)

  // Loop de frequência: calcula S21 para cada frequência
  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq; // Comprimento de onda em cm (c = 30 cm/ns)
    const ang = 0; // Ângulo de incidência (0° = normal)

    try {
      // Calcula impedância série da espira (XL)
      const XL = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);
      
      // Calcula admitância paralela do gap (BC)
      const BC = 4 * er_eff * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      
      // Calcula impedância total X
      const X = XL - 1 / BC;

      // Calcula transmissão com perdas (resistência superficial Rs)
      const pt = (Rs * Rs + X * X) / (Rs * Rs + X * X + Rs + 0.25);
      
      // Converte para dB e limita a -60dB (limite visual)
      let pt_dB = 10 * Math.log10(pt);

      labels.push(freq.toFixed(3)); // Armazena frequência com 3 casas
      data.push(Math.max(-60, pt_dB)); // Garante mínimo de -60dB
    } catch (e) {
      // Se houver erro no cálculo, adiciona 0dB
      data.push(0);
    }
  }

  // =========================================
  // Identifica limite de difração
  // Acima deste limite, o modelo ECM não é mais confiável
  // =========================================
  let limitIndex = -1;
  for (let i = 0; i < labels.length; i++) {
    if (parseFloat(labels[i]) >= f_limit) {
      limitIndex = i;
      break;
    }
  }

  // Atualiza o gráfico com os dados calculados
  updateChart(labels, data, limitIndex, f_limit);
}


// ==========================================
// FUNÇÃO: updateChart()
// Renderiza o gráfico de S21 com Chart.js
// Mostra:
// - Resposta S21 calculada (linha preta)
// - Frequência de ressonância fr (ponto vermelho)
// - Largura de banda BW a -10dB (pontos azuis)
// - Limite de difração (triângulo laranja)
//
// Parâmetros:
//   labels: array com frequências (GHz)
//   data: array com valores S21 (dB)
//   limitIndex: índice onde inicia o limite de difração (-1 se não houver)
//   f_limit: frequência do limite de difração (GHz)
// ==========================================
function updateChart(labels, data, limitIndex, f_limit) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (chart) chart.destroy(); // Destroi gráfico anterior se existir

  // Define dados válidos (até o limite de difração)
  const validData = limitIndex !== -1 ? data.slice(0, limitIndex) : data;
  
  // =========================================
  // Encontra frequência de ressonância (FR)
  // É a frequência com menor S21 (máximo de atenuação)
  // =========================================
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  // =========================================
  // Calcula Largura de Banda (BW) a -10dB
  // Procura as frequências inferior e superior onde S21 >= -10dB
  // =========================================
  const threshold = -10.0;
  let fLower = null, fUpper = null;
  let lowerIndex = null, upperIndex = null;

  // Procura pra baixo (esquerda) a partir de fr
  for (let i = minIndex; i >= 0; i--) {
    if (data[i] >= threshold) {
      fLower = parseFloat(labels[i]);
      lowerIndex = i;
      break;
    }
  }
  
  // Procura pra cima (direita) a partir de fr
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

  // Se não encontrou limites, usa extremos da faixa
  if (fLower === null) fLower = parseFloat(labels[0]);
  if (fUpper === null) fUpper = parseFloat(labels[data.length - 1]);
  
  // Largura de banda em GHz
  const bw = fUpper - fLower;

  // =========================================
  // Prepara dados para renderizar pontos específicos
  // (criando arrays com null onde não há ponto a desenhar)
  // =========================================
  
  // Ponto de ressonância: apenas no índice minIndex
  const frPointData = labels.map((_, idx) =>
    idx === minIndex ? data[idx] : null,
  );
  
  // Pontos de largura de banda: lowerIndex e upperIndex
  const bwPointsData = labels.map((_, idx) =>
    idx === lowerIndex || idx === upperIndex ? data[idx] : null,
  );
  
  // Ponto de limite de difração: apenas no índice limitIndex
  const limitPointData = labels.map((_, idx) =>
    idx === limitIndex ? data[idx] : null,
  );

  // =========================================
  // Cria ou atualiza o gráfico com Chart.js
  // =========================================
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels, // Frequências no eixo X
      datasets: [
        {
          // Dataset 1: Linha principal de S21
          label: "S21 Simulado ECM (Espira Quadrada)",
          data: data,
          borderColor: "#000", // Preto
          borderWidth: 2,
          pointRadius: 0, // Sem pontos (linha contínua)
          fill: false,
          tension: 0, // Sem suavização (mantém resolução)
        },
        {
          // Dataset 2: Ponto de Ressonância (vermelho)
          label: `fr = ${frFreq.toFixed(2)} GHz`,
          data: frPointData,
          borderColor: "#ff0000",
          borderWidth: 3,
          borderDash: [5, 5], // Linha tracejada
          pointRadius: 6,
          pointBackgroundColor: "#ff0000",
          showLine: false, // Sem linha entre pontos
        },
        {
          // Dataset 3: Pontos de Largura de Banda (azul)
          label: `BW = ${bw.toFixed(2)} GHz (-10dB)`,
          data: bwPointsData,
          borderColor: "#0066cc",
          borderWidth: 3,
          borderDash: [3, 3], // Linha mais curta
          pointRadius: 6,
          pointBackgroundColor: "#0066cc",
          showLine: false,
        },
        // Dataset 4: Ponto de Limite de Difração (triângulo laranja)
        // Só é adicionado se há limite dentro da faixa de frequência
        ...(limitIndex !== -1
          ? [
              {
                label: `Limite ECM (λ=p) em ${f_limit.toFixed(2)} GHz`,
                data: limitPointData,
                borderColor: "#ff8c00",
                pointRadius: 9,
                pointStyle: "triangle", // Triângulo em vez de círculo
                showLine: false,
              },
            ]
          : []),
      ],
    },
    options: {
      responsive: true, // Redimensiona com container
      maintainAspectRatio: false, // Usa altura do container
      animation: false, // Sem animação
      scales: {
        x: {
          ticks: { maxTicksLimit: 20 }, // Limita rótulos no eixo X
          title: { display: true, text: "Frequência (GHz)" },
        },
        y: { 
          min: -60, 
          max: 0, 
          title: { display: true, text: "S21 (dB)" } 
        },
      },
      plugins: { 
        legend: { 
          labels: { 
            font: { family: "Times New Roman" } // Fonte compatível com relatório
          } 
        } 
      },
    },
  });

  // =========================================
  // Cria caixa de informações com resumo
  // =========================================
  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    // Se não existe, cria novo elemento
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText =
      "margin-top: 10px; padding: 10px; background: #fdfd96; border-radius: 4px; font-size: 14px;";
    document.querySelector(".chart-container").after(infoBox);
  }

  // Constrói texto com fr e BW
  let infoHtml = `<strong>fr:</strong> ${frFreq.toFixed(2)} GHz | <strong>BW:</strong> ${bw.toFixed(2)} GHz`;
  
  // Adiciona aviso se houver limite de difração dentro da faixa
  if (limitIndex !== -1) {
    infoHtml += `<br><small style="color: #d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo ECM perde precisão devido à difração.</small>`;
  }
  
  infoBox.innerHTML = infoHtml;
}



// ==========================================
// FUNÇÃO: exportToCSV()
// Exporta os dados calculados em arquivo CSV
// Permite ao usuário baixar dados de S21 vs frequência
//
// Formato do CSV:
// - Cabeçalho: "Frequência (GHz);S21 (dB)"
// - Separador: ponto-e-vírgula (;)
// - Decimal: vírgula (,) para compatibilidade com Brasil/Europa
// - BOM: adiciona marca de byte order (UTF-8 com BOM)
// ==========================================
function exportToCSV() {
  if (!chart) return; // Se não há gráfico, não há dados

  // Inicia CSV com BOM (marca de byte order UTF-8)
  // Garante que arquivo abra corretamente em Excel com acentos
  let csv = "\uFEFF" + "Frequência (GHz);S21 (dB)\n";
  
  // Itera sobre todos os dados do gráfico
  chart.data.labels.forEach((freq, index) => {
    let s21 = chart.data.datasets[0].data[index]; // Pega S21 do primeiro dataset
    
    // Converte para formato brasileiro:
    // 123.456 → 123,456 (ponto para vírgula)
    let freq_BR = Number(freq).toFixed(3).replace(".", ",");
    let s21_BR = Number(s21).toFixed(4).replace(".", ",");
    
    // Adiciona linha ao CSV com separador ponto-e-vírgula
    csv += `${freq_BR};${s21_BR}\n`;
  });

  // Cria arquivo blob com conteúdo CSV
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  
  // Cria link temporário e simula clique para download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_espira_quadrada.csv"; // Nome do arquivo baixado
  link.click();
}
