import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * useLenis — smooth scroll menggunakan Lenis v1.x.
 *
 * Lenis v1.x pada mode "window" (default) bekerja paling reliable.
 * Kita pakai mode window tapi pastikan scroll container adalah body/html,
 * bukan elemen inner div — sehingga Lenis bisa intercept scroll event global.
 *
 * Layout: TopNavbar fixed + konten di bawah scroll normal (body scroll).
 * Kita pastikan <main> tidak punya height/overflow sendiri agar body yang scroll.
 *
 * @param {boolean} enabled - false = matikan Lenis (halaman peta, tracking)
 */
export function useLenis(enabled = true) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  // Tidak perlu return ref — Lenis v1 mode window tidak butuh ref pada elemen
  return null;
}
