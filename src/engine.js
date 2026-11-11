// Simplified, physically-motivated engine model.
// It is tuned to give plausible numbers for a curious learner, not to be a
// calibration-grade simulation. All flows are in kg/h, power in kW, torque in Nm.

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** Linear interpolation through a sorted [[x, y], ...] table, clamped at the ends. */
export function interp(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}

export const ENGINES = {
  diesel: {
    id: 'diesel',
    name: '2.0 L Turbo Diesel',
    short: 'Diesel',
    tag: 'Inline-4 · compression ignition',
    blurb:
      'A family-car workhorse. No spark plugs and no throttle: it always breathes as much air as it can and power is set purely by how much fuel is injected.',
    ignition: 'ci',
    displacement: 2.0,
    cylinders: 4,
    stoich: 14.5,
    lhv: 42.8, // MJ/kg
    idle: 800,
    redline: 5000,
    rpmMin: 700,
    rpmMax: 5400,
    rpmStep: 50,
    fuelMax: 36,
    airMax: 700,
    etaPeak: 0.46,
    heatLoss: 0.26,
    rhoPerBar: 1.1, // kg/m3 of intake air per bar of manifold pressure (intercooled)
    fmep: [0.9, 0.15, 0.03], // friction mean effective pressure, bar: a + b·n + c·n² (n = rpm/1000)
    // relative fuel-conversion efficiency vs lambda
    effTable: [[0.45, 0.3], [0.6, 0.45], [0.8, 0.62], [1.0, 0.8], [1.2, 0.92], [1.5, 0.99], [2, 1], [4, 0.97], [8, 0.9], [14, 0.8]],
    veTable: [[800, 0.85], [2000, 0.92], [4000, 0.88], [5400, 0.75]],
    mapTable: [[800, 1.05], [1200, 1.5], [1750, 2.4], [3500, 2.5], [4500, 2.3], [5400, 2.0]],
    revEff: [[800, 0.9], [1500, 0.97], [2500, 1], [3500, 0.97], [4500, 0.88], [5400, 0.75]],
    ratedTorque: [[1000, 200], [1750, 340], [2750, 340], [3750, 280], [4500, 215], [5400, 120]],
    peakTorque: 340,
    egtLimit: 800,
    lambdaIdeal: [1.3, 3.5],
    lambdaScale: [0.5, 6],
    defaults: { rpm: 2200, throttle: 0.6 },
  },
  f1: {
    id: 'f1',
    name: '1.6 L V6 Turbo Hybrid',
    short: 'Formula One',
    tag: 'V6 · lean-burn spark ignition + MGU-K',
    blurb:
      'A modern F1 power unit. The rules cap fuel at 100 kg/h, so power comes from burning that fuel as efficiently as possible: very lean, very high boost, over 50% thermal efficiency, plus up to 120 kW of electric assist.',
    ignition: 'si',
    displacement: 1.6,
    cylinders: 6,
    stoich: 14.6,
    lhv: 44,
    idle: 4000,
    redline: 15000,
    rpmMin: 3500,
    rpmMax: 16000,
    rpmStep: 100,
    fuelMax: 130,
    airMax: 2800,
    etaPeak: 0.54,
    heatLoss: 0.2,
    rhoPerBar: 1.08,
    fmep: [1.0, 0.08, 0.012],
    effTable: [[0.6, 0], [0.7, 0.6], [0.9, 0.86], [1.0, 0.92], [1.2, 0.98], [1.4, 1], [1.7, 0.95], [1.9, 0.6], [2.1, 0]],
    veTable: [[3000, 0.85], [8000, 0.98], [12000, 1], [16000, 0.9]],
    mapTable: [[3000, 1.5], [6000, 3], [9000, 4.5], [12000, 5], [16000, 5]],
    revEff: [[3000, 0.85], [7000, 0.95], [10500, 1], [13000, 0.98], [16000, 0.93]],
    peakTorque: 580,
    egtLimit: 1050,
    knockFactor: 0.62,
    lambdaIdeal: [1.15, 1.6],
    lambdaScale: [0.5, 2.3],
    fuelFlowLimit: (rpm) => (rpm >= 10500 ? 100 : 5.5 + 0.009 * rpm),
    mguKMax: 120,
    defaults: { rpm: 11000, throttle: 1 },
  },
  eco: {
    id: 'eco',
    name: '1.0 L Economy Petrol',
    short: 'City Car',
    tag: 'Inline-3 turbo · spark ignition',
    blurb:
      'A small three-cylinder built for low fuel bills. A throttle controls the air, and the computer adds just enough petrol to match it almost exactly, so the catalytic converter can clean up the exhaust.',
    ignition: 'si',
    displacement: 1.0,
    cylinders: 3,
    stoich: 14.7,
    lhv: 44,
    idle: 850,
    redline: 6500,
    rpmMin: 700,
    rpmMax: 7000,
    rpmStep: 50,
    fuelMax: 26,
    airMax: 340,
    etaPeak: 0.385,
    heatLoss: 0.27,
    rhoPerBar: 1.1,
    fmep: [0.7, 0.12, 0.02],
    effTable: [[0.5, 0], [0.6, 0.45], [0.8, 0.8], [0.9, 0.915], [1.0, 0.97], [1.1, 1], [1.3, 0.97], [1.45, 0.85], [1.6, 0.4], [1.7, 0]],
    veTable: [[850, 0.8], [2500, 0.92], [5000, 0.92], [7000, 0.82]],
    mapTable: [[850, 1.0], [1300, 1.5], [1700, 1.9], [4500, 1.9], [5500, 1.75], [6500, 1.5], [7000, 1.4]],
    revEff: [[850, 0.88], [2000, 0.97], [3500, 1], [5500, 0.97], [7000, 0.9]],
    peakTorque: 172,
    egtLimit: 980,
    knockFactor: 1,
    lambdaIdeal: [0.97, 1.03],
    lambdaScale: [0.4, 2],
    defaults: { rpm: 2500, throttle: 0.45 },
  },
};

