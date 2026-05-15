// ==========================================
// SIMULADOR FSS - ESPIRA QUADRADA (BENCHMARK ANALÍTICO + HFSS)
// Interface de usuário e atualização de gráficos
// ==========================================
// Este arquivo gerencia o simulador da Espira Quadrada (Square Loop FSS)
// Uma espira quadrada é um laço quadrado de fio metálico que funciona como FSS
// O arquivo controla:
//   - Entrada de dados do usuário (sliders, campos numéricos)
//   - Desenho da geometria (visualização 2D da espira)
//   - Cálculos do comportamento eletromagnético
//   - Gráficos mostrando S21 em diferentes frequências
//   - Export/import de dados para comparação com HFSS

import { mmToCm, FF } from "./math.js"; // Importa funções matemáticas compartilhadas

// Variável global que armazena a instância do gráfico Chart.js
let chart = null;
// Variável global que armazena dados importados do software HFSS (simulação 3D de referência)
let hfssData = null; // Array com pontos {x: frequência, y: valor de S21} do HFSS

// Evento que executa quando a página HTML foi completamente carregada
document.addEventListener("DOMContentLoaded", () => {
  // Função que conecta um controle deslizante (slider) com um campo numérico
  // Quando o usuário muda um valor em um, o outro é atualizado automaticamente
  function bindInputs(idPrefix) {
    // Encontra os elementos HTML do slider e do campo numérico
    const slider = document.getElementById(idPrefix + "_slider");
    const num = document.getElementById(idPrefix + "_num");
    if (!slider || !num) return; // Se não encontrar, sai da função

    // Quando o slider é movido
    slider.addEventListener("input", (e) => {
      // Define quantas casas decimais cada parâmetro deve ter
      const decimals =
        idPrefix === "fStart" || idPrefix === "fEnd"
          ? 1                    // Frequências: 1 casa decimal
          : idPrefix === "er" || idPrefix === "h_sub"
            ? 2                  // Permissividade e altura: 2 casas
            : 3;                 // Outras dimensões: 3 casas
      // Copia o valor do slider para o campo numérico com as casas corretas
      num.value = parseFloat(e.target.value).toFixed(decimals);
      updateAll(); // Recalcula tudo
    });

    // Quando o campo numérico é editado
    num.addEventListener("input", (e) => {
      // Copia o valor do campo numérico para o slider
      slider.value = e.target.value;
      updateAll(); // Recalcula tudo
    });
  }

  // Conecta todos os parâmetros:
  // fStart = frequência inicial (GHz)
  // fEnd = frequência final (GHz)
  // p = período da célula (mm)
  // d = diâmetro/comprimento da espira (mm)
  // w = largura do fio da espira (mm)
  // h_sub = altura do substrato (mm)
  // er = constante dielétrica do material
  ["fStart", "fEnd", "p", "d", "w", "h_sub", "er"].forEach(bindInputs);

  // Encontra o seletor de substrato (material da PCB)
  const subSelect = document.getElementById("substrate_select");
  if (subSelect) {
    // Quando o usuário muda o substrato
    subSelect.addEventListener("change", (e) => {
      // Se selecionou RO3003: permissividade 3.00 e altura 1.52mm
      if (e.target.value === "RO3003") {
        document.getElementById("er_num").value = "3.00";
        document.getElementById("er_slider").value = "3.00";
        document.getElementById("h_sub_num").value = "1.52";
        document.getElementById("h_sub_slider").value = "1.52";
      } else if (e.target.value === "RO3006") {
        // Se selecionou RO3006: permissividade 6.50 e altura 1.28mm
        document.getElementById("er_num").value = "6.50";
        document.getElementById("er_slider").value = "6.50";
        document.getElementById("h_sub_num").value = "1.28";
        document.getElementById("h_sub_slider").value = "1.28";
      }
      updateAll(); // Recalcula com os novos valores
    });
  }

  // ===== BOTÕES DE EXPORTAÇÃO E CARREGAMENTO =====
  // Encontra o botão de exportar
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    // Ao clicar em exportar, salva os dados em CSV
    exportBtn.addEventListener("click", exportToCSV);

    // Cria um input invisível para selecionar arquivo CSV
    const hfssInput = document.createElement("input");
    hfssInput.type = "file";
    hfssInput.accept = ".csv"; // Aceita apenas CSV
    hfssInput.style.display = "none"; // Esconde o elemento
    hfssInput.addEventListener("change", handleHFSSUpload); // Quando arquivo é selecionado

    // Cria um botão visual que parece um botão normal
    const hfssBtn = document.createElement("button");
    hfssBtn.innerText = "Carregar Dados HFSS";
    hfssBtn.style.cssText = "margin-top: 10px; margin-left: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;";
    hfssBtn.onclick = () => hfssInput.click(); // Ao clicar, abre o seletor de arquivo

    // Adiciona os elementos à página
    exportBtn.parentNode.insertBefore(hfssInput, exportBtn.nextSibling);
    exportBtn.parentNode.insertBefore(hfssBtn, exportBtn.nextSibling);
  }

  // Executa uma atualização inicial quando a página carrega
  updateAll();
});

