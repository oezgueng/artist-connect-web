/**
 * Scroll-Verhalten der Startseite.
 *
 * Alles hier ist Zugabe: ohne JavaScript steht der Inhalt trotzdem da, und bei
 * "Bewegung reduzieren" wird nichts animiert, sondern nur eingeblendet.
 */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- Einblenden beim Scrollen ------------------------------------------ */
const revealables = document.querySelectorAll('[data-reveal]');
if (reduced || !('IntersectionObserver' in window)) {
  revealables.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      // Geschwister versetzt einblenden, damit ein Raster nicht auf einmal aufpoppt.
      const delay = Number(e.target.dataset.reveal) || 0;
      setTimeout(() => e.target.classList.add('is-in'), delay);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  revealables.forEach((el) => io.observe(el));
}

/* ---- Fortschrittsbalken ------------------------------------------------- */
const bar = document.querySelector('.progress span');
if (bar) {
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---- Zahlen hochzählen -------------------------------------------------- */
document.querySelectorAll('[data-count]').forEach((el) => {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (reduced) { el.textContent = target + suffix; return; }
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const start = performance.now(), dur = 1100;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.6 });
  io.observe(el);
});

/* ---- Live-Karte --------------------------------------------------------- */
const liveRoot = document.querySelector('[data-live-root]');
if (liveRoot) {
  import('./live.js')
    .then((m) => m.mountLive(liveRoot))
    .catch(() => { liveRoot.dataset.state = 'failed'; });
}

/* ---- Globus ------------------------------------------------------------- */
const canvas = document.getElementById('globe');
if (canvas) {
  import('./globe.js')
    .then((m) => m.mountGlobe(canvas))
    .catch(() => { canvas.remove(); }); // kein WebGL: der CSS-Verlauf bleibt
}
