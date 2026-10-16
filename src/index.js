export const palettes = { ember: ['#100e20', '#56122c', '#b83232', '#ed6930', '#ffc34d', '#fff3ac'], ice: ['#0c152b', '#153b68', '#256f9b', '#37b5c6', '#8ae5e5', '#edfaff'], toxic: ['#101522', '#24382b', '#397b36', '#6bbd39', '#b5ed59', '#f5ffd1'] };
export function createWorld({ seed = 42, width = 80, height = 30, wind = 0, palette = 'ember' } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('seed must be unsigned 32-bit');
  if (!Number.isInteger(width) || width < 20 || width > 120 || !Number.isInteger(height) || height < 10 || height > 60) throw new Error('width must be 20–120 and height 10–60');
  if (!Number.isInteger(wind) || Math.abs(wind) > 2) throw new Error('wind must be an integer from -2 to 2');
  if (!Object.hasOwn(palettes, palette)) throw new Error('palette must be ember, ice, or toxic');
  return { seed, randomState: seed, width, height, wind, palette, fuel: true, frame: 0, heat: new Float64Array(width * height), next: new Float64Array(width * height) };
}
function random(world) { world.randomState = (Math.imul(world.randomState, 1664525) + 1013904223) >>> 0; return world.randomState / 4294967296; }
export function step(world, count = 1) {
  if (!Number.isInteger(count) || count < 0 || count > 10000) throw new Error('step count must be 0–10000');
  const { width: w, height: h } = world;
  for (let tick = 0; tick < count; tick++) {
    for (let x = 0; x < w; x++) world.next[(h - 1) * w + x] = world.fuel ? Math.min(1, 0.55 + 0.4 * Math.sin(x * 0.21 + world.frame * 0.07) + random(world) * 0.15) : 0;
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w; x++) {
      const jitter = Math.floor(random(world) * 3) - 1, from = x - world.wind + jitter, sample = dx => world.heat[(y + 1) * w + ((from + dx + w * 2) % w)];
      world.next[y * w + x] = Math.max(0, (sample(-1) + sample(0) * 2 + sample(1)) / 4 - 0.008 - random(world) * 0.035);
    }
    [world.heat, world.next] = [world.next, world.heat]; world.frame++;
  }
  return world;
}
export function analyze(world) {
  let sum = 0, hottest = 0, lit = 0; for (const v of world.heat) { sum += v; hottest = Math.max(hottest, v); if (v > 0.1) lit++; }
  return { seed: world.seed, width: world.width, height: world.height, frame: world.frame, wind: world.wind, palette: world.palette, fuel: world.fuel, meanHeat: sum / world.heat.length, hottest, litCells: lit };
}
export function render(world, { color = false } = {}) {
  const ramp = ' .:-=+*#%@', ansi = world.palette === 'ice' ? [30, 34, 36, 96, 97, 97] : world.palette === 'toxic' ? [30, 32, 32, 92, 93, 97] : [30, 31, 31, 91, 33, 93];
  const rows = []; for (let y = 0; y < world.height; y++) { let row = ''; for (let x = 0; x < world.width; x++) { const heat = world.heat[y * world.width + x], ch = ramp[Math.min(9, Math.floor(heat * 10))]; row += color && heat > 0 ? `\x1b[${ansi[Math.min(5, Math.floor(heat * 6))]}m${ch}\x1b[0m` : ch; } rows.push(row); } return rows.join('\n');
}
export function renderSVG(world) {
  const w = world.width * 8 + 64, h = world.height * 10 + 120; let cells = '';
  world.heat.forEach((heat, i) => { if (heat > 0.02) cells += `<rect x="${32 + i % world.width * 8}" y="${86 + Math.floor(i / world.width) * 10}" width="8.1" height="10.1" fill="${palettes[world.palette][Math.min(5, Math.floor(heat * 6))]}"/>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${Math.round(h * 800 / w)}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="18" fill="#0d1525"/><g font-family="monospace"><text x="32" y="36" font-size="24" fill="#eff5ff">TERMINAL FIRE FORGE</text><text x="32" y="64" fill="#93a4bc">seed ${world.seed} / frame ${world.frame} / wind ${world.wind} / ${world.palette}</text>${cells}<text x="32" y="${h - 12}" font-size="12" fill="#93a4bc">f fuel / a,d wind / 1 ember 2 ice 3 toxic / p pause . step n seed q quit</text></g></svg>\n`;
}