// ==========================================
// FUNÇÃO: handleHFSSUpload()
// Lê o arquivo CSV gerado pelo software Ansys HFSS
// Esta função permite carregar dados de simulação 3D para comparação
// ==========================================
function handleHFSSUpload(event) {
  // Obtém o arquivo selecionado
  const file = event.target.files[0];
  if (!file) return; // Se nada foi selecionado, sai

  // Cria um leitor de arquivo
  const reader = new FileReader();
  reader.onload = (e) => {
    // Obtém o conteúdo do arquivo como texto
    const text = e.target.result;
    // Divide em linhas
    const lines = text.split('\n');
    // Inicializa array vazio para dados
    hfssData = []; 

    // Percorre cada linha (começando da linha 1 para pular o cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Pula linhas vazias
      const parts = lines[i].split(','); // Divide por vírgula
      if (parts.length >= 2) {
        const freq = parseFloat(parts[0]); // Primeira coluna: frequência
        const s21 = parseFloat(parts[1]); // Segunda coluna: S21
        // Valida que são números válidos
        if (!isNaN(freq) && !isNaN(s21)) {
          hfssData.push({ x: freq, y: s21 }); // Adiciona o ponto de dados
        }
      }
    }
    
    // Mostra uma mensagem com quantos pontos foram carregados
    alert(`Dados do HFSS carregados com sucesso! (${hfssData.length} pontos encontrados)`);
    updateAll(); // Atualiza os gráficos
  };
  reader.readAsText(file); // Lê o arquivo como texto
}

