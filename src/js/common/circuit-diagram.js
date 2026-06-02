// ==========================================
// MÓDULO: circuit-diagram.js
// Desenha os circuitos equivalentes (ECM) das topologias FSS
// usando SVG inline, com valores dinâmicos das reatâncias calculadas
// ==========================================

/**
 * Cria o contêiner do diagrama de circuito se não existir.
 * @param {string} containerId - ID do div contêiner
 * @param {string} title - Título da seção
 * @returns {HTMLElement} O elemento contêiner
 */
function getOrCreateContainer(containerId, title) {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.cssText =
      "margin-top: 18px; padding: 18px 20px; background: linear-gradient(135deg, #fafbfe 0%, #f0f4fa 100%); border-radius: 8px; border-left: 5px solid #6a1b9a; font-family: 'Segoe UI', Tahoma, sans-serif;";

    // Insere logo após o reactancePanel
    const reactPanel = document.getElementById("reactancePanel");
    if (reactPanel) {
      reactPanel.after(container);
    } else {
      // Fallback: insere após chart-container
      const chartContainer = document.querySelector(".chart-container");
      if (chartContainer) chartContainer.parentElement.appendChild(container);
    }
  }
  return container;
}

// ==========================================
// HELPER: Desenha componentes SVG reutilizáveis
// ==========================================