export const ENGINE_ORDER = ['diesel', 'f1', 'eco'];

/** Air the engine can swallow (kg/h) at a given speed and manifold pressure (bar abs). */
export function airCapacity(e, rpm, map) {
  return (e.displacement / 1000) * (rpm / 2) * 60 * map * e.rhoPerBar * interp(e.veTable, rpm);
}

export const maxMap = (e, rpm) => interp(e.mapTable, rpm);

function frictionKW(e, rpm) {
  const n = rpm / 1000;
  const bar = e.fmep[0] + e.fmep[1] * n + e.fmep[2] * n * n;
  return (bar * 100 * (e.displacement / 1000) * rpm) / 120;
}

const KNOCK_LAMBDA = [[0.8, 0.75], [0.9, 0.8], [1.0, 1.0], [1.1, 1.1], [1.3, 1.0], [1.5, 0.8]];

/**
 * Core model: what happens when this engine turns at `rpm` while being fed
 * `fuel` kg/h of fuel and offered `airReq` kg/h of air.
 */
export function simulate(e, rpm, fuel, airReq, mguK = 0) {
  const cap = airCapacity(e, rpm, maxMap(e, rpm));
  const air = Math.max(0, Math.min(airReq, cap));
  const airLimited = airReq > cap * 1.005;
  const map = air / airCapacity(e, rpm, 1);
  const lambda = fuel > 0 ? air / (fuel * e.stoich) : Infinity;
  const afr = fuel > 0 ? air / fuel : Infinity;

  const rel = fuel > 0 && air > 0 ? interp(e.effTable, lambda) : 0;
  const etaI = e.etaPeak * rel * interp(e.revEff, rpm);
  const fuelKW = (fuel / 3600) * e.lhv * 1000;
  const indicated = fuelKW * etaI;
  const friction = frictionKW(e, rpm);
  const pumping =
    e.ignition === 'si' ? (Math.max(0, 1 - map) * 100 * (e.displacement / 1000) * rpm) / 120 : 0;
  const icePower = indicated - friction - pumping;
  const power = icePower + mguK;
  const omega = (rpm * 2 * Math.PI) / 60;
  const torque = (power * 1000) / omega;
  const iceTorque = (icePower * 1000) / omega;
  const efficiency = fuelKW > 0 && icePower > 0 ? icePower / fuelKW : 0;

  const noFuel = fuel <= 0;
  const misfire = !noFuel && rel <= 0.001;
  const burning = !noFuel && !misfire;
  const mixture = noFuel
    ? 'nofuel'
    : misfire
      ? lambda < 1 ? 'flooded' : 'toolean'
      : lambda < e.lambdaIdeal[0] ? 'rich' : lambda > e.lambdaIdeal[1] ? 'lean' : 'ideal';

  // Exhaust temperature: heat released that did not become work or coolant heat.
  const burnFrac = burning ? Math.min(1, lambda) * Math.min(1, rel / 0.5) : 0;
  let egt = 40;
  if (air + fuel > 0 && burning) {
    const heat = fuelKW * Math.max(0, burnFrac * (1 - e.heatLoss) - etaI); // kW
    egt = 40 + (heat * 3600) / ((air + fuel) * 1.15);
  }

  const load = clamp(iceTorque / e.peakTorque);
  const si = e.ignition === 'si';
  const bell = (x, mu, w) => Math.exp(-(((x - mu) / w) ** 2));
  const emissions = burning || misfire
    ? {
        soot: 100 * (si ? clamp((0.85 - lambda) / 0.3) : clamp((1.55 - lambda) / 0.65) ** 0.8) * (misfire ? 0.3 : 1),
        co: 100 * clamp((1.03 - lambda) / 0.35),
        hc: misfire ? 100 : 100 * clamp((0.85 - rel) / 0.85),
        nox: burning
          ? 100 * (si ? bell(lambda, 1.1, 0.17) : bell(lambda, 1.5, 0.75)) * (0.25 + 0.75 * load ** 0.7)
          : 0,
      }
    : { soot: 0, co: 0, hc: 0, nox: 0 };

  const knockIndex =
    si && burning
      ? (map / Math.max(...e.mapTable.map((p) => p[1]))) *
        (1 + 0.5 * (1 - rpm / e.redline)) *
        interp(KNOCK_LAMBDA, lambda) *
        e.knockFactor
      : 0;

  return {
    rpm, fuel, air, airReq, airLimited, cap, map, lambda, afr,
    fuelKW, indicated, friction, pumping, icePower, power, torque, iceTorque, mguK,
    efficiency, egt, load, mixture, misfire, noFuel, burning, emissions,
    knock: knockIndex > 1.2,
    knockIndex,
    overRev: rpm > e.redline,
    overStress: iceTorque > e.peakTorque * 1.12,
    overTemp: egt > e.egtLimit,
    overFuelLimit: e.fuelFlowLimit ? fuel > e.fuelFlowLimit(rpm) + 0.05 : false,
    stalling: icePower < 0,
  };
}

