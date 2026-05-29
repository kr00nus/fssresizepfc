// ==========================================
// FUNÇÕES MATEMÁTICAS COMPARTILHADAS
// FSS Simulator - Simulador de Superfícies Seletivas de Frequência
// ==========================================
// Este arquivo contém funções matemáticas essenciais usadas por todos os simuladores.
// As funções aqui implementam fórmulas de eletromagnetismo para calcular como as ondas de rádio
// interagem com as estruturas (FSS - Frequency Selective Surface = Superfície Seletiva de Frequência)
//
// É um arquivo de "utilitários" matemáticos compartilhado por:
// - ui_cruzjeru.js (Cruz de Jerusalém)
// - ui_espira.js (Espira Quadrada)
// - ui_quadrado.js (Patch Quadrado)

// ==========================================
// FUNÇÃO: mmToCm()
// Converte distâncias de milímetros para centímetros
// Útil porque as fórmulas de eletromagnetismo usam centímetros
// Parâmetro: value = valor em milímetros (mm)
// Retorno: valor em centímetros (cm) - divide por 10
// Exemplo: mmToCm(100) retorna 10
// ==========================================
export function mmToCm(value) {
  // Divide por 10 porque 1 cm = 10 mm
  return value / 10;
}

// ==========================================
// FUNÇÃO: csc()
// Calcula a COSSECANTE de um ângulo (função trigonométrica)
// Cossecante é o inverso/recíproco do seno: csc(x) = 1/sen(x)
// Útil em fórmulas de propagação de ondas eletromagnéticas
// Parâmetro: x = ângulo em radianos (não em graus!)
// Retorno: cossecante do ângulo
// ==========================================
export function csc(x) {
  // Calcula 1 dividido pelo seno de x
  return 1 / Math.sin(x);
}

// ==========================================
// FUNÇÃO: GG()
// Função de atenuação normalizada
// Nome alemão: "normalisierte Abschwächungsfunktion"
// Faz parte da fórmula de transmissão/reflexão para FSS feitas com fitas metálicas
//
// Parâmetros:
//   p: período da célula (cm) - tamanho da unidade que se repete
//   w: largura da fita metálica (cm)
//   lamb: comprimento de onda (cm) - distância entre picos de onda
//   ang: ângulo de incidência da onda (radianos, onde 0 = perpendicular/normal)
//
// Esta função implementa fórmulas baseadas em TEORIA ELETROMAGNÉTICA de FSS
// Leva em consideração:
//   - Acoplamento entre elementos (como um elemento interfere no outro)
//   - Propagação de modo (como a onda viaja)
//   - Efeitos de reflexão e transmissão
// ==========================================
export function GG(p, w, lamb, ang) {
  const b = Math.sin((Math.PI * w) / (2 * p));
  const term1 = (2 * p * Math.sin(ang)) / lamb;
  const term2 = Math.pow((p * Math.cos(ang)) / lamb, 2);
  const valP = 1 + term1 - term2;
  const valN = 1 - term1 - term2;

  // Calcula coeficientes de modo para propagação perpendicular
  const Cp = valP > 0 ? 1 / Math.sqrt(valP) - 1 : 0;
  const Cn = valN > 0 ? 1 / Math.sqrt(valN) - 1 : 0;

  // Cálculos auxiliares para simplificar fórmula
  const b2 = b * b;
  const b4 = b2 * b2;
  const b6 = b2 * b4;

  // Numerador e denominador da fórmula final
  const num =
    0.5 * Math.pow(1 - b2, 2) * ((1 - b2 / 4) * (Cp + Cn) + 4 * b2 * Cp * Cn);
  const den =
    1 - b2 / 4 + b2 * (1 + b2 / 2 - b4 / 8) * (Cp + Cn) + 2 * b6 * Cp * Cn;

  return num / den;
}

// ==========================================
// FUNÇÃO: FF()
// Função de transmissão ressonante (FSS Filter Function)
// Calcula a REATÂNCIA normalizada da fita/elemento FSS
// A reatância descreve como a estrutura se comporta em diferentes frequências
//
// Parâmetros:
//   p: período da célula (cm) - tamanho da unidade que se repete
//   w: largura efetiva da fita (cm) - espessura da estrutura metálica
//   lamb: comprimento de onda (cm) - distância entre picos de onda em uma frequência
//   ang: ângulo de incidência (radianos, 0 = perpendicular/normal)
//
// Retorno: Impedancia normalizada (sem unidades, apenas um número)
//
// Fórmula usada: FF = (p*cos(ang)/lamb) * [ln(csc(π*w/2p)) + GG(p,w,lamb,ang)]
// É baseada em teoria de LINHA DE TRANSMISSÃO COM ACOPLAMENTO
// É uma das fórmulas clássicas para calcular FSS com estruturas planas
// ==========================================
export function FF(p, w, lamb, ang) {
  // Calcula o termo logarímico (ln = logaritmo natural)
  // A cossecante está normalizada pelos parâmetros da geometria
  const logTerm = Math.log(csc((Math.PI * w) / (2 * p)));

  // Calcula o termo principal da fórmula
  // (p*cos(ang)/lamb) é a normalização pela frequência
  // (logTerm + GG(...)) é a soma do termo logarímico com a função GG
  return ((p * Math.cos(ang)) / lamb) * (logTerm + GG(p, w, lamb, ang));
}

// ==========================================
// FUNÇÃO: calcS21()
// Calcula o parâmetro S21 (Coeficiente de Transmissão em dB)
// S21 mede quanto de sinal consegue passar ("transmissão")
// Em dB (decibel) é uma escala logarítmica
//
// Parâmetro:
//   B_total = Susceptância normalizada total
//             Descreve quantitativamente como a FSS reage à onda
//
// Retorno: S21 em dB (valores entre -60 e 0 dB tipicamente)
//   0 dB = 100% de transmissão (sinal passa completamente)
//  -3 dB = 50% de transmissão (metade do sinal passa)
// -60 dB = praticamente 0% de transmissão (sinal bloqueado)
// ==========================================
export function calcS21(B_total) {
  // Calcula a potência transmitida (Pt) como fração da potência incidente
  // Fórmula: Pt = 4 / (4 + B_total^2)
  // Isso assume uma estrutura sem perdas (condutor perfeito, sem resistência)
  // O sinal da susceptância não importa porque é elevado ao quadrado (B^2)
  const pt = 4 / (4 + Math.pow(B_total, 2));

  // Converte da escala linear para decibéis (escala logarítmica)
  // Fórmula: S21_dB = 10 * log10(Pt)
  // Multiplica por 10 porque esse é o padrão para potência em dB
  return 10 * Math.log10(pt);
}