/** Linha simples */
function svgLine(x1, y1, x2, y2, color = "#333", width = 2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

/** Indutor (espiral) */
function svgInductor(x, y, w, label, value, color = "#1976d2") {
  const h = 14;
  const loops = 4;
  const loopW = w / loops;
  let path = `M ${x} ${y}`;
  for (let i = 0; i < loops; i++) {
    const lx = x + i * loopW;
    path += ` C ${lx + loopW * 0.2} ${y - h}, ${lx + loopW * 0.8} ${y - h}, ${lx + loopW} ${y}`;
  }
  return `
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
    <text x="${x + w / 2}" y="${y - h - 6}" text-anchor="middle" font-size="11" font-weight="bold" fill="${color}" font-family="'Segoe UI', sans-serif">${label}</text>
    <text x="${x + w / 2}" y="${y + 16}" text-anchor="middle" font-size="10" fill="#555" font-family="'Segoe UI', sans-serif">${value}</text>
  `;
}

/** Capacitor (duas placas paralelas) */
function svgCapacitor(x, y, label, value, color = "#c62828") {
  const gap = 6;
  const plateH = 18;
  return `
    <line x1="${x}" y1="${y - plateH / 2}" x2="${x}" y2="${y + plateH / 2}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="${x + gap}" y1="${y - plateH / 2}" x2="${x + gap}" y2="${y + plateH / 2}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
    <text x="${x + gap / 2}" y="${y - plateH / 2 - 7}" text-anchor="middle" font-size="11" font-weight="bold" fill="${color}" font-family="'Segoe UI', sans-serif">${label}</text>
    <text x="${x + gap / 2}" y="${y + plateH / 2 + 14}" text-anchor="middle" font-size="10" fill="#555" font-family="'Segoe UI', sans-serif">${value}</text>
  `;
}

/** Nó (ponto de junção) */
function svgNode(x, y, color = "#333") {
  return `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
}

/** Terminal com label (Port) */
function svgTerminal(x, y, label, side = "left") {
  const textAnchor = side === "left" ? "end" : "start";
  const tx = side === "left" ? x - 10 : x + 10;
  return `
    <circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#333" stroke-width="2"/>
    <text x="${tx}" y="${y + 4}" text-anchor="${textAnchor}" font-size="12" font-weight="bold" fill="#333" font-family="'Segoe UI', sans-serif">${label}</text>
  `;
}

/** Rótulo de impedância normalizada */
function svgImpedanceLabel(x, y, label, value, color = "#6a1b9a") {
  return `
    <text x="${x}" y="${y}" text-anchor="middle" font-size="11" font-weight="bold" fill="${color}" font-family="'Segoe UI', sans-serif">${label} = ${value}</text>
  `;
}

// ==========================================
// 1. ESPIRA QUADRADA - Circuito LC Série simples
// Topologia: Port --- L --- C --- Port (com ground)
// ==========================================
export function drawCircuitEspira(values) {
  const containerId = "circuitDiagramEspira";
  const container = getOrCreateContainer(containerId, "Circuito Equivalente (ECM)");

  const XL = values.XL || "—";
  const BC = values.BC || "—";
  const Xtotal = values.Xtotal || "—";
  const Bnorm = values.Bnorm || "—";

  const W = 500, H = 160;
  const cy = 65; // linha central

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;">`;

  // Fundo
  svg += `<rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="white" stroke="#e0e0e0" stroke-width="1"/>`;

  // Título
  svg += `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a2a3a" font-family="'Segoe UI', sans-serif">Circuito Equivalente — Espira Quadrada (LC Série)</text>`;

  // Terminais
  svg += svgTerminal(40, cy, "Port 1", "left");
  svg += svgTerminal(W - 40, cy, "Port 2", "right");

  // Linha de entrada → Indutor
  svg += svgLine(44, cy, 120, cy);

  // Indutor XL
  svg += svgInductor(120, cy, 100, "X_L", XL, "#1976d2");

  // Linha Indutor → Capacitor
  svg += svgLine(220, cy, 290, cy);

  // Nó
  svg += svgNode(290, cy);

  // Capacitor BC (vertical, shunt para ground)
  svg += svgLine(290, cy, 290, cy + 5);
  svg += svgCapacitor(287, cy + 28, "B_C", BC, "#c62828");
  svg += svgLine(290, cy + 51, 290, cy + 62);

  // Ground no capacitor
  svg += svgLine(278, cy + 62, 302, cy + 62, "#333", 2);
  svg += svgLine(282, cy + 66, 298, cy + 66, "#333", 1.5);
  svg += svgLine(286, cy + 70, 294, cy + 70, "#333", 1);

  // Linha saída
  svg += svgLine(290, cy, W - 44, cy);

  // Label inferior
  svg += svgImpedanceLabel(W / 2, H - 10, "B_norm", Bnorm, "#6a1b9a");

  svg += `</svg>`;

  container.innerHTML = `
    <h4 style="margin:0 0 10px 0;color:#1a2a3a;font-size:14px;">⚡ Circuito Equivalente (ECM) — Espira Quadrada</h4>
    <p style="margin:0 0 10px 0;font-size:12px;color:#666;line-height:1.5;">
      Topologia <strong>LC Série</strong>: A indutância X<sub>L</sub> é gerada pelas trilhas condutoras paralelas ao campo E. 
      A capacitância B<sub>C</sub> surge do gap intercelular (g), atuando como placas paralelas de um capacitor.
      Na ressonância, X<sub>L</sub> = 1/B<sub>C</sub>.
    </p>
    ${svg}
  `;
}

// ==========================================
// 2. CRUZ DE JERUSALÉM - LC Série com dupla contribuição capacitiva
// Topologia: Dois ramos paralelos, cada um com L e C em série
// ==========================================
export function drawCircuitCruzJeru(values) {
  const containerId = "circuitDiagramCruz";
  const container = getOrCreateContainer(containerId, "Circuito Equivalente (ECM)");

  const XL1 = values.XL1 || "—";
  const BC1 = values.BC1 || "—";
  const XL2 = values.XL2 || "—";
  const BC2 = values.BC2 || "—";
  const Btotal = values.Btotal || "—";

  const W = 540, H = 250;
  const yTop = 70;    // ramo superior
  const yBot = 170;   // ramo inferior
  const xLeft = 80;
  const xRight = W - 80;
  const xMid = W / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;">`;

  // Fundo
  svg += `<rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="white" stroke="#e0e0e0" stroke-width="1"/>`;

  // Título
  svg += `<text x="${xMid}" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a2a3a" font-family="'Segoe UI', sans-serif">Circuito Equivalente — Cruz de Jerusalém (Dois Ramos Paralelos)</text>`;

  // Terminais no meio verticalmente
  const yMid = (yTop + yBot) / 2;
  svg += svgTerminal(30, yMid, "Port 1", "left");
  svg += svgTerminal(W - 30, yMid, "Port 2", "right");

  // Linhas do terminal para os nós de bifurcação
  svg += svgLine(34, yMid, xLeft, yMid);
  svg += svgNode(xLeft, yMid);

  svg += svgLine(xRight, yMid, W - 34, yMid);
  svg += svgNode(xRight, yMid);

  // Bifurcação esquerda para cima e para baixo
  svg += svgLine(xLeft, yMid, xLeft, yTop);
  svg += svgLine(xLeft, yMid, xLeft, yBot);

  // Bifurcação direita para cima e para baixo
  svg += svgLine(xRight, yMid, xRight, yTop);
  svg += svgLine(xRight, yMid, xRight, yBot);

  // ===== RAMO SUPERIOR (Ramo 1: XL1 + BC1) =====
  // Label do ramo
  svg += `<text x="${xMid}" y="${yTop - 30}" text-anchor="middle" font-size="10" font-style="italic" fill="#666" font-family="'Segoe UI', sans-serif">Ramo 1 (Dipolo Central)</text>`;

  // Indutor XL1
  svg += svgLine(xLeft, yTop, 140, yTop);
  svg += svgInductor(140, yTop, 90, "X_L1", XL1, "#1976d2");

  // Linha → Capacitor
  svg += svgLine(230, yTop, 310, yTop);

  // Capacitor BC1 (horizontal inline — usando rotação visual)
  svg += svgCapacitor(310, yTop, "B_C1", BC1, "#c62828");
  svg += svgLine(316, yTop, xRight, yTop);

  // ===== RAMO INFERIOR (Ramo 2: XL2 + BC2 — chapéu) =====
  svg += `<text x="${xMid}" y="${yBot + 38}" text-anchor="middle" font-size="10" font-style="italic" fill="#666" font-family="'Segoe UI', sans-serif">Ramo 2 (Chapéu / Cap End-Loading)</text>`;

  // Indutor XL2
  svg += svgLine(xLeft, yBot, 140, yBot);
  svg += svgInductor(140, yBot, 90, "X_L2", XL2, "#0d47a1");

  // Linha → Capacitor
  svg += svgLine(230, yBot, 310, yBot);

  // Capacitor BC2
  svg += svgCapacitor(310, yBot, "B_C2", BC2, "#b71c1c");
  svg += svgLine(316, yBot, xRight, yBot);

  // Label inferior (B total)
  svg += svgImpedanceLabel(xMid, H - 8, "B_total", Btotal, "#6a1b9a");

  svg += `</svg>`;

  container.innerHTML = `
    <h4 style="margin:0 0 10px 0;color:#1a2a3a;font-size:14px;">⚡ Circuito Equivalente (ECM) — Cruz de Jerusalém</h4>
    <p style="margin:0 0 10px 0;font-size:12px;color:#666;line-height:1.5;">
      Topologia <strong>Dois Ramos LC Paralelos</strong>: O Ramo 1 modela o dipolo central (X<sub>L1</sub>, B<sub>C1</sub>). 
      O Ramo 2 modela os chapéus (end-loading caps), que aumentam massivamente a capacitância e empurram a ressonância 
      para frequências mais baixas sem aumentar o tamanho físico da célula.
    </p>
    ${svg}
  `;
}

// ==========================================
// 3. ESTRELA DE 4 PONTAS - Circuito Misto (Série + Paralelo)
// Topologia: Port --- [L em série com C1] em paralelo com C2 --- Port
// ==========================================
export function drawCircuitEstrela(values) {
  const containerId = "circuitDiagramEstrela";
  const container = getOrCreateContainer(containerId, "Circuito Equivalente (ECM)");

  const XL = values.XL || "—";
  const BC1 = values.BC1 || "—";
  const BC2 = values.BC2 || "—";
  const Zf = values.Zf || "—";
  const Yf = values.Yf || "—";

  const W = 540, H = 220;
  const cy = 90;  // linha central principal
  const yShunt = 165; // posição do capacitor shunt
  const xLeft = 80;
  const xRight = W - 80;
  const xMid = W / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;">`;

  // Fundo
  svg += `<rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="white" stroke="#e0e0e0" stroke-width="1"/>`;

  // Título
  svg += `<text x="${xMid}" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a2a3a" font-family="'Segoe UI', sans-serif">Circuito Equivalente — Estrela de 4 Pontas (Série + Paralelo)</text>`;

  // Terminais
  svg += svgTerminal(30, cy, "Port 1", "left");
  svg += svgTerminal(W - 30, cy, "Port 2", "right");

  // Linha entrada → Indutor
  svg += svgLine(34, cy, 110, cy);

  // Indutor XLf (série)
  svg += svgInductor(110, cy, 90, "X_Lf", XL, "#1976d2");

  // Linha Indutor → Nó do ramo de C1
  svg += svgLine(200, cy, 260, cy);

  // Capacitor C1f (série, inline)
  svg += svgCapacitor(260, cy, "B_C1f", BC1, "#c62828");

  // Linha C1 → Nó de junção
  svg += svgLine(266, cy, 340, cy);

  // Nó de junção (onde C2 sai em paralelo)
  svg += svgNode(340, cy);

  // Linha do nó para saída
  svg += svgLine(340, cy, W - 34, cy);

  // ===== Capacitor C2f (paralelo / shunt para ground) =====
  svg += svgLine(340, cy, 340, cy + 10);
  svg += svgCapacitor(337, cy + 33, "B_C2f", BC2, "#e65100");
  svg += svgLine(340, cy + 56, 340, yShunt);

  // Ground no C2
  svg += svgLine(328, yShunt, 352, yShunt, "#333", 2);
  svg += svgLine(332, yShunt + 4, 348, yShunt + 4, "#333", 1.5);
  svg += svgLine(336, yShunt + 8, 344, yShunt + 8, "#333", 1);

  // Etiqueta de chave: Zf (série) e Yf (total)
  svg += `<text x="200" y="${H - 8}" text-anchor="middle" font-size="10" fill="#2e7d32" font-weight="bold" font-family="'Segoe UI', sans-serif">Z_f(série) = ${Zf}</text>`;
  svg += `<text x="400" y="${H - 8}" text-anchor="middle" font-size="10" fill="#6a1b9a" font-weight="bold" font-family="'Segoe UI', sans-serif">Y_f(total) = ${Yf}</text>`;

  svg += `</svg>`;

  container.innerHTML = `
    <h4 style="margin:0 0 10px 0;color:#1a2a3a;font-size:14px;">⚡ Circuito Equivalente (ECM) — Estrela de 4 Pontas</h4>
    <p style="margin:0 0 10px 0;font-size:12px;color:#666;line-height:1.5;">
      Topologia <strong>Mista (Série + Paralelo)</strong>: X<sub>Lf</sub> e B<sub>C1f</sub> formam o ramo LC série 
      (responsável pelo "mergulho" de ressonância). B<sub>C2f</sub> é o capacitor em paralelo que modela o acoplamento 
      mútuo entre estrelas vizinhas, criando uma resposta mais abrupta e seletiva.
    </p>
    ${svg}
  `;
}
