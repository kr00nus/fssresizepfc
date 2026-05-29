function mmToCm(value) { return value / 10; }
function csc(x) { return 1 / Math.sin(x); }
function GG(p, w, lamb, ang) {
  const b = Math.sin((Math.PI * w) / (2 * p));
  const term1 = (2 * p * Math.sin(ang)) / lamb;
  const term2 = Math.pow((p * Math.cos(ang)) / lamb, 2);
  const valP = 1 + term1 - term2;
  const valN = 1 - term1 - term2;
  const Cp = valP > 0 ? 1 / Math.sqrt(valP) - 1 : 0;
  const Cn = valN > 0 ? 1 / Math.sqrt(valN) - 1 : 0;
  const b2 = b * b; const b4 = b2 * b2; const b6 = b2 * b4;
  const num = 0.5 * Math.pow(1 - b2, 2) * ((1 - b2 / 4) * (Cp + Cn) + 4 * b2 * Cp * Cn);
  const den = 1 - b2 / 4 + b2 * (1 + b2 / 2 - b4 / 8) * (Cp + Cn) + 2 * b6 * Cp * Cn;
  return num / den;
}
function FF(p, w, lamb, ang) {
  const logTerm = Math.log(csc((Math.PI * w) / (2 * p)));
  return ((p * Math.cos(ang)) / lamb) * (logTerm + GG(p, w, lamb, ang));
}
function calcS21(B_total) {
  const pt = 4 / (4 + Math.pow(B_total, 2));
  return 10 * Math.log10(pt);
}

function testECM() {
  const fStart = 20.0;
  const fEnd = 40.0;
  const p = 4.1;
  const a = 3.25;
  const b = 0.6;
  const s = 1.0;
  const h_sub = 0.508;
  const er_real = 2.94;

  const M_factor = 1.9;
  const er_eff = er_real + (er_real - 1) * (-1 / Math.exp((10 * h_sub) / (p * M_factor)));
  console.log("er_eff =", er_eff);

  const pCm = mmToCm(p);
  const gf1_cm = mmToCm(p - a);
  const gf2_cm = mmToCm(p - b);
  const gf3_cm = mmToCm(p - s);

  for (let freq = fStart; freq <= fEnd; freq += 1.0) {
    const lamb = 30 / freq;
    const FL = FF(pCm, mmToCm(b), lamb, 0);
    const FC_gf1 = FF(pCm, gf1_cm, lamb, 0);
    const FC_gf2 = FF(pCm, gf2_cm, lamb, 0);
    const FC_gf3 = FF(pCm, gf3_cm, lamb, 0);

    const XLf = ((1.5 * a) / p) * FL;
    const BCgf = ((4 * b) / (1.5 * p)) * FC_gf1;
    const BCa1f = ((4 * (p - b)) / (1.5 * p)) * FC_gf2;
    const BCa2f = ((4 * (p - s)) / p) * FC_gf3;

    const BC1f = (BCa1f + BCgf) * er_eff;
    const BC2f = 0.25 * (BCa2f + BCgf) * er_eff;

    const B1 = Math.max(1e-12, BC1f);
    const B2 = Math.max(1e-12, BC2f);

    let Zf = XLf - 1 / B1 - 1 / B2;
    let Yf = B1 + B2 - 1/XLf;

    console.log(`f=${freq.toFixed(1)} GHz | XL=${XLf.toFixed(3)} | 1/B1=${(1/B1).toFixed(3)} | 1/B2=${(1/B2).toFixed(3)} | Zf=${Zf.toFixed(3)} | Yf=${Yf.toFixed(3)}`);
  }
}

testECM();