/**
 * The engine computer: turns a throttle pedal position (0–1) into fuel and air
 * the way each engine type really does it.
 */
export function ecu(e, rpm, throttle) {
  const th = clamp(throttle);
  const mMax = maxMap(e, rpm);
  const cap = airCapacity(e, rpm, mMax);
  const overrun = th < 0.02 && rpm > e.idle + 250;
  const omega = (rpm * 2 * Math.PI) / 60;
  // fuel that just covers friction (keeps the engine turning at idle)
  const idleFuel = ((frictionKW(e, rpm) * 1.15) / (e.etaPeak * 0.9 * interp(e.revEff, rpm)) / (e.lhv * 1000)) * 3600;

  if (e.ignition === 'ci') {
    // Diesel: fuel is the "throttle". Limited by smoke (lambda >= 1.3) and by the gearbox-friendly torque curve.
    const smoke = cap / (e.stoich * 1.3);
    const wantKW = (interp(e.ratedTorque, rpm) * omega) / 1000 + frictionKW(e, rpm);
    const torqueLim = (wantKW / (e.etaPeak * 0.985 * interp(e.revEff, rpm)) / (e.lhv * 1000)) * 3600;
    const fMax = Math.min(smoke, torqueLim);
    const fuel = overrun ? 0 : Math.max(th * fMax, rpm <= e.idle + 250 ? idleFuel : 0);
    const air = airCapacity(e, rpm, 1 + (mMax - 1) * clamp(fuel / fMax));
    return { fuel, air };
  }

  if (e.id === 'f1') {
    // F1: fuel-flow limited by regulation, burned lean with as much boost as needed.
    const fuel = overrun ? 0 : Math.max(th * Math.min(e.fuelFlowLimit(rpm), cap / (e.stoich * 1.35)), rpm <= e.idle + 250 ? idleFuel : 0);
    const air = Math.min(cap, Math.max(fuel * e.stoich * 1.35, airCapacity(e, rpm, 0.12)));
    return { fuel, air };
  }

  // Petrol: the throttle sets the air, fuel follows at lambda 1 (slightly rich at full load).
  const map = 0.25 + th * (mMax - 0.25);
  const air = airCapacity(e, rpm, map);
  const target = 1 - 0.1 * clamp((th - 0.7) / 0.2);
  const fuel = overrun ? 0 : air / (e.stoich * target);
  return { fuel, air };
}

/** Sweep the rev range for the power/torque chart. */
export function sweep(e, fn, points = 72) {
  const out = [];
  for (let i = 0; i < points; i++) {
    const rpm = e.rpmMin + ((e.rpmMax - e.rpmMin) * i) / (points - 1);
    const r = fn(rpm);
    out.push({ rpm, power: r.power, torque: r.torque, misfire: r.misfire || r.noFuel });
  }
  return out;
}

