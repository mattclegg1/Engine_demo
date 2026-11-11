import { useMemo, useState } from 'react';
import { ENGINES, ENGINE_ORDER, simulate, ecu, sweep, explain } from './engine.js';
import Cylinder from './Cylinder.jsx';
import Curves from './Curves.jsx';

const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');

function Slider({ label, hint, value, unit, min, max, step, onChange, disabled, digits = 0, kind, mark }) {
  const pct = ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100;
  return (
    <label className={`slider ${kind || ''} ${disabled ? 'auto' : ''}`}>
      <span className="slider-top">
        <span className="slider-name">{label}{disabled && <em>set by computer</em>}</span>
        <span className="slider-val">{fmt(value, digits)}<small>{unit}</small></span>
      </span>
      <span className="slider-track">
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
          style={{ '--pct': `${pct}%` }} onChange={(ev) => onChange(Number(ev.target.value))} />
        {mark != null && <i className="mark" style={{ left: `${((mark - min) / (max - min)) * 100}%` }} title="Redline" />}
      </span>
      {hint && <span className="slider-hint">{hint}</span>}
    </label>
  );
}

function MixtureGauge({ engine, r }) {
  const [lo, hi] = engine.lambdaScale;
  const pos = (l) => (Math.log(Math.min(hi, Math.max(lo, l)) / lo) / Math.log(hi / lo)) * 100;
  const [a, b] = engine.lambdaIdeal;
  const words = { nofuel: 'No fuel', flooded: 'Flooded', toolean: 'Too lean to burn', rich: 'Rich', lean: 'Lean', ideal: 'On target' };
  return (
    <div className="mix">
      <div className="mix-head">
        <span className="eyebrow">Air : fuel mixture</span>
        <span className={`mix-word ${r.mixture}`}>{words[r.mixture]}</span>
      </div>
      <div className="mix-num">
        <b>{r.noFuel ? '—' : fmt(r.afr, 1)}</b><span>: 1 by mass</span>
        <i>λ {r.noFuel ? '—' : fmt(r.lambda, 2)}</i>
      </div>
      <div className="mix-bar">
        <span className="mix-ideal" style={{ left: `${pos(a)}%`, width: `${pos(b) - pos(a)}%` }} />
        <span className="mix-stoich" style={{ left: `${pos(1)}%` }} />
        {!r.noFuel && <span className="mix-needle" style={{ left: `${pos(r.lambda)}%` }} />}
      </div>
      <div className="mix-scale"><span>← more fuel (rich)</span><span>more air (lean) →</span></div>
      <p className="fine">Shaded band is where this engine likes to run. The tick marks the chemically exact mix ({engine.stoich} : 1), where every bit of fuel meets exactly enough oxygen.</p>
    </div>
  );
}

function Meter({ label, value, note }) {
  const word = value < 8 ? 'Minimal' : value < 35 ? 'Low' : value < 65 ? 'Moderate' : 'High';
  return (
    <div className="meter">
      <div className="meter-top"><span>{label}</span><b>{word}</b></div>
      <div className="meter-bar"><i style={{ width: `${Math.max(1.5, value)}%` }} /></div>
      <small>{note}</small>
    </div>
  );
}

const Lamp = ({ on, label, glyph }) => (
  <span className={`lamp ${on ? 'on' : ''}`} aria-label={`${label}: ${on ? 'warning' : 'ok'}`}>
    <i aria-hidden="true">{on ? glyph : '○'}</i>{label}
  </span>
);

