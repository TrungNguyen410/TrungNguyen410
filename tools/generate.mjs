// Generate every animated asset of the TrungNguyen410 profile README.
// Usage: node tools/generate.mjs [repo-root]
// All motion is precomputed into SMIL/CSS so it keeps running inside GitHub's <img> sandbox.
// 3D faces are drawn with orthographic projection, so each flat face maps to an affine
// transform that SMIL can animate as translate → rotate → skewX → scale.
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const SANS = "'Segoe UI', Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'Cascadia Code', Consolas, Menlo, monospace";
const TAU = Math.PI * 2;
const C30 = 0.8660254, S30 = 0.5;

const f = (n) => (Math.round(n * 10) / 10).toString();
const f3 = (n) => (Math.round(n * 1000) / 1000).toString();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function svg(w, h, body, style = "", defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">\n` +
    `<style>${style}</style>\n<defs>${defs}</defs>\n${body}\n</svg>\n`;
}

function save(name, content) {
  const p = path.join(OUT, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
  console.log(`${name.padEnd(30)} ${(content.length / 1024).toFixed(1)} KB`);
}

function shade(hex, k) {
  const h = hex.replace("#", "");
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (k >= 1) [r, g, b] = [r, g, b].map((c) => Math.round(c + (255 - c) * (k - 1)));
  else [r, g, b] = [r, g, b].map((c) => Math.round(c * k));
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function extruded(x, y, text, size, front, back, { depth = 6, anchor = "start", family = SANS, weight = 800, extra = "" } = {}) {
  const out = [];
  for (let i = depth; i > 0; i--) {
    out.push(`<text x="${f(x + i * 0.8)}" y="${f(y + i)}" fill="${back}" font-family="${family}" font-size="${size}" ` +
      `font-weight="${weight}" text-anchor="${anchor}" ${extra}>${esc(text)}</text>`);
  }
  out.push(`<text x="${x}" y="${y}" fill="${front}" font-family="${family}" font-size="${size}" ` +
    `font-weight="${weight}" text-anchor="${anchor}" ${extra}>${esc(text)}</text>`);
  return out.join("\n");
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// four-point "Gemini" sparkle
const sparkle = (cx, cy, r) =>
  `M${f(cx)} ${f(cy - r)}C${f(cx + r * 0.12)} ${f(cy - r * 0.12)} ${f(cx + r * 0.12)} ${f(cy - r * 0.12)} ${f(cx + r)} ${f(cy)}` +
  `C${f(cx + r * 0.12)} ${f(cy + r * 0.12)} ${f(cx + r * 0.12)} ${f(cy + r * 0.12)} ${f(cx)} ${f(cy + r)}` +
  `C${f(cx - r * 0.12)} ${f(cy + r * 0.12)} ${f(cx - r * 0.12)} ${f(cy + r * 0.12)} ${f(cx - r)} ${f(cy)}` +
  `C${f(cx - r * 0.12)} ${f(cy - r * 0.12)} ${f(cx - r * 0.12)} ${f(cy - r * 0.12)} ${f(cx)} ${f(cy - r)}Z`;

function starfield(w, h, n, seed) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, d = (r() * 3.2).toFixed(2);
    if (i % 9 === 0) out.push(`<path d="${sparkle(x, y, 3 + r() * 4)}" fill="#c9d4ff" class="tw" style="animation-delay:${d}s"/>`);
    else out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + r() * 1.1)}" fill="#c9d4ff" class="tw" style="animation-delay:${d}s"/>`);
  }
  return out.join("\n");
}

