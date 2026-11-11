import { useEffect, useRef, useState } from 'react';

const CX = 130, CY = 300, R = 42, ROD = 115, ROOF = 100;
const STROKES = ['Intake', 'Compression', 'Power', 'Exhaust'];

function flame(engine, r) {
  if (!r.burning) return null;
  if (engine.ignition === 'ci') return r.lambda < 1.2 ? '#b8501a' : '#f2a03d';
  if (r.lambda < 0.9) return '#f0a030';
  if (r.lambda > 1.25) return '#9bb6ee';
  return '#4ea2f2';
}

export default function Cylinder({ engine, result }) {
  const [theta, setTheta] = useState(40);
  const live = useRef({ engine, result });
  live.current = { engine, result };

  useEffect(() => {
    const slow = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0.25 : 1;
    let raf, last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { engine: e, result: r } = live.current;
      const revs = (0.45 + 2.3 * ((r.rpm - e.rpmMin) / (e.rpmMax - e.rpmMin))) * slow;
      setTheta((t) => (t + dt * revs * 360) % 720);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const e = engine, r = result;
  const a = (theta * Math.PI) / 180;
  const pinY = CY - (R * Math.cos(a) + Math.sqrt(ROD * ROD - (R * Math.sin(a)) ** 2));
  const top = pinY - 32;
  const crankX = CX + R * Math.sin(a), crankY = CY - R * Math.cos(a);
  const stroke = Math.floor(theta / 180);
  const prog = (theta % 180) / 180;
  const inLift = stroke === 0 ? Math.sin(prog * Math.PI) * 13 : 0;
  const exLift = stroke === 3 ? Math.sin(prog * Math.PI) * 13 : 0;

  const fl = flame(e, r);
  const soot = r.emissions.soot / 100;
  const boost = Math.min(r.map, 4);
  let gas = 'transparent';
  if (stroke === 0) gas = `rgba(31,120,180,${0.06 + 0.07 * boost * prog})`;
  else if (stroke === 1) gas = `rgba(31,120,180,${0.06 + 0.07 * boost + 0.25 * prog})`;
  else if (stroke === 2) gas = fl ? fl : `rgba(31,120,180,${0.3 * (1 - prog)})`;
  else gas = `rgba(${Math.round(120 - 90 * soot)},${Math.round(115 - 90 * soot)},${Math.round(105 - 85 * soot)},${(0.18 + 0.6 * soot) * (r.burning || r.misfire ? 1 : 0.2)})`;
  const gasOpacity = stroke === 2 && fl ? (0.4 + 0.6 * r.load) * (1 - 0.72 * prog) : 1;

  const firing = theta > 348 && theta < 378 && !r.noFuel;
  const slowMo = r.rpm / 60 / (0.45 + 2.3 * ((r.rpm - e.rpmMin) / (e.rpmMax - e.rpmMin)));

  return (
    <div className="cyl">
      <svg viewBox="0 0 260 372" role="img" aria-label={`Animated cylinder, ${STROKES[stroke]} stroke`}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="hatch-line" />
          </pattern>
        </defs>

        {/* ports */}
        <path d="M22 50 H88 Q112 50 112 78 V100 H84 V84 Q84 74 74 74 H22 Z" className="port" />
        <path d="M238 50 H172 Q148 50 148 78 V100 H176 V84 Q176 74 186 74 H238 Z" className="port" />
        {stroke === 0 && (
          <path d="M22 50 H88 Q112 50 112 78 V100 H84 V84 Q84 74 74 74 H22 Z" fill={`rgba(31,120,180,${0.1 + 0.1 * boost})`} />
        )}
        {stroke === 3 && (
          <path d="M238 50 H172 Q148 50 148 78 V100 H176 V84 Q176 74 186 74 H238 Z" fill={gas} />
        )}
        <text x="24" y="42" className="cyl-lab">AIR IN</text>
        <text x="236" y="42" className="cyl-lab" textAnchor="end">EXHAUST</text>
        {stroke === 0 && <path d={`M${30 + prog * 30} 62 h16 m-5 -4 l5 4 l-5 4`} className="flow in" />}
        {stroke === 3 && <path d={`M${190 + prog * 26} 62 h16 m-5 -4 l5 4 l-5 4`} className="flow" />}

        {/* block */}
        <rect x="62" y="100" width="18" height="150" fill="url(#hatch)" className="wall" />
        <rect x="180" y="100" width="18" height="150" fill="url(#hatch)" className="wall" />
        <path d="M80 100 V250 M180 100 V250 M84 100 H176" className="ink" />

        {/* gas */}
        <rect x="81" y={ROOF} width="98" height={Math.max(0, top - ROOF)} fill={gas} opacity={gasOpacity} />

        {/* valves */}
        <g className="valve">
          <path d={`M98 ${22 + inLift} V${ROOF + inLift} M84 ${ROOF + inLift} H112`} />
          <path d={`M162 ${22 + exLift} V${ROOF + exLift} M148 ${ROOF + exLift} H176`} />
        </g>

        {/* spark plug / injector */}
        <path d="M130 20 V70" className="lead" /><path d="M126 70 h8 v22 l-2 8 h-4 l-2 -8 Z" className="plug" />
        <text x="130" y="15" className="cyl-lab" textAnchor="middle">{e.ignition === 'ci' ? 'INJECTOR' : 'SPARK'}</text>
        {firing && e.ignition === 'si' && (
          <path d="M130 102 l-7 6 l8 1 l-6 8 l11 -7 l-7 -2 l6 -6 Z" className={r.burning ? 'spark' : 'spark dud'} />
        )}
        {firing && e.ignition === 'ci' && (
          <path d="M130 101 l-22 12 M130 101 l-10 16 M130 101 l10 16 M130 101 l22 12" className="spray" />
        )}

        {/* crankcase */}
        <path d="M62 250 H80 M180 250 H198 M62 250 Q46 258 46 300 Q46 356 130 356 Q214 356 214 300 Q214 258 198 250" className="ink case" />
        <circle cx={CX} cy={CY} r={R} className="orbit" />

        {/* rod, crank, piston */}
        <line x1={CX} y1={pinY} x2={crankX} y2={crankY} className="rod" />
        <line x1={CX} y1={CY} x2={crankX} y2={crankY} className="crank" />
        <circle cx={CX} cy={CY} r="7" className="journal" />
        <circle cx={crankX} cy={crankY} r="6" className="journal" />
        <rect x="82" y={top} width="96" height="50" rx="3" className="piston" />
        <path d={`M82 ${top + 8} H178 M82 ${top + 14} H178`} className="ring" />
        <circle cx={CX} cy={pinY} r="5" className="journal" />
      </svg>

      <ol className="strokes">
        {STROKES.map((s, i) => (
          <li key={s} className={i === stroke ? 'on' : ''}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="fine">Shown about {slowMo < 10 ? slowMo.toFixed(1) : Math.round(slowMo)}× slower than real life. At {Math.round(r.rpm).toLocaleString()} rpm each cylinder fires {(r.rpm / 120).toFixed(0)} times a second.</p>
    </div>
  );
}
