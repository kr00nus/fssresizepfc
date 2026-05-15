// ==========================================
// SIMULADOR FSS - CRUZ DE JERUSALÉM (BENCHMARK ANALÍTICO + HFSS)
// Interface de usuário e atualização de gráficos
// ==========================================
// Este arquivo gerencia a interface gráfica do simulador da Cruz de Jerusalém.
// FSS significa "Frequency Selective Surface" (Superfície Seletiva de Frequência)
// Este código controla os gráficos, entrada de dados e visualização do comportamento eletromagnético

// Importa funções matemáticas do arquivo math.js
// mmToCm = converte milímetros para centímetros
// FF = calcula funções matemáticas específicas
// calcS21 = calcula o parâmetro S21 (transmissão de sinal)
import { mmToCm, FF, calcS21 } from "./math.js";

// Variável global que armazena o gráfico Chart.js (biblioteca para fazer gráficos)
let chart = null;
// Variável global que armazena os dados do HFSS (software de simulação eletromagnética)
let hfssData = null;

// Evento que executa quando a página HTML foi completamente carregada
document.addEventListener("DOMContentLoaded", () => {
  // Função que conecta um controle deslizante (slider) com um campo numérico
  // Quando o usuário muda um valor em um, o outro é atualizado automaticamente
  function bindInputs(idPrefix) {
    // Encontra o elemento HTML do slider usando seu ID (ex: "p_slider")
    const slider = document.getElementById(idPrefix + "_slider");
    // Encontra o elemento HTML do campo numérico usando seu ID (ex: "p_num")
    const num = document.getElementById(idPrefix + "_num");
    // Se um deles não existir, sai da função
    if (!slider || !num) return;

    // Quando o slider é movido, atualiza o campo numérico
    slider.addEventListener("input", (e) => {
      // Define quantas casas decimais cada tipo de dado deve ter
      // Frequências (fStart, fEnd) = 1 casa decimal
      // Constante dielétrica e altura (er, h_sub) = 2 casas decimais
      // Outras dimensões = 3 casas decimais
      const decimals = ["fStart", "fEnd"].includes(idPrefix)
        ? 1
        : ["er", "h_sub"].includes(idPrefix)
          ? 2
          : 3;
      // Converte o valor do slider para número e formata com as casas decimais corretas
      num.value = parseFloat(e.target.value).toFixed(decimals);

      handlePDG(idPrefix); // Verifica as restrições geométricas
      updateAll(); // Recalcula e atualiza todos os gráficos
    });

    // Quando o campo numérico é editado, atualiza o slider
    num.addEventListener("input", (e) => {
      // Coloca o valor do campo numérico no slider
      slider.value = e.target.value;

      handlePDG(idPrefix); // Verifica as restrições geométricas
      updateAll(); // Recalcula e atualiza todos os gráficos
    });
  }

  // Função que mantém a consistência matemática: p = d + g
  function handlePDG(changed) {
    const pNum = document.getElementById("p_num");
    const dNum = document.getElementById("d_num");
    const gNum = document.getElementById("g_num");
    const dSlider = document.getElementById("d_slider");
    const gSlider = document.getElementById("g_slider");

    if (!pNum || !dNum || !gNum) return;

    let p = parseFloat(pNum.value);
    let d = parseFloat(dNum.value);
    let g = parseFloat(gNum.value);

    if (changed === "p" || changed === "d") {
      g = p - d;
      if (g <= 0) g = 0.001;
      gNum.value = g.toFixed(3);
      if (gSlider) gSlider.value = g.toFixed(3);
    } else if (changed === "g") {
      d = p - g;
      if (d <= 0) d = 0.001;
      dNum.value = d.toFixed(3);
      if (dSlider) dSlider.value = d.toFixed(3);
    }
  }

  // Conecta todos os parâmetros do simulador para que slider e campo numérico fiquem sincronizados
  ["fStart", "fEnd", "p", "d", "w", "h", "h_sub", "er", "g"].forEach(
    bindInputs,
  );

  // Encontra o seletor de substrato (material da placa PCB)
  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    // Quando o usuário muda o tipo de substrato
    subSelect.addEventListener("change", (e) => {
      // Se selecionou substrato RO3003
      if (e.target.value === "RO3003") {
        // Define os valores típicos para RO3003: permissividade 3.00 e altura 1.52mm
        document.getElementById("er_num").value = "3.00";
        document.getElementById("er_slider").value = "3.00";
        document.getElementById("h_sub_num").value = "1.52";
        document.getElementById("h_sub_slider").value = "1.52";
      } else if (e.target.value === "RO3006") {
        // Se selecionou substrato RO3006: permissividade 6.50 e altura 1.28mm
        document.getElementById("er_num").value = "6.50";
        document.getElementById("er_slider").value = "6.50";
        document.getElementById("h_sub_num").value = "1.28";
        document.getElementById("h_sub_slider").value = "1.28";
      }
      // Recalcula tudo com os novos valores de substrato
      updateAll();
    });
  }

  // Encontra o botão de exportar
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    // Quando o botão é clicado, exporta os dados para um arquivo CSV
    exportBtn.addEventListener("click", exportToCSV);

    // Cria um input invisível para selecionar arquivo CSV
    const hfssInput = document.createElement("input");
    hfssInput.type = "file";
    hfssInput.accept = ".csv"; // Aceita apenas arquivos CSV
    hfssInput.style.display = "none"; // Mantém invisível
    hfssInput.addEventListener("change", handleHFSSUpload); // Quando arquivo é selecionado

    // Cria um botão visual para carregar dados do HFSS
    const hfssBtn = document.createElement("button");
    hfssBtn.innerText = "Carregar Dados HFSS"; // Texto do botão
    // Estilos do botão (margem, cor vermelha, etc)
    hfssBtn.style.cssText =
      "margin-top: 10px; margin-left: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;";
    // Ao clicar no botão visual, abre o seletor de arquivo
    hfssBtn.onclick = () => hfssInput.click();

    // Adiciona os elementos (input invisível e botão) à página HTML
    exportBtn.parentNode.insertBefore(hfssInput, exportBtn.nextSibling);
    exportBtn.parentNode.insertBefore(hfssBtn, exportBtn.nextSibling);
  }

  // Executa uma atualização completa dos gráficos no carregamento inicial
  updateAll();
});

