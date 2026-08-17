const STORAGE_KEY = "rdds_settings";

const FONT_SIZE_MAP = { kecil: "13px", normal: "15px", besar: "17px" };

export const loadSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

export const saveSettings = (s) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
};

export const applyFontSize = (fontSize) => {
  document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize] || FONT_SIZE_MAP.normal;
};
