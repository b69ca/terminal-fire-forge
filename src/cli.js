#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { createWorld, step, analyze, render, renderSVG } from './index.js';
import { parse, integer, terminal } from './terminal.js';
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log('Usage: terminal-fire-forge [--seed N] [--width N] [--height N] [--steps N] [--frames N] [--json] [--svg FILE] [--no-color]\n\nf fuel, a/d wind, 1/2/3 palettes; Controls: p pause, . step, n next seed, r reset, +/- speed, q quit'); process.exit(0); }
try {
  const options = parse(args, ["--seed","--width","--height","--steps","--frames","--svg","--wind","--palette"]);
  const live = !!(process.stdout.isTTY && process.stdin.isTTY && !options['--json'] && !options['--svg']);
  const width = integer(options, '--width', live ? Math.max(20, Math.min(100, (process.stdout.columns || 80) - 1)) : 80, 120);
  const height = integer(options, '--height', live ? Math.max(10, Math.min(40, (process.stdout.rows || 32) - 4)) : 30, 60);
  let seed = integer(options, '--seed', 42, 0xffffffff), paused = false, delay = 60;
  
  const wind = options['--wind'] === undefined ? 0 : Number(options['--wind']); const palette = options['--palette'] || 'ember';
  const make = () => createWorld({ seed, width, height, wind, palette }); let world = make();
  const frames = integer(options, '--frames', live ? Infinity : 1, 100000);
  if ((options['--json'] || options['--svg']) && options['--frames'] !== undefined) throw new Error('--frames is only for terminal output');
  step(world, integer(options, '--steps', live ? 0 : 90, 10000));
  if (options['--json'] || options['--svg']) {
    if (options['--svg']) await writeFile(options['--svg'], renderSVG(world));
    if (options['--json']) console.log(JSON.stringify(analyze(world), null, 2));
  } else await terminal({ live, frames, interval: () => delay,
    onKey: key => {
      if (key === 'p' || key === ' ') paused = !paused;
      else if (key === '.') { paused = true; step(world); }
      else if (key === 'n') { seed = (seed + 1) >>> 0; world = make(); }
      else if (key === 'r') world = make();
      
      else if (key === 'f') world.fuel = !world.fuel;
      else if (key === 'a') world.wind = Math.max(-2, world.wind - 1);
      else if (key === 'd') world.wind = Math.min(2, world.wind + 1);
      else if (['1', '2', '3'].includes(key)) world.palette = ['ember', 'ice', 'toxic'][Number(key) - 1];
      else if (key === '+' || key === '=') delay = Math.max(10, Math.floor(delay / 2));
      else if (key === '-') delay = Math.min(1000, delay * 2);
    }, onTick: () => { if (paused || world.complete) return false; step(world, 1); return true; },
    draw: () => 'FIRE FORGE | seed ' + seed + ' | frame ' + world.frame + (world.complete ? ' COMPLETE' : '') + (paused ? ' PAUSED' : '') + '\n' + render(world, { color: live && !options['--no-color'] && !process.env.NO_COLOR }) + '\nf fuel, a/d wind, 1/2/3 palettes | p pause . step n seed r reset q quit'
  });
} catch (error) { console.error('terminal-fire-forge: ' + error.message); process.exitCode = 2; }