/** Plain-English commentary on the current operating point. */
export function explain(e, r, mode) {
  const out = [];
  const diesel = e.ignition === 'ci';
  const L = r.lambda;

  if (r.noFuel) {
    out.push({ tone: 'info', title: 'Fuel cut', text: 'No fuel is being injected. The engine is just an air pump being dragged round by the car, which is what gives you engine braking when you lift off.' });
  } else if (r.mixture === 'flooded') {
    out.push({ tone: 'bad', title: 'Flooded — misfire', text: `There is far too much fuel for the air (only ${(L * 100).toFixed(0)}% of the air needed). The spark cannot light a mixture this rich, so the fuel leaves unburnt.` });
  } else if (r.mixture === 'toolean') {
    out.push({ tone: 'bad', title: 'Too lean — misfire', text: `There is ${L.toFixed(1)}× more air than the fuel needs. The fuel droplets are spread too thinly for a flame to travel through, so nothing ignites.` });
  } else if (r.mixture === 'rich') {
    out.push({
      tone: 'warn',
      title: diesel ? 'Over-fuelled' : 'Running rich',
      text: diesel
        ? 'A diesel needs spare air around every fuel droplet. With this little excess air the fuel cannot find oxygen in time and turns into black soot instead of power.'
        : L < 0.85
          ? 'More fuel than the air can burn. The surplus cannot release its energy, so it is wasted out of the exhaust as carbon monoxide and unburnt fuel.'
          : 'Slightly more fuel than the air can burn. This actually gives the most power for a given amount of air and keeps the cylinder cool, but efficiency suffers.',
    });
  } else if (r.mixture === 'lean') {
    out.push({
      tone: 'info',
      title: diesel ? 'Very light load' : 'Running lean',
      text: diesel
        ? 'Lots of air and very little fuel. That is normal for a diesel at light load, though a big share of the fuel now goes into just overcoming friction.'
        : 'More air than the fuel needs. Lean mixtures can be efficient, but they burn slowly, run hot around the valves and eventually stop igniting.',
    });
  } else {
    out.push({
      tone: 'good',
      title: 'Healthy mixture',
      text: diesel
        ? 'Plenty of excess air for the injected fuel: clean, complete combustion.'
        : e.id === 'f1'
          ? 'Lean and heavily boosted: every drop of the rationed fuel is burned with air to spare. This is how F1 engines pass 50% efficiency.'
          : 'Air and fuel are almost perfectly matched (about 14.7 parts air to 1 part petrol), which is what the catalytic converter needs.',
    });
  }

  if (r.airLimited && mode === 'direct') {
    out.push({ tone: 'info', title: 'Air limited by RPM', text: `At ${Math.round(r.rpm)} rpm the engine can only swallow about ${Math.round(r.cap)} kg/h, even with the turbo at full boost. Each cylinder has a fixed volume, so more air needs more revs or more boost.` });
  }
  if (r.burning && r.stalling) {
    out.push({ tone: 'warn', title: 'Not enough to keep running', text: `Combustion makes ${r.indicated.toFixed(1)} kW but friction${r.pumping > 0.2 ? ' and pumping air past the throttle' : ''} eat ${(r.friction + r.pumping).toFixed(1)} kW. Left alone, the engine would slow down.` });
  }
  if (r.burning && !r.stalling && r.pumping > r.icePower * 0.25 && r.pumping > 0.3) {
    out.push({ tone: 'info', title: 'Throttling losses', text: 'The partly closed throttle makes the engine suck air through a restriction, like breathing through a straw. That wasted effort is a big reason petrol engines are thirsty at light load.' });
  }
  if (r.knock) {
    out.push({ tone: 'bad', title: 'Knock risk', text: 'High boost, low revs and little spare fuel to cool the charge: the mixture may explode on its own before the flame reaches it. Real engines pull back boost or add fuel here.' });
  }
  if (r.overTemp) {
    out.push({ tone: 'bad', title: 'Exhaust too hot', text: `Around ${Math.round(r.egt)} °C leaving the cylinder is beyond what the turbo and valves tolerate for long (limit about ${e.egtLimit} °C).` });
  }
  if (r.overStress) {
    out.push({ tone: 'bad', title: 'Beyond design torque', text: `This much fuel and air at this speed makes more torque than the engine is built for (about ${e.peakTorque} N·m). Cylinder pressures would be damaging.` });
  }
  if (r.overRev) {
    out.push({ tone: 'bad', title: 'Over-revving', text: `Past the ${e.redline} rpm redline. Friction climbs steeply and the valves and pistons struggle to keep up.` });
  }
  if (r.overFuelLimit) {
    out.push({ tone: 'warn', title: 'Over the fuel-flow limit', text: `F1 rules allow at most ${e.fuelFlowLimit(r.rpm).toFixed(0)} kg/h at this speed. Physically possible, but it would get the car disqualified.` });
  }
  if (r.mguK > 0) {
    out.push({ tone: 'info', title: 'Electric assist', text: `The MGU-K motor is adding ${Math.round(r.mguK)} kW straight to the crankshaft, with no extra fuel.` });
  }
  return out;
}
