import { useState } from 'react';

const W = 520, H = 190, M = { l: 44, r: 14, t: 12, b: 26 };
const PW = W - M.l - M.r, PH = H - M.t - M.b;

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  for (const m of [1, 1.5, 2, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function path(points, x, y) {
  let d = '', pen = false;
  for (const p of points) {
    if (p.v == null) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${x(p.rpm).toFixed(1)} ${y(Math.max(0, p.v)).toFixed(1)}`;
    pen = true;
  }
  return d;
}

function Chart({ engine, field, title, unit, current, reference, point, hover, setHover }) {
  const cur = current.map((p) => ({ rpm: p.rpm, v: p.misfire ? null : p[field] }));
  const ref = reference.map((p) => ({ rpm: p.rpm, v: p[field] }));
  const yMax = niceMax(Math.max(...cur.map((p) => p.v ?? 0), ...ref.map((p) => p.v), point[field]) * 1.05);
  const x = (rpm) => M.l + ((rpm - engine.rpmMin) / (engine.rpmMax - engine.rpmMin)) * PW;
  const y = (v) => M.t + PH - (v / yMax) * PH;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const span = engine.rpmMax - engine.rpmMin;
  const step = span > 9000 ? 3000 : 1000;
  const xTicks = [];
  for (let t = Math.ceil(engine.rpmMin / step) * step; t <= engine.rpmMax; t += step) xTicks.push(t);

  const onMove = (ev) => {
    const box = ev.currentTarget.getBoundingClientRect();
    const f = ((ev.clientX - box.left) / box.width) * W;
    const i = Math.round(((f - M.l) / PW) * (current.length - 1));
    setHover(Math.min(current.length - 1, Math.max(0, i)));
  };
  const h = hover != null ? { c: cur[hover], r: ref[hover] } : null;
  const py = y(Math.max(0, point[field]));

  return (
    <div className="chart">
      <h4>{title} <span>{unit}</span></h4>
      <div className="chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
              <text x={M.l - 7} y={y(t) + 3.5} textAnchor="end" className="tick">{Math.round(t)}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="tick">{t / 1000}k</text>
          ))}
          <rect x={x(engine.redline)} y={M.t} width={W - M.r - x(engine.redline)} height={PH} className="redzone" />
          <text x={x(engine.redline) + 3} y={M.t + 10} className="tick red">redline</text>
          <path d={path(ref, x, y)} className="line ref" />
          <path d={path(cur, x, y)} className="line cur" />
          {h && <line x1={x(h.c.rpm)} x2={x(h.c.rpm)} y1={M.t} y2={M.t + PH} className="cross" />}
          <line x1={x(point.rpm)} x2={x(point.rpm)} y1={py} y2={M.t + PH} className="drop" />
          <circle cx={x(point.rpm)} cy={py} r="5.5" className="dot" />
        </svg>
        {h && (
          <div className="tip" style={{ left: `${(x(h.c.rpm) / W) * 100}%`, transform: `translateX(${h.c.rpm > engine.rpmMin + span * 0.6 ? '-108%' : '8%'})` }}>
            <b>{Math.round(h.c.rpm).toLocaleString()} rpm</b>
            <span><i className="sw cur" />Your settings <em>{h.c.v == null ? 'no combustion' : `${Math.round(h.c.v)} ${unit}`}</em></span>
            <span><i className="sw ref" />Full throttle <em>{Math.round(h.r.v)} {unit}</em></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Curves({ engine, current, reference, point, mode }) {
  const [hover, setHover] = useState(null);
  const shared = { engine, current, reference, point, hover, setHover };
  const rows = current.filter((_, i) => i % 8 === 0 || i === current.length - 1);
  return (
    <div className="curves">
      <div className="legend">
        <span><i className="sw cur" />Your settings{mode === 'direct' ? ' (this fuel and air at every speed)' : ' (this pedal position at every speed)'}</span>
        <span><i className="sw ref" />Full throttle, computer-controlled</span>
        <span><i className="sw dot" />Now</span>
      </div>
      <Chart {...shared} field="power" title="Power" unit="kW" />
      <Chart {...shared} field="torque" title="Torque" unit="N·m" />
      <div className="x-title">Engine speed (rpm)</div>
      <details>
        <summary>Show as table</summary>
        <table>
          <thead><tr><th>rpm</th><th>Power kW</th><th>Torque N·m</th><th>Full-throttle kW</th><th>Full-throttle N·m</th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const r = reference[current.indexOf(p)];
              return (
                <tr key={p.rpm}>
                  <td>{Math.round(p.rpm)}</td>
                  <td>{p.misfire ? '—' : Math.round(p.power)}</td>
                  <td>{p.misfire ? '—' : Math.round(p.torque)}</td>
                  <td>{Math.round(r.power)}</td>
                  <td>{Math.round(r.torque)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}
