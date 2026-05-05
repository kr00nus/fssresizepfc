// Shared mathematical utilities for FSS simulator
export function mmToCm(value) {
  return value / 10;
}

export function csc(x) {
  return 1 / Math.sin(x);
}

export function GG(p, w, lamb, ang) {
  const b = Math.sin((Math.PI * w) / (2 * p));
  const term1 = (2 * p * Math.sin(ang)) / lamb;
  const term2 = Math.pow((p * Math.cos(ang)) / lamb, 2);
  const valP = 1 + term1 - term2;
  const valN = 1 - term1 - term2;
  const Cp = valP > 0 ? 1 / Math.sqrt(valP) - 1 : 0;
  const Cn = valN > 0 ? 1 / Math.sqrt(valN) - 1 : 0;
  const b2 = b * b;
  const b4 = b2 * b2;
  const b6 = b2 * b4;
  const num =
    0.5 * Math.pow(1 - b2, 2) * ((1 - b2 / 4) * (Cp + Cn) + 4 * b2 * Cp * Cn);
  const den =
    1 - b2 / 4 + b2 * (1 + b2 / 2 - b4 / 8) * (Cp + Cn) + 2 * b6 * Cp * Cn;
  return num / den;
}

export function FF(p, w, lamb, ang) {
  const logTerm = Math.log(csc((Math.PI * w) / (2 * p)));
  return ((p * Math.cos(ang)) / lamb) * (logTerm + GG(p, w, lamb, ang));
}