// Função que desenha a Espira Quadrada e suas repetições no canvas
function drawGeometry(p, d, w, g) {
  // Encontra o canvas (elemento onde vamos desenhar)
  const canvas = document.getElementById("shapeCanvas");
  if (!canvas) return; // Se não existir, sai
  // Obtém o contexto 2D para desenhar
  const ctx = canvas.getContext("2d");
  const size = canvas.width; // Tamanho do canvas em pixels

  // Limpa o canvas (apaga o que estava antes)
  ctx.clearRect(0, 0, size, size);

  // Define a área visível e a escala
  const viewSize = p * 2.2;            // Um pouco maior que o período
  const scale = size / viewSize;        // Quantos pixels por unidade
  const center = size / 2;              // Centro do canvas
  const pPixel = p * scale;             // Período em pixels
  const dPixel = d * scale;             // Diâmetro da espira em pixels
  const wPixel = w * scale;             // Largura do fio em pixels
  // Calcula o tamanho interno (furo) da espira
  const innerPixel = Math.max(0, dPixel - 2 * wPixel);

  // Função auxiliar que desenha uma espira quadrada em uma posição (cx, cy)
  function drawSquareLoop(cx, cy, isCenter) {
    // Cor: azul escuro para central, azul claro para vizinhas
    ctx.fillStyle = isCenter ? "#003366" : "rgba(0, 51, 102, 0.12)";
    // Desenha o quadrado exterior (fio da espira)
    ctx.fillRect(cx - dPixel / 2, cy - dPixel / 2, dPixel, dPixel);
    // Se há um furo interno
    if (innerPixel > 0) {
      // Apaga o furo (deixa transparente)
      ctx.clearRect(cx - innerPixel / 2, cy - innerPixel / 2, innerPixel, innerPixel);
      // Se não é a central, preenche o furo com cor de fundo
      if (!isCenter) {
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(cx - innerPixel / 2, cy - innerPixel / 2, innerPixel, innerPixel);
      }
    }
  }

  // Posições das 4 espiras vizinhas (acima, abaixo, esquerda, direita)
  const neighbors = [
    { i: 0, j: -1 }, // Acima
    { i: 0, j: 1 },  // Abaixo
    { i: -1, j: 0 }, // À esquerda
    { i: 1, j: 0 },  // À direita
  ];
  // Desenha cada vizinha com cor mais clara
  neighbors.forEach((n) => drawSquareLoop(center + n.i * pPixel, center + n.j * pPixel, false));
  // Desenha a espira central com cor mais escura
  drawSquareLoop(center, center, true);

  // ===== Desenha a linha tracejada do período =====
  ctx.setLineDash([5, 5]);              // Define o padrão tracejado
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)"; // Cor preta semitransparente
  ctx.lineWidth = 1;                    // Espessura da linha
  // Desenha um quadrado tracejado mostrando a célula unitária
  ctx.strokeRect(center - pPixel / 2, center - pPixel / 2, pPixel, pPixel);
  ctx.setLineDash([]);                  // Remove o padrão tracejado
}