// Função que processa o arquivo CSV do HFSS quando o usuário o carrega
function handleHFSSUpload(event) {
  // Obtém o arquivo selecionado pelo usuário
  const file = event.target.files[0];
  // Se nenhum arquivo foi selecionado, sai da função
  if (!file) return;

  // Cria um leitor de arquivo para ler o conteúdo em texto
  const reader = new FileReader();
  // Quando o arquivo foi lido com sucesso
  reader.onload = (e) => {
    // Obtém o conteúdo do arquivo como texto
    const text = e.target.result;
    // Divide o conteúdo em linhas (quebra de linha = uma linha)
    const lines = text.split("\n");
    // Inicializa um array vazio para armazenar os dados
    hfssData = [];

    // Percorre cada linha do arquivo (começando da linha 1 para pular o cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      // Se a linha está vazia, pula para a próxima
      if (!lines[i].trim()) continue;
      // Divide a linha por vírgula para separar frequência e S21
      const parts = lines[i].split(",");
      // Verifica se há pelo menos 2 valores na linha (frequência e S21)
      if (parts.length >= 2) {
        // Converte o primeiro valor para número (frequência em GHz)
        const freq = parseFloat(parts[0]);
        // Converte o segundo valor para número (S21 em dB)
        const s21 = parseFloat(parts[1]);
        // Valida que ambos os valores são números válidos
        if (!isNaN(freq) && !isNaN(s21)) {
          // Adiciona o ponto de dados ao array
          // x = frequência, y = valor de transmissão (S21)
          hfssData.push({ x: freq, y: s21 });
        }
      }
    }
    // Mostra uma mensagem dizendo quantos pontos foram carregados
    alert(
      `Dados do HFSS carregados com sucesso! (${hfssData.length} pontos encontrados)`,
    );
    // Atualiza todos os gráficos com os novos dados do HFSS
    updateAll();
  };
  // Lê o arquivo como texto
  reader.readAsText(file);
}