export default function App() {
  const [engineId, setEngineId] = useState('diesel');
  const engine = ENGINES[engineId];
  const [mode, setMode] = useState('driver');
  const [rpm, setRpm] = useState(engine.defaults.rpm);
  const [throttle, setThrottle] = useState(engine.defaults.throttle);
  const [manual, setManual] = useState({ fuel: 0, air: 0 });
  const [deploy, setDeploy] = useState(0);

  const auto = ecu(engine, rpm, throttle);
  const fuel = mode === 'driver' ? auto.fuel : manual.fuel;
  const air = mode === 'driver' ? auto.air : manual.air;
  const mguK = engine.mguKMax ? deploy : 0;
  const r = simulate(engine, rpm, fuel, air, mguK);

  const pickEngine = (id) => {
    const e = ENGINES[id];
    setEngineId(id);
    setRpm(e.defaults.rpm);
    setThrottle(e.defaults.throttle);
    setManual(ecu(e, e.defaults.rpm, e.defaults.throttle));
    setDeploy(0);
  };
  const pickMode = (m) => {
    if (m === 'direct' && mode !== 'direct') setManual({ fuel: auto.fuel, air: auto.air });
    setMode(m);
  };

  const reference = useMemo(
    () => sweep(engine, (n) => { const c = ecu(engine, n, 1); return simulate(engine, n, c.fuel, c.air, mguK); }),
    [engine, mguK],
  );
  const current = useMemo(
    () => sweep(engine, (n) => {
      const c = mode === 'driver' ? ecu(engine, n, throttle) : { fuel, air };
      return simulate(engine, n, c.fuel, c.air, mguK);
    }),
    [engine, mode, throttle, fuel, air, mguK],
  );

  const notes = explain(engine, r, mode);
  const diesel = engine.ignition === 'ci';
  const boost = r.map - 1;

  return (
    <div className="page">
      <header className="mast">
        <div>
          <p className="eyebrow">Workshop manual · combustion test bench</p>
          <h1>Engine Lab</h1>
        </div>
        <p className="lede">Pick an engine, then change how fast it spins and how much fuel and air it gets. Watch what happens to power, efficiency and what comes out of the exhaust.</p>
      </header>

      <nav className="engines" aria-label="Choose an engine">
        {ENGINE_ORDER.map((id, i) => {
          const e = ENGINES[id];
          return (
            <button key={id} className={id === engineId ? 'on' : ''} onClick={() => pickEngine(id)} aria-pressed={id === engineId}>
              <span className="eng-no">0{i + 1}</span>
              <span className="eng-short">{e.short}</span>
              <span className="eng-name">{e.name}</span>
              <span className="eng-tag">{e.tag}</span>
            </button>
          );
        })}
      </nav>

      <main className="bench">
        <section className="panel controls">
          <h2><span>Fig. 1</span>Controls</h2>
          <div className="modes" role="tablist">
            <button role="tab" aria-selected={mode === 'driver'} className={mode === 'driver' ? 'on' : ''} onClick={() => pickMode('driver')}>
              Driver<small>pedal + computer</small>
            </button>
            <button role="tab" aria-selected={mode === 'direct'} className={mode === 'direct' ? 'on' : ''} onClick={() => pickMode('direct')}>
              Direct<small>you set fuel + air</small>
            </button>
          </div>
          <p className="fine mode-note">
            {mode === 'driver'
              ? 'You press the pedal; the engine computer chooses safe fuel and air, as in a real car.'
              : 'The computer is switched off. Set fuel and air to anything you like, including mixtures that will not burn.'}
          </p>

          <Slider label="Engine speed" unit="rpm" value={rpm} min={engine.rpmMin} max={engine.rpmMax} step={engine.rpmStep}
            onChange={setRpm} kind="rpm" mark={engine.redline} hint={`Idle ${fmt(engine.idle)} · redline ${fmt(engine.redline)}`} />
          {mode === 'driver' && (
            <Slider label="Accelerator pedal" unit="%" value={Math.round(throttle * 100)} min={0} max={100} step={1}
              onChange={(v) => setThrottle(v / 100)} kind="pedal" />
          )}
          <Slider label="Fuel flow" unit="kg/h" digits={1} value={fuel} min={0} max={engine.fuelMax} step={engine.fuelMax / 260}
            onChange={(v) => setManual((m) => ({ ...m, fuel: v }))} disabled={mode === 'driver'} kind="fuel"
            hint={`≈ ${fmt(fuel / (diesel ? 0.835 : 0.745), 1)} litres an hour`} />
          <Slider label="Air flow" unit="kg/h" value={air} min={0} max={engine.airMax} step={engine.airMax / 280}
            onChange={(v) => setManual((m) => ({ ...m, air: v }))} disabled={mode === 'driver'} kind="air"
            hint={r.airLimited ? `Engine can only take in ${fmt(r.cap)} kg/h at this speed` : `Engine could take up to ${fmt(r.cap)} kg/h at this speed`} />
          {engine.mguKMax && (
            <Slider label="Electric assist (MGU-K)" unit="kW" value={deploy} min={0} max={engine.mguKMax} step={5} onChange={setDeploy} kind="elec"
              hint="Battery power added to the crankshaft" />
          )}

          <div className="spec">
            <p>{engine.blurb}</p>
            <dl>
              <div><dt>Capacity</dt><dd>{engine.displacement.toFixed(1)} L</dd></div>
              <div><dt>Cylinders</dt><dd>{engine.cylinders}</dd></div>
              <div><dt>Ignition</dt><dd>{diesel ? 'Compression' : 'Spark'}</dd></div>
              <div><dt>Fuel</dt><dd>{diesel ? 'Diesel' : 'Petrol'}</dd></div>
            </dl>
          </div>
        </section>

        <section className="panel live">
          <h2><span>Fig. 2</span>Inside one cylinder</h2>
          <div className="live-grid">
            <Cylinder engine={engine} result={r} />
            <div className="readouts">
              <div className="hero">
                <span className="eyebrow">Power at the crankshaft</span>
                <div className="hero-num">{fmt(r.power, Math.abs(r.power) < 20 ? 1 : 0)}<small>kW</small></div>
                <span className="hero-sub">
                  {r.power < 0 ? 'Absorbing power: the engine is being driven' : `${fmt(r.power * 1.341)} horsepower`}
                  {mguK > 0 && ` · ${fmt(r.icePower)} engine + ${fmt(mguK)} electric`}
                </span>
              </div>
              <div className="stats">
                <div><span>Torque</span><b>{fmt(r.torque)}<small>N·m</small></b></div>
                <div><span>Efficiency</span><b>{fmt(r.efficiency * 100)}<small>%</small></b></div>
                <div><span>{boost >= 0.05 ? 'Turbo boost' : 'Intake vacuum'}</span><b>{fmt(Math.abs(boost), 2)}<small>bar</small></b></div>
                <div><span>Exhaust gas</span><b>{fmt(r.egt)}<small>°C</small></b></div>
              </div>
              <MixtureGauge engine={engine} r={r} />
            </div>
          </div>
        </section>

        <section className="panel story">
          <h2><span>Fig. 3</span>What is happening</h2>
          <div className="lamps">
            <Lamp on={r.misfire} label="Misfire" glyph="✕" />
            {diesel ? <Lamp on={r.emissions.soot > 45} label="Black smoke" glyph="●" /> : <Lamp on={r.knock} label="Knock" glyph="!" />}
            <Lamp on={r.overTemp} label="Overheat" glyph="▲" />
            <Lamp on={r.overStress} label="Overload" glyph="!" />
            <Lamp on={r.overRev} label="Over-rev" glyph="▲" />
            <Lamp on={r.burning && r.stalling} label="Stalling" glyph="▼" />
            {engine.fuelFlowLimit && <Lamp on={r.overFuelLimit} label="Fuel limit" glyph="!" />}
          </div>
          <ul className="notes">
            {notes.map((n) => (
              <li key={n.title} className={n.tone}><b>{n.title}</b>{n.text}</li>
            ))}
          </ul>
        </section>

        <section className="panel plots">
          <h2><span>Fig. 4</span>Across the rev range</h2>
          <Curves engine={engine} current={current} reference={reference} point={r} mode={mode} />
        </section>

        <section className="panel exhaust">
          <h2><span>Fig. 5</span>Out of the tailpipe</h2>
          <div className="meters">
            <Meter label="Soot" value={r.emissions.soot} note="Black smoke: fuel that ran out of oxygen mid-burn." />
            <Meter label="Nitrogen oxides (NOx)" value={r.emissions.nox} note="Formed when combustion is hot with oxygen to spare." />
            <Meter label="Carbon monoxide" value={r.emissions.co} note="Half-burnt fuel from a rich mixture." />
            <Meter label="Unburnt fuel" value={r.emissions.hc} note="Fuel that never caught fire at all." />
          </div>
          <p className="fine">Relative levels leaving the cylinder, before any catalytic converter or particulate filter cleans them up.</p>
        </section>
      </main>

      <footer className="foot">A simplified teaching model. Figures are representative of each engine type, not measurements of a specific engine.</footer>
    </div>
  );
}
