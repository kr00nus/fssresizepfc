// ==========================================
// MÓDULO: parametric-analysis.js
// Modal e lógica de UI para Análise Paramétrica de Topologias FSS
// Permite varrer um parâmetro em um range e plotar Frequência de Ressonância (fr) e Banda (BW)
// ==========================================

let parametricModal = null;
let parametricChart = null;
let currentConfig = null;

/**
 * Inicializa a Análise Paramétrica para a página atual.
 * Injeta o botão na interface e prepara o modal.
 * 
 * @param {Object} config - Configurações da topologia
 * @param {string} config.topologyName - Nome da topologia (ex: "Espira Quadrada")
 * @param {Array} config.parameters - Parâmetros que podem ser varridos [{id: 'p', name: 'Período (p)'}]
 * @param {Function} config.getCurrentState - Retorna todos os valores fixos atuais da interface
 * @param {Function} config.calculateS21 - Função que recebe (currentState) e retorna a curva S21 [{f, s21}]
 */
export function initParametricAnalysis(config) {
  currentConfig = config;
  injectButton();
  createModal();
}

function injectButton() {
  // Evitar duplicidade
  if (document.getElementById("btnParametric")) return;

  const btn = document.createElement("button");
  btn.id = "btnParametric";
  btn.className = "btn-secondary";
  btn.innerHTML = `⚙️ Análise Paramétrica`;
  btn.style.marginLeft = "15px";
  btn.style.background = "#6a1b9a";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.padding = "8px 16px";
  btn.style.borderRadius = "4px";
  btn.style.cursor = "pointer";
  btn.style.fontWeight = "bold";
  btn.style.fontSize = "14px";
  btn.style.transition = "background 0.3s";
  btn.onmouseover = () => btn.style.background = "#4a148c";
  btn.onmouseout = () => btn.style.background = "#6a1b9a";

  btn.addEventListener("click", openModal);

  // Tenta colocar no cabeçalho do painel de parâmetros
  const paramsH2 = document.querySelector(".params h2");
  if (paramsH2) {
    paramsH2.style.display = "flex";
    paramsH2.style.justifyContent = "space-between";
    paramsH2.style.alignItems = "center";
    paramsH2.appendChild(btn);
    return;
  }

  // Fallback
  const container = document.querySelector(".header-actions") || document.querySelector(".controls");
  if (container) {
    container.appendChild(btn);
  }
}