function updateAll() {
  const fStart = parseFloat(document.getElementById("fStart_num").value);
  const fEnd = parseFloat(document.getElementById("fEnd_num").value);
  const p = parseFloat(document.getElementById("p_num").value);
  let d = parseFloat(document.getElementById("d_num").value);
  const w = parseFloat(document.getElementById("w_num").value);
  const h_sub = parseFloat(document.getElementById("h_sub_num").value);
  const er_real = parseFloat(document.getElementById("er_num").value);

  if (fStart <= 0 || fEnd <= 0 || p <= 0 || d <= 0 || w <= 0 || er_real <= 0 || fStart >= fEnd) {
    if (chart) chart.destroy();
    return;
  }

  if (d >= p) {
    d = p - 0.001;
    document.getElementById("d_num").value = d.toFixed(3);
  }

  const g = p - d;
  const gEl = document.getElementById("g_num");
  if (gEl) gEl.value = g.toFixed(3);

  // =========================================
  // FATOR DE FORMA DINÂMICO (ALPHA) - COSTA (2020)
  // =========================================
  const ratio = w / p;
  let alpha = 16 - (ratio - 0.05) * ( (16 - 12.5) / (0.25 - 0.05) );
  alpha = Math.max(12.5, Math.min(16, alpha)); 

  // =========================================
  // AS 6 FÓRMULAS DE PERMISSIVIDADE EFETIVA
  // =========================================
  
  // 1. Média (Ar-Dielétrico - Interface Semi-infinita)
  const er_media = (er_real + 1) / 2;

  // 2. Nova (Ajuste Exponencial Avançado: Costa, Alpha Dinâmico para Espiras)
  const er_nova = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-alpha * (h_sub / p)));

  // 3. A NOVA HEURÍSTICA DO UTILIZADOR
  // Passo 1: Calcula o Delta (média entre er_media e er_nova)
  const delta = (er_media + er_nova) / 2;
  // Passo 2: Calcula a nova média entre o Delta e o er_nova
  const er_tentativa = (delta + er_nova) / 2;

  // 4. Antiga (Ajuste Exponencial Fixo Clássico: Munk, Alpha = 1.8)
  const er_antiga = 1 + ((er_real - 1) / 2) * (1 - Math.exp(-1.8 * (h_sub / p)));

  // 5. Tangente Hiperbólica (Floquet clássico)
  const er_tanh = 1 + ((er_real - 1) / 2) * Math.tanh((Math.PI * h_sub) / p);

  // 6. Material Puro (Ignora o Ar)
  const er_puro = er_real;

  const erEffEl = document.getElementById("er_eff_num");
  if (erEffEl) erEffEl.value = er_nova.toFixed(3);

  drawGeometry(p, d, w, g);

  const df = 0.001;
  const pCm = mmToCm(p);
  const dCm = mmToCm(d);
  const wCm = mmToCm(w);
  const gCm = mmToCm(g);
  const Rs = 0.008;

  const data_nova = [];
  const data_tentativa = []; // Array para a sua nova fórmula
  const data_antiga = [];
  const data_media = [];
  const data_tanh = [];
  const data_puro = [];
  const labels = [];
  const f_limit = 30 / pCm;

  for (let freq = fStart; freq <= fEnd; freq += df) {
    const lamb = 30 / freq;
    const ang = 0;

    try {
      const XL = (dCm / pCm) * FF(pCm, 2 * wCm, lamb, ang);
      
      const BC_nova = 4 * er_nova * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_tentativa = 4 * er_tentativa * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_antiga = 4 * er_antiga * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_media = 4 * er_media * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_tanh = 4 * er_tanh * (dCm / pCm) * FF(pCm, gCm, lamb, ang);
      const BC_puro = 4 * er_puro * (dCm / pCm) * FF(pCm, gCm, lamb, ang);

      const X_nova = XL - 1 / BC_nova;
      const X_tentativa = XL - 1 / BC_tentativa;
      const X_antiga = XL - 1 / BC_antiga;
      const X_media = XL - 1 / BC_media;
      const X_tanh = XL - 1 / BC_tanh;
      const X_puro = XL - 1 / BC_puro;

      const pt_nova = (Rs * Rs + X_nova * X_nova) / (Rs * Rs + X_nova * X_nova + Rs + 0.25);
      const pt_tentativa = (Rs * Rs + X_tentativa * X_tentativa) / (Rs * Rs + X_tentativa * X_tentativa + Rs + 0.25);
      const pt_antiga = (Rs * Rs + X_antiga * X_antiga) / (Rs * Rs + X_antiga * X_antiga + Rs + 0.25);
      const pt_media = (Rs * Rs + X_media * X_media) / (Rs * Rs + X_media * X_media + Rs + 0.25);
      const pt_tanh = (Rs * Rs + X_tanh * X_tanh) / (Rs * Rs + X_tanh * X_tanh + Rs + 0.25);
      const pt_puro = (Rs * Rs + X_puro * X_puro) / (Rs * Rs + X_puro * X_puro + Rs + 0.25);

      labels.push(freq.toFixed(3));
      data_nova.push(Math.max(-60, 10 * Math.log10(pt_nova)));
      data_tentativa.push(Math.max(-60, 10 * Math.log10(pt_tentativa)));
      data_antiga.push(Math.max(-60, 10 * Math.log10(pt_antiga)));
      data_media.push(Math.max(-60, 10 * Math.log10(pt_media)));
      data_tanh.push(Math.max(-60, 10 * Math.log10(pt_tanh)));
      data_puro.push(Math.max(-60, 10 * Math.log10(pt_puro)));
    } catch (e) {
      data_nova.push(0); data_tentativa.push(0); data_antiga.push(0); data_media.push(0); data_tanh.push(0); data_puro.push(0);
    }
  }

  let hfssPlotData = [];
  if (hfssData && hfssData.length > 0) {
    let hfssIndex = 0;
    hfssPlotData = labels.map(labelStr => {
      const f = parseFloat(labelStr);
      while (hfssIndex < hfssData.length - 1 && hfssData[hfssIndex].x < f) {
        hfssIndex++;
      }
      if (Math.abs(hfssData[hfssIndex].x - f) < 0.005) {
        return hfssData[hfssIndex].y;
      }
      return null;
    });
  }

  let limitIndex = -1;
  for (let i = 0; i < labels.length; i++) {
    if (parseFloat(labels[i]) >= f_limit) { limitIndex = i; break; }
  }

  updateChart(labels, data_nova, data_tentativa, data_antiga, data_media, data_tanh, data_puro, hfssPlotData, limitIndex, f_limit, alpha, er_tentativa);
}

