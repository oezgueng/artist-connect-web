/**
 * Die Live-Karte der Startseite.
 *
 * Sie zeigt echte Zahlen und trotzdem niemanden.
 *
 * Gelesen wird `geoAggregates/city/cells` — eine Sammlung, die der Server
 * stündlich neu schreibt und die pro Zelle nur zählt: wie viele Profile, wie
 * viele davon online, wie viele gerade verfügbar, dazu ein Stadtname und der
 * Mittelpunkt der Zelle. Eine Zelle ist ein Geohash mit vier Zeichen, also
 * rund zwanzig Kilometer, und sie entsteht überhaupt erst ab drei Profilen.
 * Es gibt hier also nichts zu deanonymisieren: keine uid, kein Name, keine
 * Position eines Menschen.
 *
 * Genau das ist auch das Versprechen an die Seite: wo etwas los ist, steht
 * hier. Wer da ist, beantwortet nur die App.
 */
const PROJECT = 'musicconnect-e5da6';
// Der öffentliche Web-Schlüssel des Projekts. Er ist kein Geheimnis: er
// benennt nur das Projekt, den Zugriff regeln die Firestore-Regeln, und
// erlaubt ist dort genau eine Sammlung.
const API_KEY = 'AIzaSyAIY8NYVFl-MA3ONZ-hzCBHOMtGECmmf1k';
const ENDPOINT =
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)` +
  `/documents/geoAggregates/city/cells?pageSize=300&key=${API_KEY}`;

/** Firestore-REST verpackt jeden Wert in seinen Typ. Hier wieder auspacken. */
function plain(field) {
  if (!field) return null;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('stringValue' in field) return field.stringValue;
  return null;
}

/** Nur die Stadt, ohne Land: "Berlin, Deutschland" -> "Berlin". */
function cityName(label) {
  if (typeof label !== 'string' || !label.trim()) return null;
  return label.split(',')[0].trim();
}

async function loadCells() {
  const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return (body.documents || [])
    .map((doc) => {
      const f = doc.fields || {};
      return {
        name: cityName(plain(f.label)),
        total: plain(f.total) || 0,
        online: plain(f.online) || 0,
        available: plain(f.available) || 0,
        lat: plain(f.lat),
        lng: plain(f.lng),
      };
    })
    .filter((c) => c.total > 0 && Number.isFinite(c.lat) && Number.isFinite(c.lng));
}

/**
 * Eine Stadt kann über mehrere Zellen liegen — Berlin sind sieben. Für die
 * Liste werden sie zu einer Stadt addiert; für den Globus bleiben es einzelne
 * Punkte, sonst sähe eine Großstadt aus wie ein Dorf.
 */
function byCity(cells) {
  const map = new Map();
  for (const c of cells) {
    if (!c.name) continue;
    const e = map.get(c.name) || { name: c.name, total: 0, online: 0, available: 0, latSum: 0, lngSum: 0 };
    e.total += c.total;
    e.online += c.online;
    e.available += c.available;
    // Gewichteter Schwerpunkt: der Punkt soll dort sitzen, wo die meisten sind.
    e.latSum += c.lat * c.total;
    e.lngSum += c.lng * c.total;
    map.set(c.name, e);
  }
  return [...map.values()]
    .map((e) => ({ ...e, lat: e.latSum / e.total, lng: e.lngSum / e.total }))
    .sort((a, b) => b.online - a.online || b.total - a.total);
}

function render(root, cells) {
  const cities = byCity(cells);
  const totals = cells.reduce(
    (acc, c) => ({ total: acc.total + c.total, online: acc.online + c.online, available: acc.available + c.available }),
    { total: 0, online: 0, available: 0 },
  );

  root.querySelector('[data-live="total"]').textContent = String(totals.total);
  root.querySelector('[data-live="cities"]').textContent = String(cities.length);
  root.querySelector('[data-live="online"]').textContent = String(totals.online);

  const list = root.querySelector('[data-live="list"]');
  list.innerHTML = '';
  for (const c of cities.slice(0, 6)) {
    const row = document.createElement('li');
    row.className = 'city';
    row.innerHTML =
      `<span class="city-name">${c.name.replace(/[<&]/g, '')}</span>` +
      `<span class="city-num">${c.online > 0 ? `<i class="dot"></i>${c.online} online` : `${c.total} Profile`}</span>`;
    list.appendChild(row);
  }

  root.dataset.state = 'ready';
  return cells;
}

export async function mountLive(root) {
  try {
    const cells = await loadCells();
    if (!cells.length) throw new Error('keine Zellen');
    render(root, cells);
  } catch (error) {
    // Kein Netz, geänderte Regeln, leere Sammlung: die Seite bleibt ganz, der
    // Abschnitt sagt es ehrlich und der Weg in die App bleibt sichtbar.
    root.dataset.state = 'failed';
    console.warn('Live-Karte nicht geladen:', error.message);
  }
}

export default mountLive;
