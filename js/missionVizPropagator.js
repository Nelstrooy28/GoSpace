// NASA Mission Viz-inspired Keplerian 2D-ellipse-to-3D orbit propagator & JSON export
const MU_EARTH = 398600.4418; // km^3 / s^2
const R_EARTH = 6371; // km
const DEG2RAD = Math.PI / 180;
const SUN_DIR = [1, 0, 0];

function solveEccentricAnomaly(meanAnomalyRad, e) {
  const twoPi = Math.PI * 2;
  let M = ((meanAnomalyRad % twoPi) + twoPi) % twoPi;
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 8; k += 1) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    E -= f / Math.max(fp, 1e-8);
  }
  return E;
}

function isPointInShadow(pos) {
  const dotSun = pos[0] * SUN_DIR[0] + pos[1] * SUN_DIR[1] + pos[2] * SUN_DIR[2];
  if (dotSun >= 0) return false;
  const perpSq = pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2] - dotSun * dotSun;
  return perpSq < R_EARTH * R_EARTH;
}

function keplerStateAtAnomaly(elements, trueAnomalyRad) {
  const a = Math.max(elements.aKm || 7000, R_EARTH + 160);
  const e = Math.min(Math.max(elements.e ?? 0.001, 0), 0.985);
  const inc = (elements.iDeg ?? 0) * DEG2RAD;
  const raan = (elements.raanDeg ?? 0) * DEG2RAD;
  const argP = (elements.argPerigeeDeg ?? 0) * DEG2RAD;

  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(trueAnomalyRad));
  const xp = r * Math.cos(trueAnomalyRad);
  const yp = r * Math.sin(trueAnomalyRad);

  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const cw = Math.cos(argP);
  const sw = Math.sin(argP);
  const ci = Math.cos(inc);
  const si = Math.sin(inc);

  const xEci = (cO * cw - sO * sw * ci) * xp + (-cO * sw - sO * cw * ci) * yp;
  const yEci = (sO * cw + cO * sw * ci) * xp + (-sO * sw + cO * cw * ci) * yp;
  const zEci = (sw * si) * xp + (cw * si) * yp;

  // Map ECI (Z-north) into right-handed 3D scene coords (Y-north)
  const position = [xEci, zEci, -yEci];
  const speedKms = Math.sqrt(Math.max(0, MU_EARTH * (2 / r - 1 / a)));
  return { position, radiusKm: r, altitudeKm: r - R_EARTH, speedKms, inEclipse: isPointInShadow(position) };
}

export function computeEclipseFraction(elements, samples = 72) {
  const a = Math.max(elements.aKm || 7000, R_EARTH + 160);
  const e = Math.min(Math.max(elements.e ?? 0.001, 0), 0.985);
  let darkCount = 0;
  for (let k = 0; k < samples; k += 1) {
    const M = (k / samples) * Math.PI * 2;
    const E = solveEccentricAnomaly(M, e);
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    if (keplerStateAtAnomaly({ ...elements, aKm: a, e }, nu).inEclipse) darkCount += 1;
  }
  return Number((darkCount / samples).toFixed(3));
}

export function propagateOrbit(elements, timeSec = 0) {
  const a = Math.max(elements.aKm || 7000, R_EARTH + 160);
  const e = Math.min(Math.max(elements.e ?? 0.001, 0), 0.985);
  const periodSec = 2 * Math.PI * Math.sqrt((a ** 3) / MU_EARTH);
  const meanMotion = (Math.PI * 2) / periodSec;
  const m0 = (elements.meanAnomaly0Deg ?? 0) * DEG2RAD;
  const E = solveEccentricAnomaly(m0 + meanMotion * timeSec, e);
  const trueAnomalyRad = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  const state = keplerStateAtAnomaly(elements, trueAnomalyRad);
  const eclipseFraction = computeEclipseFraction(elements, 60);
  return {
    ...state,
    periodSec,
    eclipseFraction,
    trueAnomalyDeg: ((trueAnomalyRad / DEG2RAD) + 360) % 360
  };
}

export function generateOrbitTrack(elements, steps = 120) {
  const a = Math.max(elements.aKm || 7000, R_EARTH + 160);
  const e = Math.min(Math.max(elements.e ?? 0.001, 0), 0.985);
  const periodSec = 2 * Math.PI * Math.sqrt((a ** 3) / MU_EARTH);
  const points = [];
  let speedSum = 0;
  let darkCount = 0;

  for (let i = 0; i <= steps; i += 1) {
    const tSec = (i / steps) * periodSec;
    const M = (i / steps) * Math.PI * 2;
    const E = solveEccentricAnomaly(M, e);
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const st = keplerStateAtAnomaly({ ...elements, aKm: a, e }, nu);
    points.push({ tSec: Math.round(tSec), position: st.position, speedKms: st.speedKms, inEclipse: st.inEclipse });
    if (i < steps) {
      speedSum += st.speedKms;
      if (st.inEclipse) darkCount += 1;
    }
  }

  return {
    points,
    periodSec,
    apogeeKm: Math.round(a * (1 + e) - R_EARTH),
    perigeeKm: Math.round(a * (1 - e) - R_EARTH),
    eclipseFraction: Number((darkCount / steps).toFixed(3)),
    meanSpeedKms: Number((speedSum / steps).toFixed(2))
  };
}

export function exportMissionVizJSON(missionState, evaluation) {
  const orbitEl = evaluation.orbitElements;
  const track = generateOrbitTrack(orbitEl, 96);
  const payload = {
    schema: 'nasa-mission-viz-compatible-v1',
    app: 'GoSpace',
    exportedAt: new Date().toISOString(),
    scenarioId: missionState.scenarioId,
    cmlLevel: evaluation.cmlLevel,
    cmlLabel: evaluation.cmlLabel,
    pointDesign: {
      segments: { ...missionState },
      metrics: evaluation.metrics,
      warnings: evaluation.warnings,
      mel: evaluation.mel,
      missionMatch: evaluation.missionMatch
    },
    orbitElements: orbitEl,
    orbitSummary: {
      periodMin: Number((track.periodSec / 60).toFixed(1)),
      apogeeKm: track.apogeeKm,
      perigeeKm: track.perigeeKm,
      eclipseFraction: track.eclipseFraction,
      meanSpeedKms: track.meanSpeedKms
    },
    trajectory: track.points.map((pt) => [
      pt.tSec,
      Number(pt.position[0].toFixed(2)),
      Number(pt.position[1].toFixed(2)),
      Number(pt.position[2].toFixed(2))
    ])
  };

  if (typeof document !== 'undefined') {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gospace-mission-viz.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return payload;
}
