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

function testBW() {
  const p = 4.1, a = 3.25, b = 0.6, s = 1.0;
  const h_sub = 0.508, er_real = 2.94;
  const M_factor = 1.9;
  const er_eff = er_real + (er_real - 1) * (-1 / Math.exp((10 * h_sub / p) * M_factor));
  
  const lamb_res = 30 / 28.0;
  const pCm = p / 10;
  const gf1_cm = (p - a) / 10;
  const gf2_cm = (p - b) / 10;
  const gf3_cm = (p - s) / 10;

  const FL_res = FF(pCm, b / 10, lamb_res, 0);
  const FC_gf1_res = FF(pCm, gf1_cm, lamb_res, 0);
  const FC_gf2_res = FF(pCm, gf2_cm, lamb_res, 0);
  const FC_gf3_res = FF(pCm, gf3_cm, lamb_res, 0);

  const XLf_base = ((1.5 * a) / p) * FL_res;
  const BCgf_res = ((4 * b) / (1.5 * p)) * FC_gf1_res;
  const BCa1f_res = ((4 * (p - b)) / (1.5 * p)) * FC_gf2_res;
  const BCa2f_res = ((4 * (p - s)) / p) * FC_gf3_res;

  const BC1f_res = (BCa1f_res + BCgf_res) * er_eff;
  const BC2f_res = 0.25 * (BCa2f_res + BCgf_res) * er_eff;

  const KL_AUTO = (1 / BC1f_res + 1 / BC2f_res) / XLf_base;
  console.log("KL_AUTO =", KL_AUTO);

  let f_low = null, f_high = null;
  
  for (let freq = 20.0; freq <= 35.0; freq += 0.05) {
    const lamb = 30 / freq;
    const FL = FF(pCm, b / 10, lamb, 0);
    const FC_gf1 = FF(pCm, gf1_cm, lamb, 0);
    const FC_gf2 = FF(pCm, gf2_cm, lamb, 0);
    const FC_gf3 = FF(pCm, gf3_cm, lamb, 0);

    const XLf = ((1.5 * a) / p) * FL;
    
    // Applying KL_AUTO to Capacitance instead of Inductance!
    const BCgf = KL_AUTO * ((4 * b) / (1.5 * p)) * FC_gf1;
    const BCa1f = KL_AUTO * ((4 * (p - b)) / (1.5 * p)) * FC_gf2;
    const BCa2f = KL_AUTO * ((4 * (p - s)) / p) * FC_gf3;

    const BC1f = (BCa1f + BCgf) * er_eff;
    const BC2f = 0.25 * (BCa2f + BCgf) * er_eff;

    let Zf = XLf - 1 / BC1f - 1 / BC2f;
    const B_norm = 1 / Zf;
    const pt_dB = calcS21(B_norm);

    if (pt_dB <= -10) {
      if (f_low === null) f_low = freq;
      f_high = freq;
    }
  }
  console.log(`Bandwidth = ${(f_high - f_low).toFixed(2)} GHz`);
}

testBW();