// Função que atualiza o gráfico com os dados calculados
// Cria um gráfico com 6 curvas de modelos diferentes + dados HFSS se disponível
function updateChart(labels, data_nova, data_tentativa, data_antiga, data_media, data_tanh, data_puro, hfssPlotData, limitIndex, f_limit, alpha, er_tentativa) {
  // Obtém o contexto 2D do canvas do gráfico
  const ctx = document.getElementById("fssChart").getContext("2d");
  // Se há um gráfico anterior, o destroi (para criar um novo)
  if (chart) chart.destroy();

  // ===== Encontra a frequência de ressonância =====
  // A ressonância é onde o S21 está no mínimo (máximo bloqueio)
  const validData = limitIndex !== -1 ? data_nova.slice(0, limitIndex) : data_nova;
  const minIndex = validData.indexOf(Math.min(...validData));
  const frFreq = parseFloat(labels[minIndex]); // Frequência em GHz

  // ===== Define os 6 datasets (curvas diferentes) =====
  // Cada uma é um modelo matemático diferente para calcular a transmissão
  const datasets = [
    {
      // Curva 1: Fator de Forma Dinâmico (Costa) - PRINCIPAL
      label: "1. ε_eff Fator Forma Dinâmico (Costa)",
      data: data_nova,
      borderColor: "#000000", // Preto
      borderWidth: 2.5,        // Linha mais grossa
      pointRadius: 0,          // Sem pontos
      fill: false,             // Sem preenchimento
      tension: 0,              // Linha reta, sem curva suave
    },
    {
      // Curva 2: Heurística do Usuário - SUA TENTATIVA
      label: "2. ε_eff Heurística Personalizada (Sua Tentativa)",
      data: data_tentativa,
      borderColor: "#17a2b8", // Azul claro
      borderWidth: 2.5,
      borderDash: [8, 4],      // Linha tracejada
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      // Curva 3: Tangente Hiperbólica
      label: "3. ε_eff Tangente Hiperbólica",
      data: data_tanh,
      borderColor: "#fd7e14", // Laranja
      borderWidth: 2,
      borderDash: [5, 5],      // Tracejado
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      // Curva 4: Exponencial Fixo 1.8 (modelo antigo)
      label: "4. ε_eff Exponencial Fixo 1.8",
      data: data_antiga,
      borderColor: "#28a745", // Verde
      borderWidth: 2,
      borderDash: [3, 6],      // Tracejado
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      // Curva 5: Média Clássica (ar + material) / 2
      label: "5. ε_eff Média Clássica",
      data: data_media,
      borderColor: "#007bff", // Azul escuro
      borderWidth: 2,
      borderDash: [2, 4],      // Tracejado
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    {
      // Curva 6: Material Puro (sem considerar ar)
      label: "6. ε_eff = ε_r (Material Puro)",
      data: data_puro,
      borderColor: "#6f42c1", // Roxo
      borderWidth: 2,
      borderDash: [1, 3],      // Tracejado
      pointRadius: 0,
      fill: false,
      tension: 0,
    }
  ];

  // ===== Adiciona dados do HFSS (se carregados) =====
  // Dados da simulação 3D real do software Ansys HFSS
  if (hfssPlotData && hfssPlotData.length > 0) {
    datasets.push({
      label: "Ansys HFSS (Medição 3D)",
      data: hfssPlotData,
      borderColor: "#dc3545", // Vermelho
      borderWidth: 3,          // Linha mais grossa para se destacar
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  // ===== Marca a frequência de ressonância com um ponto =====
  // Cria um dataset só com o ponto da ressonância
  const frPointData = labels.map((_, idx) => idx === minIndex ? data_nova[idx] : null);
  datasets.push({
    label: `fr = ${frFreq.toFixed(2)} GHz (Curva Principal)`,
    data: frPointData,
    borderColor: "#ff0000",              // Vermelho
    borderWidth: 3,
    pointRadius: 6,                      // Ponto maior
    pointBackgroundColor: "#ff0000",
    showLine: false,                     // Só mostra o ponto, não a linha
  });

  // ===== Marca o limite de difração (se existe) =====
  // Acima dessa frequência, o modelo analítico perde precisão
  if (limitIndex !== -1) {
    const limitPointData = labels.map((_, idx) => idx === limitIndex ? data_nova[idx] : null);
    datasets.push({
      label: `Limite de Difração em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",    // Laranja escuro
      pointRadius: 9,            // Ponto grande
      pointStyle: "triangle",    // Formato de triângulo
      showLine: false,           // Só mostra o ponto
    });
  }

  // ===== Cria o gráfico Chart.js =====
  chart = new Chart(ctx, {
    type: "line",             // Tipo de gráfico: linha
    data: { 
      labels: labels,          // Rótulos do eixo X (frequências)
      datasets: datasets       // Todas as 6 curvas
    },
    options: {
      responsive: true,        // Responsivo (redimensiona com a janela)
      maintainAspectRatio: false, // Mantém altura do canvas fixa
      animation: false,        // Sem animação (mais rápido)
      scales: {
        x: {
          ticks: { maxTicksLimit: 20 }, // Máximo 20 rótulos no eixo X
          title: { display: true, text: "Frequência (GHz)" }
        },
        y: {
          min: -60,        // Mínimo de transmissão (bloqueado)
          max: 0,          // Máximo de transmissão (100%)
          title: { display: true, text: "S21 (dB)" }
        },
      },
      plugins: {
        legend: {
          labels: { font: { family: "Times New Roman" } } // Fonte do rótulo
        }
      },
    },
  });

  // ===== Cria caixa de informação abaixo do gráfico =====
  // Mostra dados importantes: ressonância, fator alfa, permissividade
  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    // Se não existe, cria a caixa
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText = "margin-top: 10px; padding: 10px; background: #fdfd96; border-radius: 4px; font-size: 14px;";
    document.querySelector(".chart-container").after(infoBox);
  }

  // Cria o texto de informação
  let infoHtml = `<strong>Ressonância (Fator de Forma):</strong> ${frFreq.toFixed(2)} GHz | <strong style="color:#0056b3;">Fator (α) dinâmico aplicado: ${alpha.toFixed(2)}</strong> | <strong>ε_eff (Sua Tentativa):</strong> ${er_tentativa.toFixed(3)}`;
  
  // Se há dados HFSS, adiciona aviso
  if (hfssData && hfssData.length > 0) {
     infoHtml += `<br><span style="color:#dc3545; font-weight:bold;">Comparativo ativo: Avalie qual curva aproxima melhor a ressonância do Ansys HFSS.</span>`;
  }
  
  // Se está acima do limite de difração, adiciona aviso de precisão
  if (limitIndex !== -1) {
    infoHtml += `<br><small style="color: #d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo analítico perde precisão.</small>`;
  }
  
  infoBox.innerHTML = infoHtml; // Mostra a informação
}
      label: `Limite de Difração em ${f_limit.toFixed(2)} GHz`,
      data: limitPointData,
      borderColor: "#ff8c00",
      pointRadius: 9,
      pointStyle: "triangle",
      showLine: false,
    });
  }

  chart = new Chart(ctx, {
    type: "line",
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { maxTicksLimit: 20 }, title: { display: true, text: "Frequência (GHz)" } },
        y: { min: -60, max: 0, title: { display: true, text: "S21 (dB)" } },
      },
      plugins: { legend: { labels: { font: { family: "Times New Roman" } } } },
    },
  });

  let infoBox = document.getElementById("resonanceInfo");
  if (!infoBox) {
    infoBox = document.createElement("div");
    infoBox.id = "resonanceInfo";
    infoBox.style.cssText = "margin-top: 10px; padding: 10px; background: #fdfd96; border-radius: 4px; font-size: 14px;";
    document.querySelector(".chart-container").after(infoBox);
  }

  let infoHtml = `<strong>Ressonância (Fator de Forma):</strong> ${frFreq.toFixed(2)} GHz | <strong style="color:#0056b3;">Fator (α) dinâmico aplicado: ${alpha.toFixed(2)}</strong> | <strong>ε_eff (Sua Tentativa):</strong> ${er_tentativa.toFixed(3)}`;
  if (hfssData && hfssData.length > 0) {
     infoHtml += `<br><span style="color:#dc3545; font-weight:bold;">Comparativo ativo: Avalie qual curva aproxima melhor a ressonância do Ansys HFSS.</span>`;
  }
  if (limitIndex !== -1) {
    infoHtml += `<br><small style="color: #d35400">⚠️ Aviso: Acima de ${f_limit.toFixed(2)} GHz o modelo analítico perde precisão.</small>`;
  }
  infoBox.innerHTML = infoHtml;
}