// ==========================================
// FUNÇÃO: drawGeometry() - Desenha a Cruz de Jerusalém no canvas
// ==========================================
// Esta função desenha a geometria 2D da Cruz de Jerusalém e suas repetições
function drawGeometry(p, d, w, h, g) {
  // Encontra o elemento canvas (área onde vamos desenhar)
  const canvas = document.getElementById("shapeCanvas");
  // Se o canvas não existir, sai da função
  if (!canvas) return;
  // Obtém o contexto 2D para desenhar no canvas
  const ctx = canvas.getContext("2d");
  // Obtém o tamanho do canvas em pixels
  const size = canvas.width;

  // Limpa o canvas, apagando tudo que estava desenhado
  ctx.clearRect(0, 0, size, size);

  // Define o tamanho da área visível (um pouco maior que o período para visualizar bem)
  const viewSize = p * 2.2;
  // Calcula a escala: quantos pixels por unidade de comprimento
  const scale = size / viewSize;
  // Calcula o centro do canvas em pixels
  const center = size / 2;

  // Converte o período e gap de mm para pixels
  const pPixel = p * scale;
  const gPixel = g * scale;

  // Calcula o tamanho total da cruz na tela (período menos o gap vazio)
  const crossSpan = pPixel - gPixel;

  // Converte dimensões para pixels
  const dPixel = d * scale; // Comprimento do chapéu
  const hPixel = h * scale; // Espessura do chapéu
  const wPixel = w * scale; // Espessura do braço interno

  // Função auxiliar que desenha uma Cruz de Jerusalém em uma posição (cx, cy)
  function drawJerusalemCross(cx, cy, isCenter) {
    // Define a cor: azul escuro central, azul claro para as vizinhas
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";

    // ===== Desenha os braços centrais da cruz =====
    const innerLen = Math.max(0, crossSpan - 2 * hPixel);
    ctx.fillRect(cx - innerLen / 2, cy - wPixel / 2, innerLen, wPixel); // Horizontal
    ctx.fillRect(cx - wPixel / 2, cy - innerLen / 2, wPixel, innerLen); // Vertical

    // ===== Desenha os chapéus =====
    ctx.fillRect(cx - dPixel / 2, cy - crossSpan / 2, dPixel, hPixel); // Topo
    ctx.fillRect(cx - dPixel / 2, cy + crossSpan / 2 - hPixel, dPixel, hPixel); // Fundo
    ctx.fillRect(cx - crossSpan / 2, cy - dPixel / 2, hPixel, dPixel); // Esquerda
    ctx.fillRect(cx + crossSpan / 2 - hPixel, cy - dPixel / 2, hPixel, dPixel); // Direita
  }

  // Array com as posições das 4 cruzes vizinhas
  const neighbors = [
    { i: 0, j: -1 },
    { i: 0, j: 1 },
    { i: -1, j: 0 },
    { i: 1, j: 0 },
  ];

  // Desenha cada cruz vizinha com cor mais clara
  neighbors.forEach((n) =>
    drawJerusalemCross(center + n.i * pPixel, center + n.j * pPixel, false),
  );
  // Desenha a cruz do centro com cor mais escura
  drawJerusalemCross(center, center, true);

  // ===== Desenha a linha tracejada do período (p) =====
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]);
}