function createModal() {
  if (document.getElementById("parametricModal")) return;

  const modalHtml = `
    <div id="parametricModal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.6);">
      <div style="background-color:#fff; margin:5% auto; padding:20px; border-radius:8px; width:80%; max-width:800px; font-family:'Segoe UI', sans-serif; box-shadow:0 5px 15px rgba(0,0,0,0.3);">
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:20px;">
          <h2 style="margin:0; color:#1a2a3a;">Análise Paramétrica - <span id="paramTopologyName"></span></h2>
          <span id="closeParamModal" style="color:#aaa; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
        </div>

        <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:20px; background:#f5f7fa; padding:15px; border-radius:6px; border-left:4px solid #6a1b9a;">
          <div style="flex:1; min-width:150px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px;">Parâmetro a Variar:</label>
            <select id="paramSelect" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;"></select>
          </div>
          <div style="flex:1; min-width:100px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px;">Valor Inicial:</label>
            <input type="number" id="paramStart" value="1" step="0.1" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
          </div>
          <div style="flex:1; min-width:100px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px;">Valor Final:</label>
            <input type="number" id="paramEnd" value="10" step="0.1" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
          </div>
          <div style="flex:1; min-width:100px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px;">Passos (N):</label>
            <input type="number" id="paramSteps" value="20" min="2" max="100" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
          </div>
        </div>

        <div style="margin-bottom:20px; padding:15px; background:#e8f4f8; border-radius:6px; border-left:4px solid #0277bd;">
          <h3 style="margin-top:0; margin-bottom:10px; font-size:14px; color:#1a2a3a;">Valores Fixos (Modifique para simular)</h3>
          <div id="fixedParamsContainer" style="display:flex; gap:15px; flex-wrap:wrap;"></div>
        </div>

        <div style="display:flex; gap:20px; align-items:center; margin-bottom:20px; flex-wrap:wrap;">
          <button id="runParametricBtn" style="background:#1976d2; color:white; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:14px;">▶ Simular Curva</button>
          <button id="exportParametricBtn" style="background:#2e7d32; color:white; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:14px; display:none;">📥 Exportar CSV</button>
          
          <div style="flex:1;">
             <label style="font-size:12px; font-weight:bold; margin-right:10px;">Eixo Y:</label>
             <select id="plotTypeSelect" style="padding:6px; border:1px solid #ccc; border-radius:4px;">
               <option value="fr">Frequência de Ressonância (GHz)</option>
               <option value="bw">Largura de Banda (-10 dB) (GHz)</option>
               <option value="lc">Indutância (L) & Capacitância (C)</option>
             </select>
          </div>
          <div id="paramStatus" style="font-size:12px; color:#666; font-style:italic;">Pronto para simular.</div>
        </div>

        <div style="width:100%; height:400px; position:relative;">
          <canvas id="parametricChartCanvas"></canvas>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById("closeParamModal").onclick = () => {
    document.getElementById("parametricModal").style.display = "none";
  };

  document.getElementById("runParametricBtn").onclick = runAnalysis;
  document.getElementById("exportParametricBtn").onclick = exportParametricCSV;
  document.getElementById("plotTypeSelect").onchange = renderChart; // re-render on toggle
}

function openModal() {
  if (!currentConfig) return;

  document.getElementById("paramTopologyName").textContent = currentConfig.topologyName;
  
  const select = document.getElementById("paramSelect");
  select.innerHTML = "";
  currentConfig.parameters.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  // Default values heuristic
  if (currentConfig.parameters.length > 0) {
     document.getElementById("paramStart").value = "1.0";
     document.getElementById("paramEnd").value = "10.0";
     document.getElementById("paramSteps").value = "20";
  }

  // Update fixed params when the selected sweep parameter changes
  select.onchange = buildFixedParams;
  buildFixedParams();

  document.getElementById("parametricModal").style.display = "block";
}

function buildFixedParams() {
  const container = document.getElementById("fixedParamsContainer");
  const selectedParam = document.getElementById("paramSelect").value;
  const baseState = currentConfig.getCurrentState();

  container.innerHTML = "";
  
  // Adicionar fStart e fEnd se existirem
  const fParams = [
    { id: "fStart", name: "Freq. Inicial (GHz)" },
    { id: "fEnd", name: "Freq. Final (GHz)" }
  ];
  const allParams = [];
  if (baseState.fStart !== undefined) allParams.push(fParams[0]);
  if (baseState.fEnd !== undefined) allParams.push(fParams[1]);
  allParams.push(...currentConfig.parameters);

  // Se 'er_real' e 'h_sub' não estiverem sendo varridos, podemos adicionar um seletor de substrato
  const sweepingSubstrate = selectedParam === "er_real" || selectedParam === "h_sub";

  if (!sweepingSubstrate) {
    const mainSelect = document.getElementById("substrate_select");
    if (mainSelect) {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "flex: 1; min-width: 250px;";
      
      const label = document.createElement("label");
      label.style.cssText = "display:block; font-size:11px; font-weight:bold; margin-bottom:3px; color:#555;";
      label.textContent = "Substrato Preset";
      
      const select = document.createElement("select");
      select.innerHTML = mainSelect.innerHTML;
      select.value = mainSelect.value;
      select.style.cssText = "width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;";
      
      const SUBSTRATE_PRESETS = {
        RO3003: { er: "3.00", h: "1.52" },
        RO3006: { er: "6.15", h: "1.28" },
        FR4: { er: "4.40", h: "1.60" },
        RT5880: { er: "2.20", h: "0.254" },
        RO4350B: { er: "3.66", h: "0.762" },
        RF35: { er: "3.50", h: "0.762" },
        TMM4: { er: "4.50", h: "0.381" },
        TMM10: { er: "9.20", h: "0.508" },
        CER10: { er: "10.00", h: "0.635" },
        AR1000: { er: "10.00", h: "0.762" }
      };

      select.onchange = (e) => {
        const val = e.target.value;
        const preset = SUBSTRATE_PRESETS[val];
        if (preset) {
          const erInput = document.querySelector('.fixed-param-input[data-param-id="er_real"]');
          const hInput = document.querySelector('.fixed-param-input[data-param-id="h_sub"]');
          if (erInput) erInput.value = preset.er;
          if (hInput) hInput.value = preset.h;
        }
      };

      wrapper.appendChild(label);
      wrapper.appendChild(select);
      container.appendChild(wrapper);
    }
  }

  allParams.forEach(p => {
    if (p.id === selectedParam) return; // Skip the one being swept

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "flex: 1; min-width: 120px;";

    const label = document.createElement("label");
    label.style.cssText = "display:block; font-size:11px; font-weight:bold; margin-bottom:3px; color:#555;";
    label.textContent = p.name;

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.className = "fixed-param-input"; // tag for easy retrieval
    input.dataset.paramId = p.id;
    input.value = baseState[p.id] !== undefined ? baseState[p.id] : "";
    input.style.cssText = "width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;";

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });
}

let lastResults = []; // [{paramVal, fr, bw, L_nH, C_pF}]
let lastParamName = "";

/**
 * Calcula L (nH) e C (pF) a partir do estado geométrico.
 * Usa a frequência analítica derivada da geometria (independente do sweep).
 */
function calculateLC(simState) {
  if (!currentConfig || !currentConfig.calculateLC) {
    return { L_nH: null, C_pF: null };
  }
  try {
    const result = currentConfig.calculateLC(simState);
    // Proteger contra NaN/Infinity
    const L = (result && isFinite(result.L_nH)) ? result.L_nH : null;
    const C = (result && isFinite(result.C_pF)) ? result.C_pF : null;
    return { L_nH: L, C_pF: C };
  } catch (e) {
    console.warn('calculateLC error:', e.message);
    return { L_nH: null, C_pF: null };
  }
}

function runAnalysis() {
  const paramId = document.getElementById("paramSelect").value;
  const paramName = document.getElementById("paramSelect").options[document.getElementById("paramSelect").selectedIndex].text;
  const start = parseFloat(document.getElementById("paramStart").value);
  const end = parseFloat(document.getElementById("paramEnd").value);
  const steps = parseInt(document.getElementById("paramSteps").value);
  const statusEl = document.getElementById("paramStatus");

  if (isNaN(start) || isNaN(end) || isNaN(steps) || steps < 2) {
    statusEl.textContent = "Erro: Valores inválidos.";
    statusEl.style.color = "red";
    return;
  }

  statusEl.textContent = "Simulando...";
  statusEl.style.color = "#1976d2";
  
  lastResults = [];
  lastParamName = paramName;

  // Use um setTimeout para dar tempo de atualizar o UI ("Simulando...") antes do loop travante
  setTimeout(() => {
    let baseState = currentConfig.getCurrentState();

    // Ler os valores fixos diretamente dos inputs gerados no modal
    const fixedInputs = document.querySelectorAll(".fixed-param-input");
    fixedInputs.forEach(input => {
      const pid = input.dataset.paramId;
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        baseState[pid] = val;
      }
    });

    const stepSize = (end - start) / (steps - 1);

    for (let i = 0; i < steps; i++) {
      const val = start + i * stepSize;
      
      // Clone state and override the parameter
      const simState = { ...baseState };
      simState[paramId] = val;

      // Calcular curva S21
      const curve = currentConfig.calculateS21(simState); // [{f, s21}]
      
      // Extrair fr e bw
      const metrics = extractMetrics(curve);

      // Calcular L e C
      const lc = calculateLC(simState);

      lastResults.push({
        paramVal: val,
        fr: metrics.fr,
        bw: metrics.bw,
        L_nH: lc.L_nH,
        C_pF: lc.C_pF
      });
    }

    statusEl.textContent = "Concluído.";
    statusEl.style.color = "green";
    // Mostra o botão de exportar após a simulação concluir
    const exportBtn = document.getElementById("exportParametricBtn");
    if (exportBtn) exportBtn.style.display = "inline-block";
    renderChart();
  }, 50);
}

function extractMetrics(curve) {
  if (!curve || curve.length === 0) return { fr: null, bw: null };

  // === ENCONTRAR A PRIMEIRA RESSONÂNCIA (primeiro mínimo local) ===
  // Topologias como a Cruz de Jerusalém possuem 2 frequências de ressonância.
  // Precisamos considerar apenas a primeira para a análise paramétrica.
  
  let minS21 = Infinity;
  let minF = null;
  let minIdx = -1;

  // Estratégia: percorrer a curva e encontrar o primeiro mínimo local.
  // Um mínimo local ocorre quando a curva para de descer e começa a subir.
  // Usamos uma tolerância para evitar falsos mínimos por ruído numérico.
  const NOISE_TOLERANCE = 0.5; // dB - ignora oscilações menores que isso

  for (let i = 1; i < curve.length - 1; i++) {
    if (curve[i].s21 <= curve[i - 1].s21 && curve[i].s21 <= curve[i + 1].s21) {
      // Ponto i é um candidato a mínimo local.
      // Verificar se é um mínimo significativo: a curva deve subir pelo menos
      // NOISE_TOLERANCE dB depois deste ponto para confirmar que é um mínimo real.
      let confirmed = false;
      for (let j = i + 1; j < curve.length; j++) {
        if (curve[j].s21 > curve[i].s21 + NOISE_TOLERANCE) {
          confirmed = true;
          break;
        }
        // Se continua descendo significativamente, este não era o mínimo real
        if (curve[j].s21 < curve[i].s21 - NOISE_TOLERANCE) {
          break;
        }
      }
      
      if (confirmed && curve[i].s21 < minS21) {
        minS21 = curve[i].s21;
        minF = curve[i].f;
        minIdx = i;
        break; // Primeira ressonância encontrada — parar aqui
      }
    }
  }

  // Fallback: se nenhum mínimo local confirmado foi encontrado, usar o mínimo global
  if (minF === null) {
    for (let i = 0; i < curve.length; i++) {
      if (curve[i].s21 < minS21) {
        minS21 = curve[i].s21;
        minF = curve[i].f;
        minIdx = i;
      }
    }
  }

  if (minS21 > -10) {
    // Não tem ressonância forte o suficiente
    return { fr: minF, bw: 0 };
  }

  // === BANDWIDTH: considerar apenas ao redor da primeira ressonância ===
  // Encontra os cruzamentos de -10dB mais próximos do primeiro mínimo
  let fLow = null;
  let fHigh = null;

  // Busca fLow: cruzamento descendo ANTES do mínimo
  for (let i = 0; i < minIdx; i++) {
    const p1 = curve[i];
    const p2 = curve[i + 1];
    if (p1.s21 >= -10 && p2.s21 <= -10) {
      fLow = interpolate(p1.f, p1.s21, p2.f, p2.s21, -10);
    }
  }

  // Busca fHigh: primeiro cruzamento subindo DEPOIS do mínimo
  for (let i = minIdx; i < curve.length - 1; i++) {
    const p1 = curve[i];
    const p2 = curve[i + 1];
    if (p1.s21 <= -10 && p2.s21 >= -10) {
      fHigh = interpolate(p1.f, p1.s21, p2.f, p2.s21, -10);
      break; // Pegar apenas o primeiro cruzamento subindo após o mínimo
    }
  }

  let bw = 0;
  if (fLow !== null && fHigh !== null && minF !== null) {
    const absoluteBw = fHigh - fLow;
    bw = absoluteBw; // BW absoluto em GHz
  }

  return { fr: minF, bw: bw };
}

function interpolate(x1, y1, x2, y2, yTarget) {
  if (y2 === y1) return x1;
  return x1 + (yTarget - y1) * (x2 - x1) / (y2 - y1);
}

function renderChart() {
  const plotType = document.getElementById("plotTypeSelect").value;
  const ctx = document.getElementById("parametricChartCanvas").getContext("2d");

  if (parametricChart) {
    parametricChart.destroy();
  }

  const xData = lastResults.map(r => r.paramVal);

  // === MODO L & C: DUAL AXIS ===
  if (plotType === 'lc') {
    const yL = lastResults.map(r => r.L_nH);
    const yC = lastResults.map(r => r.C_pF);

    parametricChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: xData.map(v => v.toFixed(2)),
        datasets: [
          {
            label: 'Indutância L (nH)',
            data: yL,
            borderColor: '#1976d2',
            backgroundColor: '#1976d233',
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            tension: 0.3,
            yAxisID: 'yL'
          },
          {
            label: 'Capacitância C (pF)',
            data: yC,
            borderColor: '#c62828',
            backgroundColor: '#c6282833',
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            tension: 0.3,
            yAxisID: 'yC'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              title: (items) => `${lastParamName}: ${items[0].label}`,
              label: (item) => {
                const unit = item.datasetIndex === 0 ? 'nH' : 'pF';
                return `${item.dataset.label}: ${item.raw ? item.raw.toFixed(4) : 'N/A'} ${unit}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: lastParamName, font: { weight: 'bold' } }
          },
          yL: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Indutância L (nH)', font: { weight: 'bold' }, color: '#1976d2' },
            ticks: { color: '#1976d2' },
            grid: { drawOnChartArea: true }
          },
          yC: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Capacitância C (pF)', font: { weight: 'bold' }, color: '#c62828' },
            ticks: { color: '#c62828' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
    return;
  }

  // === MODO FR: DUAL AXIS com L×C ===
  if (plotType === 'fr') {
    const yFr = lastResults.map(r => r.fr);
    const yLC = lastResults.map(r => {
      if (r.L_nH != null && r.C_pF != null) return r.L_nH * r.C_pF;
      return null;
    });

    parametricChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: xData.map(v => v.toFixed(2)),
        datasets: [
          {
            label: 'Freq. Ressonância (GHz)',
            data: yFr,
            borderColor: '#e53935',
            backgroundColor: '#e5393533',
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            tension: 0.3,
            yAxisID: 'yFr'
          },
          {
            label: 'Produto L×C (nH·pF)',
            data: yLC,
            borderColor: '#6a1b9a',
            backgroundColor: '#6a1b9a33',
            borderWidth: 2.5,
            borderDash: [6, 3],
            pointRadius: 4,
            pointHoverRadius: 6,
            pointStyle: 'rectRot',
            fill: false,
            tension: 0.3,
            yAxisID: 'yLC'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              title: (items) => `${lastParamName}: ${items[0].label}`,
              label: (item) => {
                if (item.datasetIndex === 0) {
                  return `fr: ${item.raw ? item.raw.toFixed(3) : 'N/A'} GHz`;
                } else {
                  return `L×C: ${item.raw ? item.raw.toFixed(4) : 'N/A'} nH·pF`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: lastParamName, font: { weight: 'bold' } }
          },
          yFr: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Freq. Ressonância (GHz)', font: { weight: 'bold' }, color: '#e53935' },
            ticks: { color: '#e53935' },
            grid: { drawOnChartArea: true }
          },
          yLC: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Produto L×C (nH·pF)', font: { weight: 'bold' }, color: '#6a1b9a' },
            ticks: { color: '#6a1b9a' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
    return;
  }

  // === MODO BW ===
  const yData = lastResults.map(r => r.bw);
  const label = 'Largura de Banda (-10 dB) (GHz)';
  const color = '#1e88e5';

  parametricChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xData.map(v => v.toFixed(2)),
      datasets: [{
        label: label,
        data: yData,
        borderColor: color,
        backgroundColor: color + '33',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
             title: (ctx) => `${lastParamName}: ${ctx[0].label}`,
             label: (ctx) => `${label}: ${ctx.raw ? ctx.raw.toFixed(3) : 'N/A'}`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: lastParamName, font: { weight: 'bold' } }
        },
        y: {
          title: { display: true, text: label, font: { weight: 'bold' } }
        }
      }
    }
  });
}

