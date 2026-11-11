# Engine Lab

An interactive test bench for exploring how RPM, fuel flow and air flow affect a combustion engine.

Three engines: a 2.0 L turbo diesel, a 1.6 L V6 turbo-hybrid Formula One power unit and a 1.0 L economy petrol.

```bash
npm install
npm run dev     # start the app
npm test        # sanity-check the engine model
npm run build   # production build in dist/
```

- `src/engine.js` — the engine model (specs, combustion, ECU, commentary). Simplified physics tuned for plausibility, not calibration data.
- `src/App.jsx` — layout, controls, readouts.
- `src/Cylinder.jsx` — animated four-stroke cylinder.
- `src/Curves.jsx` — power and torque charts.