// Função principal que atualiza todos os gráficos e cálculos quando algo muda
function updateAll() {
  const fStart = parseFloat(document.getElementById("fStart_num").value);
  const fEnd = parseFloat(document.getElementById("fEnd_num").value);
  let p = parseFloat(document.getElementById("p_num").value);
  let d = parseFloat(document.getElementById("d_num").value);
  let w = parseFloat(document.getElementById("w_num").value);
  let h = parseFloat(document.getElementById("h_num").value);
  let g = parseFloat(document.getElementById("g_num").value);
  const h_sub = parseFloat(document.getElementById("h_sub_num").value);
  const er_real = parseFloat(document.getElementById("er_num").value);

  // Valida se todos os valores são válidos
  if (
    fStart <= 0 ||
    fEnd <= 0 ||
    p <= 0 ||
    d <= 0 ||
    w <= 0 ||
    h <= 0 ||
    g <= 0 ||
    er_real <= 0 ||
    fStart >= fEnd
  ) {
    if (chart) chart.destroy();
    return;
  }

  // ===== TRAVAS DE SEGURANÇA FÍSICA =====
  if (g >= p) g = p - 0.001;
  if (d > p - g) d = p - g;

  const ids = { p, d, w, h, g };
  Object.keys(ids).forEach((key) => {
    let elNum = document.getElementById(key + "_num");
    let elSli = document.getElementById(key + "_slider");
    if (elNum && elNum.value != ids[key].toFixed(3))
      elNum.value = ids[key].toFixed(3);
    if (elSli && elSli.value != ids[key].toFixed(3))
      elSli.value = ids[key].toFixed(3);
  });

  // ===== FATOR DE FORMA DINÂMICO (ALPHA) =====
  const ratio_hp = h_sub / p;
  let alpha = 22 - (ratio_hp - 0.05) * ((22 - 17) / (0.2 - 0.05));
  alpha = Math.max(17, Math.min(22, alpha));

  // AS 6 FÓRMULAS DE PERMISSIVIDADE EFETIVA
  const er_media = (er_real + 1) / 2;
  const er_nova =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));
  const er_tentativa = (er_media + 3 * er_nova) / 4;
  const er_antiga =
    1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));
  const er_tanh = 1 + ((er_real - 1) / 2) * Math.tanh((Math.PI * h_sub) / p);
  const er_puro = er_real;

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_nova.toFixed(3);

  drawGeometry(p, d, w, h, g);

  const df = 0.001;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const hCm = mmToCm(h);
  const gCm = mmToCm(g);

  const data_nova = [],
    data_tentativa = [],
    data_antiga = [],
    data_media = [],
    data_tanh = [],
    data_puro = [],
    labels = [];
  const f_limit = 30 / pCm;

  // Loop principal de cálculo do S21
  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      // ===== EQUAÇÕES EXATAS DO CIRCUITO EQUIVALENTE (ECM) =====
      const XL1 = FF(pCm, wCm, lamb, ang);
      const XL2 = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);
      const lamb3 = dCm / 0.43;

      const Bg_base = ((4 * dCm) / pCm) * FF(pCm, gCm, lamb, ang);
      const Bd_base =
        ((4 * (2 * hCm + gCm)) / pCm) * FF(pCm, pCm - dCm, lamb, ang);
      const C_total_base = Bg_base + Bd_base;

      const calcPt = (er_val) => {
        const BC1 = er_val * C_total_base;
        const X1 = XL1 - 1 / BC1;
        const f3_eff = 30 / lamb3 / Math.sqrt(er_val);
        const BC2 = (1 / XL2) * Math.pow(freq / f3_eff, 2);
        const X2 = XL2 - 1 / BC2;
        const B_total = 1 / X1 + 1 / X2;
        return calcS21(B_total);
      };

      labels.push(freq.toFixed(3));
      data_nova.push(Math.max(-60, calcPt(er_nova)));
      data_tentativa.push(Math.max(-60, calcPt(er_tentativa)));
      data_antiga.push(Math.max(-60, calcPt(er_antiga)));
      data_media.push(Math.max(-60, calcPt(er_media)));
      data_tanh.push(Math.max(-60, calcPt(er_tanh)));
      data_puro.push(Math.max(-60, calcPt(er_puro)));
    } catch (e) {
      data_nova.push(0);
      data_tentativa.push(0);
      data_antiga.push(0);
      data_media.push(0);
      data_tanh.push(0);
      data_puro.push(0);
    }
  }

  // Prepara dados do HFSS para plotagem
  let hfssPlotData = [];
  if (hfssData && hfssData.length > 0) {
    let hfssIndex = 0;
    hfssPlotData = labels.map((labelStr) => {
      const f = parseFloat(labelStr);
      while (hfssIndex < hfssData.length - 1 && hfssData[hfssIndex].x < f)
        hfssIndex++;
      return Math.abs(hfssData[hfssIndex].x - f) < 0.005
        ? hfssData[hfssIndex].y
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

  updateChart(
    labels,
    data_nova,
    data_tentativa,
    data_antiga,
    data_media,
    data_tanh,
    data_puro,
    hfssPlotData,
    limitIndex,
    f_limit,
    alpha,
    er_tentativa,
  );
}

// Função que atualiza o gráfico Chart.js
function updateChart(
  labels,
  data_nova,
  data_tentativa,
  data_antiga,
  data_media,
  data_tanh,
  data_puro,
  hfssPlotData,
  limitIndex,
  f_limit,
  alpha,
  er_tentativa,
) {
  const ctx = document.getElementById("fssChart").getContext("2d");
  if (chart) chart.destroy();

  const validData =
    limitIndex !== -1 ? data_nova.slice(0, limitIndex) : data_nova;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]);

  // ===== DATASETS (Curvas Secundárias Comentadas) =====
  const datasets = [
    // CURVA 1: Modelo novo com fator de forma dinâmico (Mantida)
    {
      label: "ε_eff Fator Forma Dinâmico (Costa, Cruz)",
      data: data_nova,
      borderColor: "#000000",
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
    },

    /* === CURVAS SECUNDÁRIAS OCULTADAS ===
    ,
    {
      label: "2. ε_eff Heurística Personalizada (Sua Tentativa)",
      data: data_tentativa,
      borderColor: "#17a2b8",
      borderWidth: 2.5,
      borderDash: [8, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "3. ε_eff Tangente Hiperbólica",
      data: data_tanh,
      borderColor: "#fd7e14",
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "4. ε_eff Exponencial Fixo 1.8",
      data: data_antiga,
      borderColor: "#28a745",
      borderWidth: 2,
      borderDash: [3, 6],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "5. ε_eff Média Clássica",
      data: data_media,
      borderColor: "#007bff",
      borderWidth: 2,
      borderDash: [2, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      label: "6. ε_eff = ε_r (Material Puro)",
      data: data_puro,
      borderColor: "#6f42c1",
      borderWidth: 2,
      borderDash: [1, 3],
      pointRadius: 0,
      fill: false,
      tension: 0,
    }
    ====================================== */
  ];

  // Se o usuário carregou dados do HFSS, adiciona a curva vermelha
  if (hfssData && hfssData.length > 0) {
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

  // ===== MARCADORES ESPECIAIS =====
  const frPointData = labels.map((_, idx) =>
    idx === minIndex ? data_nova[idx] : null,
  );
  datasets.push({
    label: `fr = ${frFreq.toFixed(2)} GHz`,
    data: frPointData,
    borderColor: "#ff0000",
    borderWidth: 3,
    pointRadius: 6,
    pointBackgroundColor: "#ff0000",
    showLine: false,
  });

  if (limitIndex !== -1) {
    const limitPointData = labels.map((_, idx) =>
      idx === limitIndex ? data_nova[idx] : null,
    );
    datasets.push({
      label: `Limite de Difração em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",
      pointRadius: 9,
      pointStyle: "triangle",
      showLine: false,
    });
  }

  // ===== CRIAÇÃO DO GRÁFICO =====
  chart = new Chart(ctx, {
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
        y: {
          min: -60,
          max: 0,
          title: { display: true, text: "S21 (dB)" },
        },
      },
      plugins: {
        legend: {
          labels: { font: { family: "Times New Roman" } },
        },
      },
    },
  });

  // ===== CAIXA DE INFORMAÇÕES ABAIXO DO GRÁFICO =====
  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText =
      "margin-top: 10px; padding: 10px; background: #fdfd96; border-radius: 4px; font-size: 14px;";
    document.querySelector(".chart-container").after(infoBox);
  }

  let infoHtml = `<strong>Ressonância (Fator de Forma):</strong> ${frFreq.toFixed(2)} GHz | <strong style="color:#0056b3;">Fator (α) dinâmico aplicado: ${alpha.toFixed(2)}</strong>`;

  if (hfssData && hfssData.length > 0) {
    infoHtml += `<br><span style="color:#dc3545; font-weight:bold;">Comparativo ativo: Avalie qual curva aproxima melhor a ressonância da Cruz no Ansys HFSS.</span>`;
  }

  if (limitIndex !== -1)
    infoHtml += `<br><small style="color:#d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo ECM perde precisão.</small>`;

  infoBox.innerHTML = infoHtml;
}

// Função que exporta os dados dos gráficos para um arquivo CSV
function exportToCSV() {
  if (!chart) return;

  // Cabeçalho limpo focando apenas no Modelo Principal de Costa
  let csv = "\uFEFF" + "Frequência (GHz);S21 Modelo Costa (dB)\n";

  chart.data.labels.forEach((freq, index) => {
    // Extrai o valor S21 apenas do primeiro dataset (Costa)
    let s21_nova = chart.data.datasets[0].data[index];

    // Converte para formato brasileiro
    let fBR = Number(freq).toFixed(3).replace(".", ",");
    let sN_BR = Number(s21_nova).toFixed(4).replace(".", ",");

    csv += `${fBR};${sN_BR}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_cruz_jerusalem_modelo_costa.csv";
  link.click();
}