// ==========================================
// FUNÇÃO: exportParametricCSV()
// Exporta os dados da análise paramétrica em 2 arquivos CSV separados:
//   (a) Frequência de Ressonância + Produto L×C
//   (b) Indutância L + Capacitância C
// Formato: separador de colunas = ponto-e-vírgula (;)
//          separador decimal = vírgula (,) — padrão BR para Excel
// ==========================================
function exportParametricCSV() {
  if (!lastResults || lastResults.length === 0) {
    alert("Nenhum dado para exportar. Execute a simulação primeiro.");
    return;
  }

  const topologyName = currentConfig ? currentConfig.topologyName : "Topologia";
  const safeName = topologyName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const safeParam = lastParamName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

  // Formata número para padrão brasileiro (vírgula como separador decimal)
  const fmtBR = (val, decimals = 4) => {
    if (val === null || val === undefined || !isFinite(val)) return "N/A";
    return val.toFixed(decimals).replace(".", ",");
  };

  // ==============================
  // CSV (a) — Frequência e L×C
  // ==============================
  let csvA = "\uFEFF"; // BOM UTF-8
  csvA += `${lastParamName};fr (GHz);L x C (nH.pF)\r\n`;

  for (const r of lastResults) {
    const paramStr = fmtBR(r.paramVal, 3);
    const frStr = fmtBR(r.fr, 4);
    let lcProduct = "N/A";
    if (r.L_nH != null && r.C_pF != null && isFinite(r.L_nH) && isFinite(r.C_pF)) {
      lcProduct = fmtBR(r.L_nH * r.C_pF, 4);
    }
    csvA += `${paramStr};${frStr};${lcProduct}\r\n`;
  }

  // ==============================
  // CSV (b) — Indutância L e Capacitância C
  // ==============================
  let csvB = "\uFEFF"; // BOM UTF-8
  csvB += `${lastParamName};L (nH);C (pF)\r\n`;

  for (const r of lastResults) {
    const paramStr = fmtBR(r.paramVal, 3);
    const lStr = fmtBR(r.L_nH, 4);
    const cStr = fmtBR(r.C_pF, 4);
  const defaultBaseName = `parametrica_${safeName}_${safeParam}`;
  const defaultNameA = `${defaultBaseName}_fr_LxC.csv`;
  const defaultNameB = `${defaultBaseName}_L_C.csv`;

  // ==============================
  // Modal de Exportação Bonito
  // ==============================
  const exportModalOverlay = document.createElement("div");
  exportModalOverlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10000; display:flex; align-items:center; justify-content:center;";
  
  exportModalOverlay.innerHTML = `
    <div style="background:white; padding:25px; border-radius:8px; width:100%; max-width:450px; box-shadow:0 4px 20px rgba(0,0,0,0.3); font-family:Arial,sans-serif;">
      <h3 style="margin-top:0; color:#333; border-bottom:1px solid #eee; padding-bottom:10px;">Exportar Dados CSV</h3>
      <p style="font-size:14px; color:#555; margin-bottom:20px;">Defina os nomes dos arquivos que serão gerados:</p>
      
      <div style="margin-bottom:15px;">
        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px; color:#1976d2;">Arquivo (a) - Frequência e L×C:</label>
        <input type="text" id="csvFilenameA" value="${defaultNameA}" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; font-size:13px;">
      </div>
      
      <div style="margin-bottom:25px;">
        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px; color:#1976d2;">Arquivo (b) - Indutância e Capacitância:</label>
        <input type="text" id="csvFilenameB" value="${defaultNameB}" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; font-size:13px;">
      </div>
      
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="cancelExportBtn" style="padding:10px 15px; border:1px solid #ccc; background:#f9f9f9; color:#333; border-radius:4px; cursor:pointer; font-weight:bold; transition: background 0.2s;">Cancelar</button>
        <button id="confirmExportBtn" style="padding:10px 15px; border:none; background:#2e7d32; color:white; border-radius:4px; cursor:pointer; font-weight:bold; transition: background 0.2s;">📥 Baixar Arquivos</button>
      </div>
    </div>
  `;

  document.body.appendChild(exportModalOverlay);

  // Efeitos hover simples pros botões
  const cancelBtn = document.getElementById("cancelExportBtn");
  const confirmBtn = document.getElementById("confirmExportBtn");
  
  cancelBtn.onmouseover = () => cancelBtn.style.background = "#ececec";
  cancelBtn.onmouseout = () => cancelBtn.style.background = "#f9f9f9";
  
  confirmBtn.onmouseover = () => confirmBtn.style.background = "#1b5e20";
  confirmBtn.onmouseout = () => confirmBtn.style.background = "#2e7d32";

  // Função interna para download real
  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  // Ações dos botões
  cancelBtn.onclick = () => {
    document.body.removeChild(exportModalOverlay);
  };

  confirmBtn.onclick = () => {
    const filenameA = document.getElementById("csvFilenameA").value.trim() || defaultNameA;
    const filenameB = document.getElementById("csvFilenameB").value.trim() || defaultNameB;
    
    // Garante a extensão .csv
    const finalA = filenameA.toLowerCase().endsWith(".csv") ? filenameA : filenameA + ".csv";
    const finalB = filenameB.toLowerCase().endsWith(".csv") ? filenameB : filenameB + ".csv";

    // Inicia downloads
    downloadCSV(csvA, finalA);

    setTimeout(() => {
      downloadCSV(csvB, finalB);
    }, 300);

    document.body.removeChild(exportModalOverlay);
  };
}
