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
  const container = document.querySelector(".header-actions") || document.querySelector(".controls");
  if (!container) return; // Fallback se não achar

  // Evitar duplicidade
  if (document.getElementById("btnParametric")) return;

  const btn = document.createElement("button");
  btn.id = "btnParametric";
  btn.className = "btn-secondary";
  btn.innerHTML = `⚙️ Análise Paramétrica`;
  btn.style.marginLeft = "10px";
  btn.style.background = "#6a1b9a";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.padding = "8px 16px";
  btn.style.borderRadius = "4px";
  btn.style.cursor = "pointer";
  btn.style.fontWeight = "bold";
  btn.style.transition = "background 0.3s";
  btn.onmouseover = () => btn.style.background = "#4a148c";
  btn.onmouseout = () => btn.style.background = "#6a1b9a";

  btn.addEventListener("click", openModal);
  container.appendChild(btn);
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
            <input type="number" id="paramSteps" value="10" min="2" max="100" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
          </div>
        </div>

        <div style="display:flex; gap:20px; align-items:center; margin-bottom:20px;">
          <button id="runParametricBtn" style="background:#1976d2; color:white; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:14px;">▶ Simular Curva</button>
          
          <div style="flex:1;">
             <label style="font-size:12px; font-weight:bold; margin-right:10px;">Eixo Y:</label>
             <select id="plotTypeSelect" style="padding:6px; border:1px solid #ccc; border-radius:4px;">
               <option value="fr">Frequência de Ressonância (GHz)</option>
               <option value="bw">Largura de Banda (-10 dB) (%)</option>
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

  document.getElementById("parametricModal").style.display = "block";
}

let lastResults = []; // [{paramVal, fr, bw}]
let lastParamName = "";

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
    const baseState = currentConfig.getCurrentState();
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
      lastResults.push({
        paramVal: val,
        fr: metrics.fr,
        bw: metrics.bw
      });
    }

    statusEl.textContent = "Concluído.";
    statusEl.style.color = "green";
    renderChart();
  }, 50);
}

function extractMetrics(curve) {
  if (!curve || curve.length === 0) return { fr: null, bw: null };

  let minS21 = Infinity;
  let minF = null;

  // Find resonant frequency (fr)
  for (let pt of curve) {
    if (pt.s21 < minS21) {
      minS21 = pt.s21;
      minF = pt.f;
    }
  }

  if (minS21 > -10) {
    // Não tem ressonância forte o suficiente
    return { fr: minF, bw: 0 };
  }

  // Find Bandwidth at -10dB
  let fLow = null;
  let fHigh = null;

  for (let i = 0; i < curve.length - 1; i++) {
    const p1 = curve[i];
    const p2 = curve[i+1];
    if (p1.s21 >= -10 && p2.s21 <= -10) {
      // Cruzamento descendo
      fLow = interpolate(p1.f, p1.s21, p2.f, p2.s21, -10);
    }
    if (p1.s21 <= -10 && p2.s21 >= -10) {
      // Cruzamento subindo
      fHigh = interpolate(p1.f, p1.s21, p2.f, p2.s21, -10);
    }
  }

  let bw = 0;
  if (fLow !== null && fHigh !== null && minF !== null) {
    const absoluteBw = fHigh - fLow;
    bw = (absoluteBw / minF) * 100; // BW Fracional em %
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
  const yData = lastResults.map(r => plotType === 'fr' ? r.fr : r.bw);

  const label = plotType === 'fr' ? 'Frequência de Ressonância (GHz)' : 'Largura de Banda (-10 dB) (%)';
  const color = plotType === 'fr' ? '#e53935' : '#1e88e5';

  parametricChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xData.map(v => v.toFixed(2)),
      datasets: [{
        label: label,
        data: yData,
        borderColor: color,
        backgroundColor: color + '33', // com transparência
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
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
          title: {
            display: true,
            text: lastParamName,
            font: { weight: 'bold' }
          }
        },
        y: {
          title: {
            display: true,
            text: label,
            font: { weight: 'bold' }
          }
        }
      }
    }
  });
}