// ------------------------------------------------------------------ palette & shared bits
const GEM = ["#4f8cff", "#9b72f2", "#ff6b9a"]; // Gemini-ish blue → violet → pink
const COMMON_STYLE = `
.tw{animation:tw 3.2s ease-in-out infinite}@keyframes tw{0%,100%{opacity:.12}50%{opacity:.9}}
.led{animation:blink 1.6s steps(2,start) infinite}@keyframes blink{50%{opacity:.2}}
.bob{animation:bob 6s ease-in-out infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
`;
const BG_DEFS = `
<radialGradient id="bg" cx="72%" cy="38%" r="90%"><stop offset="0" stop-color="#1c1846"/><stop offset=".5" stop-color="#0c0d24"/><stop offset="1" stop-color="#05050d"/></radialGradient>
<linearGradient id="gem" x1="0" x2="1"><stop offset="0" stop-color="${GEM[0]}"/><stop offset=".55" stop-color="${GEM[1]}"/><stop offset="1" stop-color="${GEM[2]}"/></linearGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
`;
const frameOpen = (W, H) => [`<g clip-path="url(#frame)">`, `<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
const frameDef = (W, H) => `<clipPath id="frame"><rect width="${W}" height="${H}" rx="26"/></clipPath>`;
const frameClose = (W, H) => `</g><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="25" fill="none" stroke="#2f2f6e" stroke-width="2"/>`;

// ------------------------------------------------------------------ 3D helpers
const rx = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const ry = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const add = (a, b) => a.map((v, i) => v + b[i]);
const mul = (a, k) => a.map((v) => v * k);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// A flat face (origin O, local axes U/V in px, normal N = U×V reversed) animated over frames.
// `pose(p, t)` rotates a 3D point; screen = (cx + x, cy - y). Returns SMIL wrappers for content
// drawn in local coordinates plus per-frame screen polygons and visibility.
function facePlane(O, U, V, N, size, pose, frames, cx, cy) {
  const tr = [], ro = [], sk = [], sc = [], vis = [], polys = [];
  let prevRot = null;
  const P = (p, t) => { const q = pose(p, t); return [cx + q[0], cy - q[1]]; };
  for (let k = 0; k <= frames; k++) {
    const t = k / frames;
    const o = P(O, t), pu = P(add(O, U), t), pv = P(add(O, V), t);
    const a = pu[0] - o[0], b = pu[1] - o[1], c = pv[0] - o[0], d = pv[1] - o[1];
    let th = Math.atan2(b, a) * 180 / Math.PI;
    if (prevRot !== null) while (th - prevRot > 180) th -= 360;
    if (prevRot !== null) while (th - prevRot < -180) th += 360;
    prevRot = th;
    const sx = Math.hypot(a, b), m = (a * c + b * d) / sx, n = (a * d - b * c) / sx;
    const phi = Math.abs(n) < 1e-4 ? 0 : clamp(Math.atan(m / n) * 180 / Math.PI, -80, 80);
    tr.push(`${f(o[0])},${f(o[1])}`); ro.push(f3(th)); sk.push(f3(phi)); sc.push(`${f3(sx)},${f3(Math.max(n, 0.001))}`);
    const nz = pose(N, t)[2] - pose([0, 0, 0], t)[2];
    vis.push(clamp(nz * 5, 0, 1).toFixed(2));
    const [w, h] = size;
    polys.push([O, add(O, mul(U, w)), add(add(O, mul(U, w)), mul(V, h)), add(O, mul(V, h))]
      .map((p) => P(p, t).map(f).join(",")).join(" "));
  }
  return { tr, ro, sk, sc, vis, polys };
}

function wrapAffine(fp, dur, content) {
  const A = (type, v) => `<animateTransform attributeName="transform" type="${type}" dur="${dur}s" repeatCount="indefinite" values="${v.join(";")}"/>`;
  return `<g>${A("translate", fp.tr)}<g>${A("rotate", fp.ro)}<g>${A("skewX", fp.sk)}<g>${A("scale", fp.sc)}${content}</g></g></g></g>`;
}
const animVals = (attr, v, dur, extra = "") => `<animate attributeName="${attr}" dur="${dur}s" repeatCount="indefinite" ${extra} values="${v.join(";")}"/>`;

// ------------------------------------------------------------------ hero: 3D phone running the AI chatbot
function hero() {
  const W = 1200, H = 560, CX = 900, CY = 282, FR = 96, DUR = 14;
  const PW = 230, PH = 460, PD = 24, R = 34;
  const pose = (p, t) => rx(ry(p, 0.42 * Math.sin(TAU * t)), 0.12 + 0.06 * Math.sin(2 * TAU * t));

  // screen content, local coords 0..PW × 0..PH
  const S = [];
  S.push(`<rect x="0" y="0" width="${PW}" height="${PH}" rx="${R}" fill="#141a36" stroke="#4b5aa8" stroke-width="2.5"/>`);
  S.push(`<rect x="9" y="9" width="${PW - 18}" height="${PH - 18}" rx="${R - 8}" fill="url(#screen)"/>`);
  S.push(`<rect x="${PW / 2 - 34}" y="18" width="68" height="18" rx="9" fill="#05060f"/>`);
  S.push(`<text x="26" y="32" font-family="${SANS}" font-size="11" font-weight="700" fill="#dfe6ff">9:41</text>`);
  S.push(`<rect x="${PW - 46}" y="23" width="20" height="10" rx="3" fill="none" stroke="#dfe6ff" stroke-width="1.2"/><rect x="${PW - 44}" y="25" width="13" height="6" rx="1.5" fill="#7ee787"/>`);
  // header
  S.push(`<circle cx="36" cy="66" r="15" fill="url(#gem)"/><path d="${sparkle(36, 66, 9)}" fill="#fff"/>`);
  S.push(`<text x="58" y="63" font-family="${SANS}" font-size="13.5" font-weight="800" fill="#f2f4ff">PhoneShopAI</text>`);
  S.push(`<circle cx="62" cy="76" r="3" fill="#7ee787" class="led"/><text x="69" y="80" font-family="${SANS}" font-size="10" fill="#9fb0e8">Gemini · online</text>`);
  S.push(`<line x1="18" y1="92" x2="${PW - 18}" y2="92" stroke="#2c3570"/>`);
  // user bubble
  S.push(`<g class="m1"><rect x="62" y="104" width="${PW - 80}" height="44" rx="14" fill="url(#gem)"/>` +
    `<text x="76" y="122" font-family="${SANS}" font-size="11" fill="#fff">Máy nào dưới 10 triệu,</text>` +
    `<text x="76" y="138" font-family="${SANS}" font-size="11" fill="#fff">pin trâu nhất ạ?</text></g>`);
  // typing indicator
  S.push(`<g class="m2"><rect x="18" y="160" width="58" height="28" rx="14" fill="#232b5c"/>` +
    [0, 1, 2].map((i) => `<circle cx="${34 + i * 13}" cy="174" r="3.6" fill="#b9c6ff" class="dot" style="animation-delay:${i * 0.18}s"/>`).join("") + "</g>");
  // AI answer with product rows
  const rows = [["Galaxy A56", "pin 2 ngày"], ["Redmi Note 14", "giá tốt nhất"], ["OPPO A5 Pro", "bền, chống nước"]];
  S.push(`<g class="m3"><rect x="18" y="160" width="${PW - 36}" height="172" rx="14" fill="#1d2452" stroke="#3a4799"/>` +
    `<path d="${sparkle(34, 178, 6)}" fill="#c4b5fd"/><text x="45" y="182" font-family="${SANS}" font-size="11" font-weight="700" fill="#e6e9ff">Mình gợi ý 3 máy:</text></g>`);
  rows.forEach(([name, tag], i) => {
    const y = 194 + i * 44;
    S.push(`<g class="r${i + 1}"><rect x="28" y="${y}" width="${PW - 56}" height="36" rx="10" fill="#141a3d"/>` +
      `<rect x="36" y="${y + 5}" width="15" height="26" rx="4" fill="none" stroke="${GEM[i]}" stroke-width="1.6"/><circle cx="43.5" cy="${y + 27}" r="1.3" fill="${GEM[i]}"/>` +
      `<text x="60" y="${y + 16}" font-family="${SANS}" font-size="11" font-weight="700" fill="#f2f4ff">${esc(name)}</text>` +
      `<text x="60" y="${y + 29}" font-family="${SANS}" font-size="9.5" fill="#9fb0e8">${esc(tag)}</text>` +
      `<path d="M${PW - 44} ${y + 13}l5 5l-5 5" fill="none" stroke="#9fb0e8" stroke-width="1.6"/></g>`);
  });
  S.push(`<g class="m4"><rect x="18" y="342" width="78" height="24" rx="12" fill="none" stroke="#7ee787"/>` +
    `<text x="57" y="358" text-anchor="middle" font-family="${SANS}" font-size="10" fill="#7ee787">So sánh</text>` +
    `<rect x="104" y="342" width="98" height="24" rx="12" fill="none" stroke="#ffb86b"/>` +
    `<text x="153" y="358" text-anchor="middle" font-family="${SANS}" font-size="10" fill="#ffb86b">Thêm vào giỏ</text></g>`);
  // input bar
  S.push(`<rect x="18" y="${PH - 66}" width="${PW - 36}" height="34" rx="17" fill="#0f1433" stroke="#2f3a7a"/>` +
    `<text x="34" y="${PH - 45}" font-family="${SANS}" font-size="10.5" fill="#6f7fb8">Hỏi AI về điện thoại…</text>` +
    `<circle cx="${PW - 36}" cy="${PH - 49}" r="12" fill="url(#gem)"/><path d="M${PW - 41} ${PH - 49}h9m-4 -4l4 4l-4 4" fill="none" stroke="#fff" stroke-width="1.8"/>`);
  S.push(`<rect x="${PW / 2 - 40}" y="${PH - 20}" width="80" height="4" rx="2" fill="#5a66a8"/>`);
  S.push(`<rect x="9" y="9" width="${PW - 18}" height="${PH - 18}" rx="${R - 8}" fill="url(#gloss)"/>`);

  const front = facePlane([-PW / 2, PH / 2, PD / 2], [1, 0, 0], [0, -1, 0], [0, 0, 1], [PW, PH], pose, FR, CX, CY);
  // thin sides, inset by the corner radius so their corners hide behind the rounded front
  const sides = [
    { O: [PW / 2, PH / 2 - R, PD / 2], U: [0, 0, -1], V: [0, -1, 0], N: [1, 0, 0], s: [PD, PH - 2 * R] },
    { O: [-PW / 2, PH / 2 - R, -PD / 2], U: [0, 0, 1], V: [0, -1, 0], N: [-1, 0, 0], s: [PD, PH - 2 * R] },
    { O: [-PW / 2 + R, PH / 2, -PD / 2], U: [1, 0, 0], V: [0, 0, 1], N: [0, 1, 0], s: [PW - 2 * R, PD] },
    { O: [-PW / 2 + R, -PH / 2, PD / 2], U: [1, 0, 0], V: [0, 0, -1], N: [0, -1, 0], s: [PW - 2 * R, PD] },
  ].map(({ O, U, V, N, s }) => {
    const fp = facePlane(O, U, V, N, s, pose, FR, CX, CY);
    return `<polygon points="${fp.polys[0]}" fill="#283066" stroke="#5a6ad0" stroke-width="1.2">` +
      animVals("points", fp.polys, DUR) + animVals("opacity", fp.vis, DUR) + `</polygon>`;
  });

  // tech satellites on a tilted ring, split into back/front copies for correct occlusion
  const ORB = 250, RING_Y = -40, TILT = -0.3;
  const orbit = (a) => rx([ORB * Math.cos(a), RING_Y, ORB * Math.sin(a)], TILT);
  const SATS = [["React", "#61dafb"], ["Node.js", "#7ee787"], ["MongoDB", "#5fd068"], ["Gemini AI", "#b69cff"], ["Docker", "#5aa9ff"]];
  const sat = (front) => SATS.map(([label, col], i) => {
    const xs = [], os = [];
    for (let k = 0; k <= FR; k++) {
      const p = orbit(-TAU * k / FR + i * TAU / SATS.length);
      xs.push(`${f(CX + p[0])},${f(CY - p[1])}`);
      os.push((front ? p[2] >= 0 : p[2] < 0) ? (front ? "1" : ".4") : "0");
    }
    const w = label.length * 7.9 + 32;
    return `<g opacity="0">` +
      `<animateTransform attributeName="transform" type="translate" dur="${DUR}s" repeatCount="indefinite" values="${xs.join(";")}"/>` +
      animVals("opacity", os, DUR, 'calcMode="discrete"') +
      `<rect x="${f(-w / 2)}" y="-14" width="${f(w)}" height="28" rx="14" fill="#0c0d24" stroke="${col}" stroke-width="1.6"/>` +
      `<circle cx="${f(-w / 2 + 14)}" cy="0" r="4" fill="${col}"/>` +
      `<text x="${f(-w / 2 + 24)}" y="4.5" font-family="${MONO}" font-size="12.5" font-weight="700" fill="${col}">${esc(label)}</text></g>`;
  }).join("\n");
  const ringPts = { back: [], front: [] };
  for (let k = 0; k <= 180; k++) {
    const a = TAU * k / 180, p = orbit(a);
    ringPts[p[2] < 0 ? "back" : "front"].push([CX + p[0], CY - p[1], k]);
  }
  const ringPath = (pts) => { let d = "", prev = -9; for (const [x, y, k] of pts) { d += (k - prev > 1 ? "M" : "L") + `${f(x)} ${f(y)}`; prev = k; } return d; };

  const defs = BG_DEFS + frameDef(W, H) + `
<linearGradient id="screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1230"/><stop offset="1" stop-color="#090b1f"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${GEM[1]}" stop-opacity=".55"/><stop offset="1" stop-color="${GEM[1]}" stop-opacity="0"/></radialGradient>`;
  const chat = (name, from, to) => `@keyframes ${name}{0%,${from[0]}%{opacity:0;transform:translateY(8px)}${from[1]}%,${to[0]}%{opacity:1;transform:none}${to[1]}%,100%{opacity:0;transform:none}}`;
  const css = COMMON_STYLE + `
.m1{animation:m1 11s ease-out infinite}${chat("m1", [3, 8], [90, 95])}
.m2{animation:m2 11s ease-out infinite}@keyframes m2{0%,12%{opacity:0}15%,30%{opacity:1}32%,100%{opacity:0}}
.m3{animation:m3 11s ease-out infinite}${chat("m3", [31, 35], [90, 95])}
.r1{animation:r1 11s ease-out infinite}${chat("r1", [36, 40], [90, 95])}
.r2{animation:r2 11s ease-out infinite}${chat("r2", [41, 45], [90, 95])}
.r3{animation:r3 11s ease-out infinite}${chat("r3", [46, 50], [90, 95])}
.m4{animation:m4 11s ease-out infinite}${chat("m4", [55, 60], [90, 95])}
.dot{animation:dot 1s ease-in-out infinite}@keyframes dot{0%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
.cursor{animation:blink 1s steps(2,start) infinite}
.pulse{animation:pulse 5s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}
.dash{animation:dash 20s linear infinite}@keyframes dash{to{stroke-dashoffset:-500}}
`;

  const b = frameOpen(W, H);
  b.push(starfield(W, H, 90, 5));
  const grid = [];
  for (let i = -14; i <= 14; i++) grid.push(`<line x1="${CX}" y1="330" x2="${CX + i * 120}" y2="${H + 40}"/>`);
  [384, 404, 430, 464, 508].forEach((yy, j) => grid.push(`<line x1="0" y1="${yy}" x2="${W}" y2="${yy}" opacity="${(0.25 + j * 0.15).toFixed(2)}"/>`));
  b.push(`<g stroke="#5b4fd6" stroke-width="1" opacity=".22">${grid.join("")}</g>`);
  b.push(`<circle cx="${CX}" cy="${CY}" r="230" fill="url(#halo)" class="pulse"/>`);
  b.push(`<ellipse cx="${CX}" cy="${CY + 262}" rx="170" ry="26" fill="#6b4dff" opacity=".35" filter="url(#soft)"/>`);
  b.push(`<path d="${ringPath(ringPts.back)}" fill="none" stroke="#a9b4ff" stroke-opacity=".3" stroke-width="1.3" stroke-dasharray="3 7" class="dash"/>`);
  b.push(sat(false));
  b.push(`<g class="bob">`, sides.join("\n"), wrapAffine(front, DUR, S.join("\n")), `</g>`);
  b.push(`<path d="${ringPath(ringPts.front)}" fill="none" stroke="#a9b4ff" stroke-opacity=".6" stroke-width="1.5" stroke-dasharray="3 7" class="dash"/>`);
  b.push(sat(true));

  // left column
  b.push(`<rect x="70" y="72" width="268" height="32" rx="16" fill="#ff6b9a" fill-opacity=".1" stroke="#ff6b9a" stroke-opacity=".55"/>` +
    `<circle cx="90" cy="88" r="5" fill="#ff6b9a" class="led"/>` +
    `<text x="104" y="93" font-family="${MONO}" font-size="14" fill="#ffb3c9">building PhoneShopAI · 2026</text>`);
  b.push(`<text x="70" y="156" font-family="${MONO}" font-size="20" fill="#9aa6e0">Xin chào, mình là</text>`);
  b.push(extruded(70, 226, "Sơn Trung Nguyên", 62, "url(#gem)", "#26145a", { depth: 7 }));
  b.push(`<text x="70" y="278" font-family="${SANS}" font-size="27" font-weight="600" fill="#eef0ff">Fullstack JavaScript Developer</text>`);
  b.push(`<text x="70" y="312" font-family="${MONO}" font-size="15.5" fill="#9aa6e0">Node.js · React · MongoDB · AI chatbot với Gemini</text>`);
  let cx = 70;
  for (const [text, col] of [["Trà Vinh University", "#7ee787"], ["DA23TTA · IT", "#61dafb"], ["Vĩnh Long, Việt Nam", "#ffb86b"]]) {
    const w = text.length * 8.1 + 30;
    b.push(`<rect x="${f(cx)}" y="346" width="${f(w)}" height="30" rx="8" fill="${col}" fill-opacity=".1" stroke="${col}" stroke-opacity=".55"/>` +
      `<circle cx="${f(cx + 13)}" cy="361" r="3.5" fill="${col}"/>` +
      `<text x="${f(cx + 23)}" y="366" font-family="${MONO}" font-size="13.5" fill="${col}">${esc(text)}</text>`);
    cx += w + 10;
  }
  b.push(`<text x="70" y="432" font-family="${MONO}" font-size="15" fill="#6b76b8">&gt; await gemini.chat(<tspan fill="#ffb86b">"tư vấn giúp mình"</tspan>)<tspan class="cursor" fill="#ff6b9a"> ▍</tspan></text>`);
  b.push(`<text x="70" y="${H - 34}" font-family="${MONO}" font-size="12" fill="#545e9e">// điện thoại 3D thật: mỗi mặt được chiếu trực giao rồi nội suy affine theo thời gian</text>`);
  b.push(frameClose(W, H));
  save("assets/hero.svg", svg(W, H, b.join("\n"), css, defs));
}

