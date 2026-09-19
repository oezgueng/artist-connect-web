/**
 * Der Globus im Kopfbereich.
 *
 * Kein Deko-Objekt: die App ist eine Live-Karte, also zeigt die Startseite
 * genau das — eine Kugel aus Punkten, ein paar davon grün und pulsierend
 * ("gerade online"), dazwischen Verbindungsbögen. Alles in denselben Farben
 * wie die App.
 *
 * Läuft nur, wenn WebGL da ist und die Person keine reduzierte Bewegung
 * eingestellt hat; sonst bleibt der statische Verlauf im CSS stehen.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Line,
  LineBasicMaterial, PerspectiveCamera, Points, PointsMaterial,
  QuadraticBezierCurve3, Scene, Vector3, WebGLRenderer,
} from './vendor/three.module.min.js';

const DOT_COUNT = 5200;
const LIVE_COUNT = 64;
const ARC_COUNT = 14;
const RADIUS = 1;

const COLOR_DOT = new Color('#2f2f2f');
const COLOR_LIVE = new Color('#1dd75b');

/** Gleichmäßige Punkteverteilung auf der Kugel (Fibonacci-Spirale). */
function spherePoints(count, radius) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push(new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius));
  }
  return pts;
}

function buildDots(points) {
  const pos = new Float32Array(points.length * 3);
  points.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  return new Points(geo, new PointsMaterial({
    color: COLOR_DOT, size: 0.0085, sizeAttenuation: true, transparent: true, opacity: 0.9,
  }));
}

function buildLive(points) {
  const pos = new Float32Array(points.length * 3);
  points.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  return new Points(geo, new PointsMaterial({
    color: COLOR_LIVE, size: 0.03, sizeAttenuation: true,
    transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false,
  }));
}

/** Ein Bogen zwischen zwei Punkten, nach außen gewölbt wie eine Flugroute. */
function buildArc(a, b) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const lift = 1 + a.distanceTo(b) * 0.35;
  mid.setLength(RADIUS * lift);
  const curve = new QuadraticBezierCurve3(a, mid, b);
  const geo = new BufferGeometry().setFromPoints(curve.getPoints(48));
  return new Line(geo, new LineBasicMaterial({
    color: COLOR_LIVE, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false,
  }));
}

export function mountGlobe(canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null; // kein WebGL — der CSS-Verlauf bleibt stehen
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.35, 3.15);
  camera.lookAt(0, 0, 0);

  const world = new Group();
  world.rotation.z = -0.38; // leichte Achsneigung, wie ein Globus
  scene.add(world);

  const all = spherePoints(DOT_COUNT, RADIUS);
  world.add(buildDots(all));

  // "Online"-Punkte bevorzugt auf der Nordhalbkugel, dort liegt Europa.
  const live = [];
  for (let i = 0; i < LIVE_COUNT; i++) {
    const idx = Math.floor(Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1 * all.length);
    const p = all[idx];
    if (p) live.push(p.clone().multiplyScalar(1.012));
  }
  world.add(buildLive(live));

  const arcs = [];
  for (let i = 0; i < ARC_COUNT && live.length > 1; i++) {
    const a = live[(i * 7) % live.length];
    const b = live[(i * 13 + 5) % live.length];
    if (a.distanceTo(b) < 0.4) continue;
    const arc = buildArc(a, b);
    arc.userData.phase = i * 0.7;
    arcs.push(arc);
    world.add(arc);
  }

  const livePoints = world.children[1];

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Zeiger bewegt den Globus leicht mit — nur ein Hauch, kein Spielzeug.
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      targetX = (e.clientY / window.innerHeight - 0.5) * 0.22;
      targetY = (e.clientX / window.innerWidth - 0.5) * 0.3;
    }, { passive: true });
  }

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; },
    { threshold: 0 }).observe(canvas);

  let raf = 0, t0 = performance.now(), opacity = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const t = (now - t0) / 1000;

    if (opacity < 1) { opacity = Math.min(1, opacity + 0.02); canvas.style.opacity = String(opacity); }

    world.rotation.y += reduced ? 0 : 0.0016;
    curX += (targetX - curX) * 0.05;
    curY += (targetY - curY) * 0.05;
    world.rotation.x = curX;
    camera.position.x = curY * 0.8;
    camera.lookAt(0, 0, 0);

    // Die Online-Punkte atmen, die Bögen leuchten versetzt auf.
    livePoints.material.opacity = 0.7 + Math.sin(t * 1.6) * 0.25;
    arcs.forEach((a) => { a.material.opacity = 0.1 + (Math.sin(t * 0.9 + a.userData.phase) * 0.5 + 0.5) * 0.28; });

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return () => { cancelAnimationFrame(raf); renderer.dispose(); };
}
