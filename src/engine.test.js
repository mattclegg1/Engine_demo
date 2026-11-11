// Sanity checks: `npm test`. Prints full-throttle curves and asserts headline figures are plausible.
import assert from 'node:assert';
import { ENGINES, simulate, ecu } from './engine.js';

const run = (e, rpm, th) => { const c = ecu(e, rpm, th); return simulate(e, rpm, c.fuel, c.air); };
const peaks = {};
for (const e of Object.values(ENGINES)) {
  let pk = { power: 0 }, tq = { torque: 0 };
  console.log(`\n${e.name}  (full throttle)`);
  for (let rpm = e.rpmMin; rpm <= e.rpmMax; rpm += (e.rpmMax - e.rpmMin) / 10) {
    const r = run(e, rpm, 1);
    if (r.power > pk.power) pk = r;
    if (r.torque > tq.torque) tq = r;
    console.log(`${String(Math.round(rpm)).padStart(6)} rpm ${r.power.toFixed(0).padStart(5)} kW ${r.torque.toFixed(0).padStart(5)} Nm  λ ${r.lambda.toFixed(2)}  MAP ${r.map.toFixed(2)}  eff ${(r.efficiency*100).toFixed(0)}%  EGT ${r.egt.toFixed(0)}  fuel ${r.fuel.toFixed(1)}  flags ${['knock','overStress','overTemp','overFuelLimit','misfire'].filter(k=>r[k]).join(',')}`);
    assert(!r.knock && !r.overStress && !r.misfire && !r.overFuelLimit, 'ECU must stay inside limits');
  }
  for (const th of [0, 0.1, 0.3, 0.5, 0.8]) { const r = run(e, e.defaults.rpm, th); console.log(`  th ${th}: ${r.power.toFixed(1)} kW λ ${r.lambda.toFixed(2)} MAP ${r.map.toFixed(2)} ${r.mixture} eff ${(r.efficiency*100).toFixed(0)}%`); assert(!r.misfire); }
  peaks[e.id] = [pk.power, tq.torque];
}
console.log(peaks);
assert(peaks.diesel[0] > 95 && peaks.diesel[0] < 125);
assert(peaks.f1[0] > 560 && peaks.f1[0] < 660);
assert(peaks.eco[0] > 65 && peaks.eco[0] < 95);
console.log('ok');