// ------------------------------------------------------------------ isometric helper for the flagship scene
class Iso {
  constructor(ox, oy, u) { Object.assign(this, { ox, oy, u }); }
  p(x, y, z) { return [this.ox + (x - y) * C30 * this.u, this.oy + (x + y) * S30 * this.u - z * this.u]; }
  poly(pts, fill, extra = "") { return `<polygon points="${pts.map((q) => this.p(...q).map(f).join(",")).join(" ")}" fill="${fill}" ${extra}/>`; }
  box(x, y, z, w, d, h, col, { stroke, rack = 0, leds } = {}) {
    const st = stroke ? `stroke="${stroke}" stroke-width="1" stroke-linejoin="round"` : "";
    const out = [
      this.poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], shade(col, 0.72), st),
      this.poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], shade(col, 0.48), st),
      this.poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], shade(col, 1.18), st),
    ];
    for (let i = 1; i <= rack; i++) {
      const zz = z + h * i / (rack + 1);
      const [a, c] = [this.p(x + 0.15, y + d, zz), this.p(x + w - 0.15, y + d, zz)];
      out.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(c[0])}" y2="${f(c[1])}" stroke="${shade(col, 0.45)}" stroke-width="1.4"/>`);
    }
    if (leds) for (let i = 0; i <= rack; i++) {
      const [lx, ly] = this.p(x + 0.4, y + d, z + h * (i + 0.5) / (rack + 1));
      out.push(`<circle cx="${f(lx)}" cy="${f(ly)}" r="2.2" fill="${leds}" class="led" style="animation-delay:${(i * 0.37).toFixed(2)}s"/>`);
    }
    return out.join("\n");
  }
  topText(x, y, z, text, size, fill) {
    const [tx, ty] = this.p(x, y, z);
    return `<text transform="matrix(${C30},${S30},${-C30},${S30},${f(tx)},${f(ty)})" font-family="${MONO}" font-size="${size}" font-weight="800" ` +
      `fill="${fill}" text-anchor="middle" dominant-baseline="middle">${esc(text)}</text>`;
  }
}

