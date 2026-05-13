// ==========================================
// FUNÇÕES MATEMÁTICAS COMPARTILHADAS
// FSS Simulator - Simulador de Superfícies Seletivas de Frequência
// ==========================================
// Contém funções matemáticas essenciais usadas pelos três tipos de geometrias:
// - Espira Quadrada (Spiral)
// - Cruz de Jerusalém (Cross)
// - Patch Quadrado (Square Patch)

// ==========================================
// FUNÇÃO: mmToCm()
// Converte milímetros para centímetros
// Parâmetro: value em mm
// Retorno: value em cm (value / 10)
// ==========================================
export function mmToCm(value) {
  return value / 10;
}

// ==========================================
// FUNÇÃO: csc()
// Calcula cossecante de um ângulo em radianos
// Cossecante é o inverso do seno: csc(x) = 1/sin(x)
// Parâmetro: x em radianos
// Retorno: cossecante(x)
// ==========================================
export function csc(x) {
  return 1 / Math.sin(x);
}

// ==========================================
// FUNÇÃO: GG()
// Função de atenuação normalizada (normalisierte Abschwächungsfunktion)
// Faz parte da fórmula de transmissão/reflexão para FSS com fitas
//
// Parâmetros:
//   p: período da célula (cm)
//   w: largura da fita (cm)
//   lamb: comprimento de onda (cm)
//   ang: ângulo de incidência (radianos, 0 = normal)
//
// Fórmula implementada é baseada em teoria eletromagnética de FSS
// Considera efeito de acoplamento entre elementos e propagação de modo
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
// Calcula a reatância normalizada da fita/elemento FSS
//
// Parâmetros:
//   p: período da célula (cm)
//   w: largura efetiva da fita (cm)
//   lamb: comprimento de onda (cm)
//   ang: ângulo de incidência (radianos, 0 = normal)
//
// Retorno: Impedância normalizada (sem unidades)
//
// Fórmula: FF = (p*cos(ang)/lamb) * [ln(csc(π*w/2p)) + GG(p,w,lamb,ang)]
// Implementa modelo baseado em linha de transmissão com acoplamento
// ==========================================
export function FF(p, w, lamb, ang) {
  const logTerm = Math.log(csc((Math.PI * w) / (2 * p)));
  return ((p * Math.cos(ang)) / lamb) * (logTerm + GG(p, w, lamb, ang));
}

// ==========================================
// FUNÇÃO: calcS21
// Calcula o coeficiente de transmissão S21 (em dB)
// Assumindo modelo de Condutor Ideal (Sem perdas Rs)
// Parâmetro: B_total (Susceptância normalizada total da estrutura)
// ==========================================
export function calcS21(B_total) {
  // A potência transmitida (Pt) para um circuito puramente reativo (sem Rs)
  // O sinal da susceptância não afeta a potência pois é elevado ao quadrado
  const pt = 4 / (4 + Math.pow(B_total, 2));
  return 10 * Math.log10(pt);
}
