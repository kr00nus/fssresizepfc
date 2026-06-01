// ==========================================
// GERENCIADOR CENTRALIZADO DE SELETORES DE SUBSTRATO
// Reutilizável em todas as topologias
// ==========================================

/**
 * Definições de substratos com suas especificações
 */
const SUBSTRATE_PRESETS = {
  RO3003: { er: "3.00", h: "1.52" },
  RO3006: { er: "6.50", h: "1.28" },
  FR4: { er: "4.40", h: "1.60" },
  RT5880: { er: "2.20", h: "0.254" },
  RO4350B: { er: "3.66", h: "0.762" },
  RF35: { er: "3.50", h: "0.762" },
  TMM4: { er: "4.50", h: "0.381" },
  TMM10: { er: "9.20", h: "0.508" },
  CER10: { er: "10.00", h: "0.635" },
  AR1000: { er: "10.00", h: "0.762" },
};

/**
 * Inicializa o seletor de substrato
 * @param {Function} onChangeCallback - Callback chamada quando substrato muda
 */
export function initSubstrateSelector(onChangeCallback) {
  const subSelect = document.getElementById("substrate_select");
  if (!subSelect) return;

  subSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    const isPreset = Object.keys(SUBSTRATE_PRESETS).includes(val);

    const erNum = document.getElementById("er_num");
    const erSlider = document.getElementById("er_slider");
    const hNum = document.getElementById("h_sub_num");
    const hSlider = document.getElementById("h_sub_slider");

    // Se for manual, desbloqueia os campos
    if (!isPreset) {
      [erNum, erSlider, hNum, hSlider].forEach((el) => {
        if (el) el.disabled = false;
      });
    } else {
      // Se for um preset, bloqueia os inputs
      [erNum, erSlider, hNum, hSlider].forEach((el) => {
        if (el) el.disabled = true;
      });

      const preset = SUBSTRATE_PRESETS[val];
      if (preset) {
        if (erNum) erNum.value = preset.er;
        if (erSlider) erSlider.value = preset.er;
        if (hNum) hNum.value = preset.h;
        if (hSlider) hSlider.value = preset.h;
      }
    }

    // Executa callback (updateAll, recalcular, etc)
    if (onChangeCallback) onChangeCallback();
  });
}

/**
 * Retorna definição de um substrato
 * @param {string} substrateId - ID do substrato
 * @returns {Object} { er, h }
 */
export function getSubstrate(substrateId) {
  return SUBSTRATE_PRESETS[substrateId] || null;
}

/**
 * Lista todos os substratos disponíveis
 * @returns {Array} Array de IDs
 */
export function getAvailableSubstrates() {
  return Object.keys(SUBSTRATE_PRESETS);
}

/**
 * Valida se um substrato é válido
 * @param {string} substrateId
 * @returns {boolean}
 */
export function isValidSubstrate(substrateId) {
  return (
    substrateId === "manual" ||
    Object.keys(SUBSTRATE_PRESETS).includes(substrateId)
  );
}