function flagship() {
  const W = 1200, H = 460;
  const iso = new Iso(880, 150, 24);
  const nodes = {
    ui: [0.5, 4, 3.2, "UI", "React 19", "#61dafb"],
    api: [4.5, 4, 4.4, "API", "Express 5", "#7ee787"],
    db: [8.5, 1.5, 2.6, "DB", "MongoDB", "#5fd068"],
    ai: [8.5, 6.5, 3.6, "AI", "Gemini", "#b69cff"],
    pay: [4.5, 8.5, 1.8, "PAY", "SePay", "#ffb86b"],
  };
  const centre = (k) => [nodes[k][0] + 1.25, nodes[k][1] + 1.25];
  const b = frameOpen(W, H);
  b.push(starfield(W, H, 60, 17));
  b.push(`<ellipse cx="880" cy="330" rx="300" ry="80" fill="#6b4dff" opacity=".3" filter="url(#soft)"/>`);
  const sc = ['<g class="bob">'];
  sc.push(iso.box(-0.5, -0.5, -0.8, 13, 13, 0.8, "#221d5c", { stroke: "#4c3fb0" }));
  for (let t = 1; t < 13; t++) {
    const [a, c] = [iso.p(-0.5 + t, -0.5, 0), iso.p(-0.5 + t, 12.5, 0)];
    const [d, e] = [iso.p(-0.5, -0.5 + t, 0), iso.p(12.5, -0.5 + t, 0)];
    sc.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(c[0])}" y2="${f(c[1])}" stroke="#7d6cf0" stroke-width=".7" opacity=".35"/>` +
      `<line x1="${f(d[0])}" y1="${f(d[1])}" x2="${f(e[0])}" y2="${f(e[1])}" stroke="#7d6cf0" stroke-width=".7" opacity=".35"/>`);
  }
  [["ui", "api"], ["api", "db"], ["api", "ai"], ["pay", "api"]].forEach(([a, c], k) => {
    const p1 = iso.p(...centre(a), 0), p2 = iso.p(...centre(c), 0);
    const d = `M${f(p1[0])},${f(p1[1])} L${f(p2[0])},${f(p2[1])}`;
    const col = nodes[c === "api" ? a : c][5];
    sc.push(`<path d="${d}" stroke="${col}" stroke-width="2" opacity=".55" stroke-dasharray="5 6"/>`);
    for (let j = 0; j < 2; j++) {
      const rev = j === 1 && k !== 3 ? ' keyPoints="1;0" keyTimes="0;1"' : "";
      sc.push(`<circle r="3.8" fill="${shade(col, 1.4)}" filter="url(#glow)"><animateMotion dur="2.4s" begin="${(k * 0.4 + j * 1.2).toFixed(2)}s" repeatCount="indefinite" calcMode="linear"${rev} path="${d}"/></circle>`);
    }
  });
  sc.push("</g>");
  b.push(sc.join("\n"));
  Object.values(nodes).forEach(([x, y, h, label, sub, col], i) => {
    const s = [`<g class="bob" style="animation-delay:${(-i * 1.1).toFixed(1)}s">`];
    const [bx, by] = iso.p(x + 1.25, y + 1.25, 0);
    s.push(`<ellipse cx="${f(bx)}" cy="${f(by)}" rx="40" ry="18" fill="${col}" opacity=".3" filter="url(#soft)"/>`);
    s.push(iso.box(x, y, 0.3, 2.5, 2.5, h, col, { stroke: shade(col, 1.35), rack: h > 3 ? 3 : 2, leds: "#ffffff" }));
    s.push(iso.topText(x + 1.25, y + 1.25, 0.3 + h, label, label.length > 2 ? 15 : 19, shade(col, 0.32)));
    const [lx, ly] = iso.p(x + 1.25, y + 1.25, 0.3 + h);
    s.push(`<line x1="${f(lx)}" y1="${f(ly - 12)}" x2="${f(lx)}" y2="${f(ly - 30)}" stroke="${col}" stroke-width="1.4"/>` +
      `<rect x="${f(lx - 46)}" y="${f(ly - 54)}" width="92" height="24" rx="12" fill="#0c0d24" stroke="${col}" stroke-width="1.4"/>` +
      `<text x="${f(lx)}" y="${f(ly - 37.5)}" text-anchor="middle" font-family="${MONO}" font-size="12.5" font-weight="700" fill="${shade(col, 1.3)}">${esc(sub)}</text>`);
    s.push("</g>");
    b.push(s.join("\n"));
  });

  b.push(`<rect x="56" y="52" width="252" height="28" rx="14" fill="#7ee787" fill-opacity=".1" stroke="#7ee787" stroke-opacity=".55"/>` +
    `<circle cx="74" cy="66" r="4.5" fill="#7ee787" class="led"/><text x="86" y="71" font-family="${MONO}" font-size="12.5" fill="#a8f0b9">ĐỒ ÁN CHUYÊN NGÀNH · 2026</text>`);
  b.push(extruded(56, 136, "PhoneShopAI", 52, "url(#gem)", "#26145a", { depth: 6 }));
  b.push(`<text x="56" y="174" font-family="${SANS}" font-size="19" font-weight="600" fill="#eef0ff">Website bán điện thoại + Chatbot AI tư vấn khách hàng</text>`);
  const feats = [
    ["#b69cff", "Gemini function calling", "giá, tồn kho, đơn hàng lấy từ DB thật — không bịa"],
    ["#61dafb", "Trả lời streaming (SSE)", "có chế độ offline rule-based khi hết quota"],
    ["#ffb86b", "Thanh toán tự động", "SePay webhook đối soát chuyển khoản, cùng VNPay"],
    ["#7ee787", "Trang quản trị chatbot", "bật/tắt, lời chào, câu gợi ý, kho kiến thức"],
  ];
  feats.forEach(([col, head, sub], i) => {
    const y = 222 + i * 50;
    b.push(`<path d="${sparkle(66, y - 5, 8)}" fill="${col}"/>` +
      `<text x="86" y="${y}" font-family="${SANS}" font-size="16" font-weight="700" fill="${col}">${esc(head)}</text>` +
      `<text x="86" y="${y + 20}" font-family="${MONO}" font-size="12.5" fill="#9aa6e0">${esc(sub)}</text>`);
  });
  b.push(`<text x="56" y="${H - 26}" font-family="${MONO}" font-size="12.5" fill="#6b76b8">React 19 · Vite 8 · Express 5 · MongoDB 7 · Jest · Docker Compose</text>`);
  b.push(frameClose(W, H));
  const css = COMMON_STYLE;
  save("assets/flagship.svg", svg(W, H, b.join("\n"), css, BG_DEFS + frameDef(W, H)));
}

