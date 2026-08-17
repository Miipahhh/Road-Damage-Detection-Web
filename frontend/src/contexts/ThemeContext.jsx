import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';

export const ThemeContext = createContext(null);

/* ─── Hook ───────────────────────────────────────────────────────────── */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/* ─── CSS yang di-inject sementara selama transisi tema ──────────────── */
const TRANSITION_CSS_ID = 'theme-swap-transition';
const TRANSITION_CSS = `
  /* Selama transisi tema: semua elemen yg punya bg/warna langsung (Tailwind)
     akan smooth transition, bukan snap instan                             */
  html[data-theme-transitioning] *:not(img):not(video):not(canvas):not(iframe) {
    transition:
      background-color 0.25s ease,
      border-color     0.25s ease,
      color            0.2s  ease,
      box-shadow       0.25s ease,
      fill             0.2s  ease !important;
  }
`;

function injectTransitionCSS() {
  if (document.getElementById(TRANSITION_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = TRANSITION_CSS_ID;
  s.textContent = TRANSITION_CSS;
  document.head.appendChild(s);
}

function removeTransitionCSS() {
  document.getElementById(TRANSITION_CSS_ID)?.remove();
}

/* ─── Provider ────────────────────────────────────────────────────────── */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('rdd-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  });

  const isAnimating = useRef(false);

  const toggleTheme = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const next = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('rdd-theme', next);

    // ── Buat overlay penutup ──────────────────────────────────────────
    const bg = next === 'light' ? '#f8fafc' : '#0a0f1e';
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      top: '0', left: '0', right: '0', bottom: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
      background: bg,
      opacity: '0',
    });
    document.body.appendChild(el);

    // ── Fase 1: Fade-in overlay (220ms) ──────────────────────────────
    el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 220, easing: 'ease-in', fill: 'forwards' }
    ).finished.then(() => {

      // ── Fase 2: Update tema — SYNCHRONOUS via flushSync ──────────────
      // flushSync memaksa React commit semua render SEBELUM lanjut,
      // sehingga saat overlay fade-out, SEMUA elemen sudah dalam state baru.
      flushSync(() => {
        document.documentElement.setAttribute('data-theme', next);
        setTheme(next);
      });

      // ── Fase 3: Inject CSS transisi sementara ─────────────────────────
      // Ini membuat elemen yang pakai class Tailwind langsung (bukan CSS var)
      // ikut smooth transition saat overlay perlahan hilang.
      document.documentElement.setAttribute('data-theme-transitioning', '');
      injectTransitionCSS();

      // ── Fase 4: Fade-out overlay (420ms) ─────────────────────────────
      return el.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
      ).finished;

    }).then(() => {
      // ── Bersihkan ─────────────────────────────────────────────────────
      el.remove();
      // Hapus CSS transisi sementara agar tidak mengganggu animasi lain
      setTimeout(() => {
        document.documentElement.removeAttribute('data-theme-transitioning');
        removeTransitionCSS();
      }, 50);
      isAnimating.current = false;

    }).catch(() => {
      // Fallback jika ada error di tengah jalan
      el.remove();
      document.documentElement.removeAttribute('data-theme-transitioning');
      removeTransitionCSS();
      document.documentElement.setAttribute('data-theme', next);
      setTheme(next);
      isAnimating.current = false;
    });
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