// Função que exporta os dados do gráfico para arquivo CSV
// Permite análise posterior em Excel ou outros programas
function exportToCSV() {
  // Verifica se há um gráfico
  if (!chart) return;
  
  // Inicia o CSV com byte-order mark (BOM) para facilitar leitura em Excel
  // Coluna headers: frequência + dados de cada um dos 6 modelos
  let csv = "\uFEFF" + "Frequência (GHz);S21 Nova (dB);S21 Tentativa (dB);S21 Tanh (dB);S21 Antiga (dB);S21 Media (dB);S21 Sem Correcao (dB)\n";
  
  // Loop por cada frequência
  chart.data.labels.forEach((freq, index) => {
    // Extrai os valores S21 de cada modelo
    let s21_nova = chart.data.datasets[0].data[index];              // Modelo 1
    let s21_tentativa = chart.data.datasets[1].data[index];        // Modelo 2
    let s21_tanh = chart.data.datasets[2].data[index];             // Modelo 3
    let s21_antiga = chart.data.datasets[3].data[index];           // Modelo 4
    let s21_media = chart.data.datasets[4].data[index];            // Modelo 5
    let s21_puro = chart.data.datasets[5].data[index];             // Modelo 6
    
    // Converte para formato brasileiro (ponto por vírgula)
    let f_BR = Number(freq).toFixed(3).replace(".", ",");
    let sN_BR = Number(s21_nova).toFixed(4).replace(".", ",");
    let sTent_BR = Number(s21_tentativa).toFixed(4).replace(".", ",");
    let sT_BR = Number(s21_tanh).toFixed(4).replace(".", ",");
    let sA_BR = Number(s21_antiga).toFixed(4).replace(".", ",");
    let sM_BR = Number(s21_media).toFixed(4).replace(".", ",");
    let sP_BR = Number(s21_puro).toFixed(4).replace(".", ",");
    
    // Adiciona uma linha no CSV com ponto-e-vírgula como separador
    csv += `${f_BR};${sN_BR};${sTent_BR};${sT_BR};${sA_BR};${sM_BR};${sP_BR}\n`;
  });
  
  // Cria um blob (arquivo) do tipo CSV
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  // Cria um link para download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dados_espira_comparacao_completa.csv"; // Nome do arquivo
  link.click(); // Simula clique no link para fazer download
}