// ------------------------------------------------------------------ project cards
function wrap(text, n) {
  const lines = []; let cur = "";
  for (const w of text.split(" ")) {
    if ((cur + " " + w).trim().length > n) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function card(file, { badge, title, tagline, desc, chips, accent, foot }) {
  const W = 600, H = 340, D = 12, cw = W - D - 4, ch = H - D - 4;
  const defs = `<linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1a46"/><stop offset="1" stop-color="#0c0c22"/></linearGradient>
<linearGradient id="edge" x1="0" x2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity=".15"/></linearGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const css = COMMON_STYLE + `.spin{animation:spin 9s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes spin{to{transform:rotate(360deg)}}
.sweep{animation:sweep 5s ease-in-out infinite}@keyframes sweep{0%{transform:translateX(-200px)}60%,100%{transform:translateX(${W + 200}px)}}`;
  const b = [];
  for (let i = D; i > 0; i -= 2) b.push(`<rect x="${2 + i}" y="${2 + i}" width="${cw}" height="${ch}" rx="22" fill="${shade(accent, 0.18 + 0.02 * (D - i))}"/>`);
  b.push(`<clipPath id="cc"><rect x="2" y="2" width="${cw}" height="${ch}" rx="22"/></clipPath>`);
  b.push(`<g clip-path="url(#cc)"><rect x="2" y="2" width="${cw}" height="${ch}" fill="url(#cg)"/>`);
  b.push(`<circle cx="${cw - 70}" cy="70" r="120" fill="${accent}" opacity=".12"/>`);
  b.push(`<g class="sweep"><rect x="0" y="0" width="60" height="${H}" fill="#fff" opacity=".04" transform="skewX(-20)"/></g></g>`);
  b.push(`<rect x="2" y="2" width="${cw}" height="${ch}" rx="22" fill="none" stroke="url(#edge)" stroke-width="2"/>`);
  // spinning orbit + sparkle emblem
  b.push(`<g transform="translate(${cw - 64} 64)"><circle r="34" fill="none" stroke="${accent}" stroke-opacity=".45" stroke-dasharray="4 6" class="spin"/>` +
    `<path d="${sparkle(0, 0, 20)}" fill="${accent}" filter="url(#glow)" class="bob"/></g>`);
  b.push(`<rect x="28" y="28" width="${badge.length * 8 + 24}" height="24" rx="12" fill="${accent}" fill-opacity=".14" stroke="${accent}" stroke-opacity=".6"/>` +
    `<text x="40" y="44.5" font-family="${MONO}" font-size="12" font-weight="700" fill="${accent}">${esc(badge)}</text>`);
  b.push(extruded(28, 98, title, title.length > 20 ? 30 : 34, "#f4f5ff", shade(accent, 0.35), { depth: 3 }));
  b.push(`<text x="28" y="128" font-family="${SANS}" font-size="15.5" font-weight="600" fill="${accent}">${esc(tagline)}</text>`);
  wrap(desc, 66).forEach((line, i) => b.push(`<text x="28" y="${162 + i * 21}" font-family="${SANS}" font-size="14" fill="#b4bce8">${esc(line)}</text>`));
  let x = 28;
  for (const c of chips) {
    const w = c.length * 7.4 + 20;
    b.push(`<rect x="${f(x)}" y="${ch - 72}" width="${f(w)}" height="24" rx="7" fill="#ffffff" fill-opacity=".05" stroke="#ffffff" stroke-opacity=".16"/>` +
      `<text x="${f(x + 10)}" y="${ch - 55.5}" font-family="${MONO}" font-size="12" fill="#d8dcff">${esc(c)}</text>`);
    x += w + 8;
  }
  b.push(`<line x1="28" y1="${ch - 34}" x2="${cw - 26}" y2="${ch - 34}" stroke="#ffffff" stroke-opacity=".08"/>` +
    `<circle cx="34" cy="${ch - 15}" r="5" fill="${accent}"/><text x="46" y="${ch - 10.5}" font-family="${MONO}" font-size="12.5" fill="#9aa6e0">${esc(foot)}</text>` +
    `<text x="${cw - 26}" y="${ch - 10.5}" text-anchor="end" font-family="${MONO}" font-size="12.5" fill="${accent}">view repo →</text>`);
  save(`assets/cards/${file}.svg`, svg(W, H, b.join("\n"), css, defs));
}

function cards() {
  card("techphone-store", {
    badge: "FULLSTACK", title: "TechPhone Store", tagline: "Website bán điện thoại & phụ kiện", accent: "#4f8cff",
    desc: "React 19 + Vite và Express 5 + MongoDB theo Clean Architecture: JWT, giỏ hàng, voucher, đánh giá, thanh toán VNPay, OTP qua Twilio, thống kê bằng Chart.js. Chạy bằng mock data hoặc API thật.",
    chips: ["React 19", "Express 5", "MongoDB", "VNPay", "Docker"], foot: "JavaScript · Jest",
  });
  card("facebook-account-detector", {
    badge: "AI · VISION", title: "Facebook Account Detector", tagline: "Đánh giá rủi ro tài khoản bằng AI", accent: "#b69cff",
    desc: "Phân tích ảnh chụp trang cá nhân qua Gemini Vision hoặc URL công khai qua Gemini URL Context. Thiếu API key thì trả 503 thay vì bịa kết quả.",
    chips: ["FastAPI", "Gemini", "PostgreSQL", "React", "Tailwind"], foot: "Python · Pytest",
  });
  card("cua-hang-tin-hoc", {
    badge: "ĐỒ ÁN CƠ SỞ NGÀNH", title: "Cửa Hàng Tin Học", tagline: "Website bán máy tính & linh kiện", accent: "#ffb86b",
    desc: "Giao diện cửa hàng tin học responsive: danh mục sản phẩm, chi tiết, giỏ hàng phía client. Làm bằng HTML, CSS, JavaScript thuần và Bootstrap.",
    chips: ["HTML5", "CSS3", "JavaScript", "Bootstrap"], foot: "HTML · 2025",
  });
  card("cpp-foundations", {
    badge: "FOUNDATIONS", title: "C++ & Databases", tagline: "Nền móng từ năm nhất", accent: "#3ef0c0",
    desc: "Cấu trúc dữ liệu & giải thuật, cơ sở dữ liệu và các bài thực hành C++ — nơi mọi thứ bắt đầu từ commit đầu tiên năm 2023.",
    chips: ["C++", "CTDL", "CSDL", "SQL"], foot: "C++ · 2023 – 2024",
  });
}

// ------------------------------------------------------------------ rotating tech cube
function cube() {
  const W = 1200, H = 500, CX = 600, CY = 262, FR = 120, DUR = 34, h = 120;
  const pose = (p, t) => rx(ry(p, TAU * t), 0.42);
  const faces = [
    { N: [0, 0, 1], V: [0, -1, 0], name: "FRONTEND", col: "#61dafb", items: ["React 19", "Vite 8", "Bootstrap 5", "Tailwind CSS", "Chart.js"] },
    { N: [1, 0, 0], V: [0, -1, 0], name: "BACKEND", col: "#7ee787", items: ["Node.js", "Express 5", "FastAPI", "JWT · REST", "SSE streaming"] },
    { N: [0, 0, -1], V: [0, -1, 0], name: "DATABASE", col: "#5fd068", items: ["MongoDB 7", "Mongoose 9", "PostgreSQL 16", "SQLAlchemy", "Alembic"] },
    { N: [-1, 0, 0], V: [0, -1, 0], name: "AI", col: "#b69cff", items: ["Gemini API", "Function calling", "Gemini Vision", "Prompting", "Eval scripts"] },
    { N: [0, 1, 0], V: [0, 0, 1], name: "DEVOPS", col: "#ffb86b", items: ["Docker", "Compose", "Nginx", "GitHub", "Vercel"] },
  ];
  const layers = faces.map(({ N, V, name, col, items }) => {
    const U = cross(N, V);
    const O = add(add(mul(N, h), mul(U, -h)), mul(V, -h));
    const fp = facePlane(O, U, V, N, [2 * h, 2 * h], pose, FR, CX, CY);
    const c = [];
    c.push(`<rect x="0" y="0" width="${2 * h}" height="${2 * h}" fill="#0f1030" fill-opacity=".94"/>`);
    c.push(`<rect x="0" y="0" width="${2 * h}" height="${2 * h}" fill="${col}" fill-opacity=".07"/>`);
    c.push(`<rect x="10" y="10" width="${2 * h - 20}" height="44" rx="10" fill="${col}" fill-opacity=".16"/>`);
    c.push(`<path d="${sparkle(32, 32, 10)}" fill="${col}"/>`);
    c.push(`<text x="50" y="40" font-family="${SANS}" font-size="20" font-weight="800" fill="${col}" letter-spacing="1.5">${name}</text>`);
    items.forEach((it, i) => c.push(`<circle cx="26" cy="${81 + i * 33}" r="4" fill="${col}"/>` +
      `<text x="40" y="${87 + i * 33}" font-family="${MONO}" font-size="16" fill="#e8ebff">${esc(it)}</text>`));
    c.push(`<rect x="1" y="1" width="${2 * h - 2}" height="${2 * h - 2}" fill="none" stroke="${col}" stroke-width="2.5"/>`);
    return `<g opacity="${fp.vis[0]}">${animVals("opacity", fp.vis, DUR)}${wrapAffine(fp, DUR, c.join(""))}</g>`;
  });
  // the hidden bottom face only casts a shadow
  const defs = BG_DEFS + frameDef(W, H);
  const css = COMMON_STYLE + `.dash{animation:dash 24s linear infinite}@keyframes dash{to{stroke-dashoffset:-600}}.dash2{animation:dash 34s linear infinite reverse}`;
  const b = frameOpen(W, H);
  b.push(starfield(W, H, 80, 29));
  b.push(`<ellipse cx="${CX}" cy="${CY + 190}" rx="230" ry="34" fill="#6b4dff" opacity=".4" filter="url(#soft)"/>`);
  b.push(`<ellipse cx="${CX}" cy="${CY + 10}" rx="290" ry="92" fill="none" stroke="#a9b4ff" stroke-opacity=".3" stroke-dasharray="3 9" class="dash"/>`);
  b.push(`<ellipse cx="${CX}" cy="${CY + 10}" rx="330" ry="112" fill="none" stroke="#ff6b9a" stroke-opacity=".22" stroke-dasharray="2 14" class="dash2"/>`);
  b.push(`<g filter="url(#glow)">${layers.join("\n")}</g>`);

  b.push(`<text x="56" y="70" font-family="${MONO}" font-size="13" fill="#6b76b8">// stack.rotate(</text><text x="185" y="70" font-family="${MONO}" font-size="13" fill="#ff6b9a">360°</text><text x="221" y="70" font-family="${MONO}" font-size="13" fill="#6b76b8">)</text>`);
  b.push(`<text x="56" y="112" font-family="${SANS}" font-size="15" font-weight="700" fill="#eef0ff">LANGUAGES</text>`);
  [["JavaScript", "#f7df1e"], ["TypeScript", "#4f8cff"], ["Python", "#ffd43b"], ["C++", "#659ad2"], ["HTML / CSS", "#ff8a5c"]].forEach(([l, c], i) => {
    const y = 148 + i * 46;
    b.push(`<rect x="56" y="${y - 22}" width="190" height="34" rx="9" fill="${c}" fill-opacity=".08" stroke="${c}" stroke-opacity=".5"/>` +
      `<circle cx="74" cy="${y - 5}" r="5" fill="${c}" class="led" style="animation-delay:${(i * 0.3).toFixed(1)}s"/>` +
      `<text x="88" y="${y}" font-family="${MONO}" font-size="14.5" fill="${c}">${l}</text>`);
  });
  [["10", "public repositories", "#61dafb"], ["2023", "first commit on GitHub", "#7ee787"], ["2", "ứng dụng chạy bằng Gemini", "#b69cff"]].forEach(([big, small, col], i) => {
    const y = 140 + i * 110;
    b.push(extruded(W - 56, y, big, 46, col, "#1b1650", { depth: 4, anchor: "end" }) +
      `<text x="${W - 56}" y="${y + 26}" text-anchor="end" font-family="${MONO}" font-size="13" fill="#9aa6e0">${esc(small)}</text>`);
  });
  b.push(frameClose(W, H));
  save("assets/cube-stack.svg", svg(W, H, b.join("\n"), css, defs));
}

// ------------------------------------------------------------------ time tunnel: the 4th dimension
function tunnel() {
  const W = 1200, H = 500, VX = 600, VY = 150;
  const events = [
    ["10 / 2023", "Hello, GitHub", "C++ · repo đầu tiên", "#9aa6e0"],
    ["03 / 2024", "CTDL", "cấu trúc dữ liệu · C++", "#3ef0c0"],
    ["11 / 2024", "CSDL", "cơ sở dữ liệu", "#5fd068"],
    ["11 / 2025", "Cửa Hàng Tin Học", "đồ án cơ sở ngành", "#ffb86b"],
    ["04 / 2026", "Tom & Jerry Spike", "mini web game", "#ff8a5c"],
    ["06 / 2026", "TechPhone Store", "React · Express · MongoDB", "#4f8cff"],
    ["07 / 2026", "FB Account Detector", "FastAPI · Gemini Vision", "#b69cff"],
    ["10 / 2026", "PhoneShopAI", "đồ án chuyên ngành · now", "#ff6b9a"],
  ];
  const n = events.length;
  // events sit on a zig-zag road that recedes into the vanishing point: older = farther
  const pts = events.map((_, i) => {
    const s = 0.22 + 0.78 * i / (n - 1), side = i % 2 ? 1 : -1;
    return { s, side, x: VX + side * 46 * s, y: VY + 300 * s };
  });
  // smooth worldline through every event (Catmull-Rom → Bézier)
  let d = `M${f(VX)} ${f(VY)}`;
  const all = [{ x: VX, y: VY }, ...pts];
  for (let i = 0; i < all.length - 1; i++) {
    const p0 = all[Math.max(0, i - 1)], p1 = all[i], p2 = all[i + 1], p3 = all[Math.min(all.length - 1, i + 2)];
    d += `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }

  const defs = BG_DEFS + frameDef(W, H) + `
<radialGradient id="core" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="${GEM[1]}" stop-opacity=".6"/><stop offset="1" stop-color="${GEM[1]}" stop-opacity="0"/></radialGradient>
<linearGradient id="wl" gradientUnits="userSpaceOnUse" x1="${VX}" y1="${VY}" x2="${f(pts[n - 1].x)}" y2="${f(pts[n - 1].y)}"><stop offset="0" stop-color="${GEM[0]}" stop-opacity=".3"/><stop offset=".6" stop-color="${GEM[1]}"/><stop offset="1" stop-color="${GEM[2]}"/></linearGradient>`;
  const RINGS = 10, ZD = 10;
  const css = COMMON_STYLE + `
.ring{animation:zoom ${ZD}s cubic-bezier(.55,0,1,.45) infinite;transform-origin:${VX}px ${VY}px}
@keyframes zoom{0%{transform:scale(.03);opacity:0}15%{opacity:.7}100%{transform:scale(1.5);opacity:.05}}
.flow{animation:flow 2.4s linear infinite}@keyframes flow{to{stroke-dashoffset:-36}}
.ping{animation:ping 3.6s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes ping{0%{opacity:.9;transform:scale(.5)}70%,100%{opacity:0;transform:scale(2.6)}}
`;
  const b = frameOpen(W, H);
  b.push(starfield(W, H, 70, 41));
  const spokes = [];
  for (let i = 0; i < 28; i++) {
    const a = TAU * i / 28;
    spokes.push(`<line x1="${VX}" y1="${VY}" x2="${f(VX + Math.cos(a) * 900)}" y2="${f(VY + Math.sin(a) * 420)}"/>`);
  }
  b.push(`<g stroke="#5b4fd6" stroke-opacity=".18">${spokes.join("")}</g>`);
  for (let i = 0; i < RINGS; i++) {
    const col = GEM[i % 3];
    b.push(`<rect x="${VX - 520}" y="${VY - 220}" width="1040" height="440" rx="200" fill="none" stroke="${col}" stroke-width="2" class="ring" style="animation-delay:${(-i * ZD / RINGS).toFixed(2)}s"/>`);
  }
  b.push(`<circle cx="${VX}" cy="${VY}" r="60" fill="url(#core)"/>`);
  b.push(`<path d="${d}" fill="none" stroke="url(#wl)" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 8" class="flow"/>`);
  b.push(`<circle r="6" fill="#fff" filter="url(#glow)"><animateMotion dur="7s" repeatCount="indefinite" path="${d}"/></circle>`);

  b.push(`<path d="M${VX} ${VY}L${VX - 330} ${H}M${VX} ${VY}L${VX + 330} ${H}" stroke="#a9b4ff" stroke-opacity=".35" stroke-width="1.5"/>`);
  pts.forEach(({ s, x, y, side }, i) => {
    const [date, name, sub, col] = events[i];
    const r = 5 + 13 * s, right = side > 0;
    const lx = x + (right ? 1 : -1) * (r + 12), anchor = right ? "start" : "end";
    const fs = 11 + 8 * s;
    b.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 4)}" fill="none" stroke="${col}" stroke-width="2" class="ping" style="animation-delay:${(i * 0.45).toFixed(2)}s"/>` +
      `<path d="${sparkle(x, y, r * 1.25)}" fill="${col}" filter="url(#glow)"/>` +
      `<text x="${f(lx)}" y="${f(y - fs * 0.95)}" text-anchor="${anchor}" font-family="${MONO}" font-size="${f(8 + 4 * s)}" fill="#9aa6e0">${date}</text>` +
      `<text x="${f(lx)}" y="${f(y + fs * 0.35)}" text-anchor="${anchor}" font-family="${SANS}" font-size="${f(fs)}" font-weight="800" fill="${i === n - 1 ? col : "#f2f4ff"}">${esc(name)}</text>` +
      `<text x="${f(lx)}" y="${f(y + fs * 0.35 + 6 + 8 * s)}" text-anchor="${anchor}" font-family="${MONO}" font-size="${f(8 + 4 * s)}" fill="${col}">${esc(sub)}</text>`);
  });
  b.push(`<text x="40" y="44" font-family="${MONO}" font-size="14" fill="#6b76b8">$ git log --since=2023 <tspan fill="#ff6b9a">| warp</tspan></text>`);
  b.push(`<text x="${W - 40}" y="44" text-anchor="end" font-family="${MONO}" font-size="14" fill="#6b76b8">x · y · z · <tspan fill="#ffb86b" font-weight="700">t</tspan> — bay xuyên chiều thứ 4</text>`);
  b.push(frameClose(W, H));
  save("assets/tunnel-4d.svg", svg(W, H, b.join("\n"), css, defs));
}

// ------------------------------------------------------------------ section titles & footer
function titles() {
  const items = [
    ["about", "01", "VỀ MÌNH", 0],
    ["flagship", "02", "DỰ ÁN CHÍNH", 1],
    ["projects", "03", "PROJECTS", 2],
    ["stack", "04", "TECH CUBE", 0],
    ["timeline", "05", "WARP THROUGH TIME", 1],
    ["principles", "06", "HOW I BUILD", 2],
    ["activity", "07", "GITHUB IN 3D", 0],
  ];
  const css = `.in{animation:bob 5s ease-in-out infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.spin{animation:spin 6s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes spin{to{transform:rotate(360deg)}}
.bar{animation:sweep 3.5s ease-in-out infinite}@keyframes sweep{0%,100%{opacity:.35}50%{opacity:.95}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}`;
  const defs = `<linearGradient id="gem" x1="0" x2="1"><stop offset="0" stop-color="${GEM[0]}"/><stop offset=".55" stop-color="${GEM[1]}"/><stop offset="1" stop-color="${GEM[2]}"/></linearGradient>`;
  for (const [key, num, text, ci] of items) {
    const W = 900, H = 90, width = text.length * 24.5 + 96, x0 = (W - width) / 2;
    const body = ['<g class="in">',
      `<path d="${sparkle(x0 + 14, 46, 14)}" fill="${GEM[ci]}" class="spin"/>`,
      `<text x="${f(x0 + 36)}" y="58" font-family="${MONO}" font-size="20" font-weight="700" fill="${GEM[ci]}" opacity=".8">${num}</text>`,
      extruded(x0 + 72, 60, text, 40, "url(#gem)", "#1c1250", { depth: 5, extra: 'letter-spacing="2"' }),
      "</g>",
      `<rect class="bar" x="${W / 2 - 160}" y="76" width="320" height="4" rx="2" fill="url(#gem)"/>`];
    save(`assets/titles/${key}.svg`, svg(W, H, body.join("\n"), css, defs));
  }
}

function footer() {
  const W = 1200, H = 200;
  const css = COMMON_STYLE;
  const defs = BG_DEFS + `<clipPath id="typeclip"><rect x="250" y="60" width="0" height="60">` +
    `<animate attributeName="width" dur="7s" repeatCount="indefinite" values="0;430;430;0" keyTimes="0;.45;.85;1"/></rect></clipPath>`;
  const b = [];
  b.push(`<rect x="200" y="56" width="800" height="68" rx="34" fill="#11122e" stroke="url(#gem)" stroke-width="2.5"/>`);
  b.push(`<path d="${sparkle(234, 90, 12)}" fill="url(#gem)"/>`);
  b.push(`<g clip-path="url(#typeclip)"><text x="258" y="97" font-family="${SANS}" font-size="20" fill="#eef0ff">Cùng build một thứ gì đó thật xịn nhé!</text></g>`);
  b.push(`<circle cx="956" cy="90" r="24" fill="url(#gem)"/><path d="M944 90h22m-8 -8l8 8l-8 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`);
  b.push(`<text x="600" y="168" text-anchor="middle" font-family="${MONO}" font-size="14" fill="#7d88c8">made with JavaScript, a bit of 4D math and lots of ☕ — Sơn Trung Nguyên</text>`);
  save("assets/footer.svg", svg(W, H, b.join("\n"), css, defs));
}

hero();
flagship();
cards();
cube();
tunnel();
titles();
footer();
