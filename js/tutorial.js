import { svgIcon } from './icons.js';
import { playEquip, playHover, playVictoryFanfare } from './sfx.js';

let active = false;
let step = 1;
let cmlCelebrated = false;
let passSought = false;
let warpDroppedForLos = false;
let completed = false;
let lastTargetEl = null;
let lastHighlightKey = '';
let rafId = 0;
let cb = null;

let rootEl = null;
let spotlightEl = null;
let arrowSvg = null;
let arrowPath = null;
let arrowHead = null;
let coachCard = null;
let completeToast = null;

let resizeHandler = null;
let keyHandler = null;
let clickCaptureHandler = null;

const TOTAL_STEPS = 7;

function ensureDom() {
  if (rootEl) return;
  rootEl = document.createElement('div');
  rootEl.id = 'tutorial-root';
  rootEl.className = 'tut-root';
  rootEl.hidden = true;

  rootEl.innerHTML = `
    <div id="tut-spotlight" class="tut-spotlight" aria-hidden="true">
      <span class="tut-corner tl"></span>
      <span class="tut-corner tr"></span>
      <span class="tut-corner bl"></span>
      <span class="tut-corner br"></span>
    </div>
    <svg id="tut-arrow-svg" class="tut-arrow-svg" aria-hidden="true">
      <defs>
        <linearGradient id="tutArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#a78bfa" />
        </linearGradient>
      </defs>
      <path id="tut-arrow-path" class="tut-arrow-path" d="" fill="none" stroke="url(#tutArrowGrad)" stroke-width="3" stroke-linecap="round" />
      <polygon id="tut-arrow-head" class="tut-arrow-head" points="0,0 0,0 0,0" fill="#a78bfa" />
    </svg>
    <aside id="tut-coach-card" class="tut-card plate" role="dialog" aria-live="polite" aria-label="Flight Academy Coach">
      <div class="tut-card-head">
        <div class="tut-avatar-wrap">
          <svg class="tut-avatar" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="19" fill="#0b1d3d" stroke="#38bdf8" stroke-width="2" />
            <circle class="tut-visor-pulse" cx="22" cy="22" r="14" fill="none" stroke="#5ee7ff" stroke-width="1.5" stroke-dasharray="5 4" />
            <rect x="12" y="15" width="20" height="11" rx="5" fill="#0284c7" stroke="#bae6fd" stroke-width="1.5" />
            <path d="M16 19 Q22 17 28 19" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" />
            <path d="M13 31 Q22 27 31 31" fill="none" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" />
          </svg>
          <div>
            <div id="tut-step-label" class="tut-step-label">FLIGHT ACADEMY // STEP 1 OF 7</div>
            <div id="tut-step-dots" class="tut-step-dots"></div>
          </div>
        </div>
        <button id="tut-skip-btn" class="btn-sci tut-skip-btn" type="button">${svgIcon('skip')} Skip <span class="keycap">ESC</span></button>
      </div>
      <h3 id="tut-headline" class="tut-headline"></h3>
      <p id="tut-prompt" class="tut-prompt"></p>
      <div id="tut-tip" class="tut-tip"></div>
      <div class="tut-actions">
        <button id="tut-assist-btn" class="btn-sci active cta-btn tut-assist-btn" type="button">Auto-Select / Next ${svgIcon('chevron-right')}</button>
      </div>
    </aside>
    <div id="tut-complete-toast" class="tut-toast plate" hidden>
      <div class="tut-toast-badge">ACADEMY COMPLETE</div>
      <h3>FLIGHT CERTIFIED</h3>
      <p>WildFireSat CML-4 configured, launched to polar LEO, and downlinked live thermal science.</p>
      <div class="btn-row">
        <button id="tut-done-debrief" class="btn-sci active" type="button">View Debrief</button>
        <button id="tut-done-orbit" class="btn-sci" type="button">Keep Flying</button>
        <button id="tut-done-home" class="btn-sci" type="button">Main Menu</button>
      </div>
    </div>
  `;

  document.body.appendChild(rootEl);
  spotlightEl = document.getElementById('tut-spotlight');
  arrowSvg = document.getElementById('tut-arrow-svg');
  arrowPath = document.getElementById('tut-arrow-path');
  arrowHead = document.getElementById('tut-arrow-head');
  coachCard = document.getElementById('tut-coach-card');
  completeToast = document.getElementById('tut-complete-toast');

  document.getElementById('tut-skip-btn').addEventListener('click', () => {
    playHover();
    stopTutorial();
  });
  document.getElementById('tut-assist-btn').addEventListener('click', handleAssist);
  document.getElementById('tut-done-debrief').addEventListener('click', () => {
    playEquip();
    stopTutorial();
    cb?.goToStage('review');
  });
  document.getElementById('tut-done-orbit').addEventListener('click', () => {
    playEquip();
    stopTutorial();
  });
  document.getElementById('tut-done-home').addEventListener('click', () => {
    playEquip();
    stopTutorial();
    cb?.returnHome();
  });
}

function flashGauges() {
  const g = document.getElementById('resource-gauges');
  if (!g) return;
  g.classList.remove('tut-gauge-flash');
  void g.offsetWidth;
  g.classList.add('tut-gauge-flash');
  setTimeout(() => g.classList.remove('tut-gauge-flash'), 1200);
}

function getStepDescriptor(ctx) {
  const { stage, activeSegment, activeSub, lastEval, launchTelemetry, orbitTelemetry } = ctx;
  const cml = lastEval?.cmlLevel || 1;

  if (step === 1) {
    let target = '#equipment-strip [data-id="wildfire-ir"]';
    if (activeSegment !== 'user') target = '#segment-tabs [data-segment="user"]';
    else if (activeSub !== 'obj') target = '#sub-pills [data-sub="obj"]';
    return {
      target,
      mode: 'backdrop',
      headline: 'Lock Mission Science Goal',
      prompt: 'Click the Wildfire Thermal Mapping card to confirm our 575km Sun-Synchronous Infrared wildfire watch objective.',
      tip: 'Why it matters: Target wavelength rules dictate which sensors, solar power, and orbits stay valid at Flight Readiness.',
      assistLabel: 'Next Step',
    };
  }

  if (step === 2) {
    if (activeSegment !== 'space') {
      return {
        target: '#segment-tabs [data-segment="space"]',
        mode: 'backdrop',
        headline: 'Open Sat Bus & Payload',
        prompt: 'Click the Sat Bus & Payload segment tab to inspect instruments mounted on our 6U CubeSat.',
        tip: 'Why it matters: Bus payload capacity and wavelength compatibility work together as one coupled system.',
        assistLabel: 'Auto-Select Payload',
      };
    }
    if (activeSub !== 'inst') {
      return {
        target: '#sub-pills [data-sub="inst"]',
        mode: 'backdrop',
        headline: 'Select Payload Category',
        prompt: 'Click the Payload sub-tab to browse compatible thermal science instruments.',
        tip: 'Why it matters: Every instrument must match the mission band (Thermal IR) and fit inside the 6U mass limit.',
        assistLabel: 'Auto-Select Payload',
      };
    }
    return {
      target: '#equipment-strip [data-id="ir-bolometer"]',
      mode: 'backdrop',
      headline: 'Mount Thermal IR Sensor',
      prompt: 'Equip the Un-cooled IR Microbolometer card onto the 3D spacecraft to hit 100% wildfire science return.',
      tip: 'Why it matters: Pairing the primary bolometer with the Arctic radiometer maximizes thermal hotspot detection.',
      assistLabel: 'Auto-Select Payload',
    };
  }

  if (step === 3) {
    if (activeSegment !== 'space') {
      return {
        target: '#segment-tabs [data-segment="space"]',
        mode: 'backdrop',
        headline: 'Balance Spacecraft Power',
        prompt: 'Open Sat Bus & Payload so we can upgrade the solar panels for Earth eclipse survival.',
        tip: 'Why it matters: Body-mounted panels run a negative power margin across 32% orbital eclipse.',
        assistLabel: 'Auto-Select Solar',
      };
    }
    if (activeSub !== 'solar') {
      return {
        target: '#sub-pills [data-sub="solar"]',
        mode: 'backdrop',
        headline: 'Check Power & Select Solar',
        prompt: 'Your Power gauge is red! Click the Solar sub-tab to view higher-output deployable solar arrays.',
        tip: 'Why it matters: Positive eclipse power margin keeps batteries charged and science sensors online.',
        assistLabel: 'Auto-Select Solar',
      };
    }
    return {
      target: '#equipment-strip [data-id="deployable-wings"]',
      mode: 'backdrop',
      headline: 'Deploy GaAs Solar Wings',
      prompt: 'Select Deployable GaAs Wings (68W) to flip the bottom Power gauge green while staying light on Mass.',
      tip: 'Why it matters: Solar wings unfold in orbit, tripling watt generation for just +2.2 kg over body panels.',
      assistLabel: 'Auto-Select Solar',
    };
  }

  if (step === 4) {
    if (activeSegment !== 'launch') {
      return {
        target: '#segment-tabs [data-segment="launch"]',
        mode: 'backdrop',
        headline: 'Match Rocket & Budget',
        prompt: 'Budget exceeds the $24M cap. Click 03 Launch to swap down from Falcon 9 rideshare.',
        tip: 'Why it matters: Choosing a right-sized launcher keeps small missions profitable without wasting payload capacity.',
        assistLabel: 'Auto-Select Rocket',
      };
    }
    if (activeSub !== 'veh') {
      return {
        target: '#sub-pills [data-sub="veh"]',
        mode: 'backdrop',
        headline: 'Open Launch Vehicles',
        prompt: 'Select the Rocket sub-tab to compare payload limits and launch costs.',
        tip: 'Why it matters: Our 15.9 kg CubeSat easily fits inside dedicated small-lift rockets.',
        assistLabel: 'Auto-Select Rocket',
      };
    }
    return {
      target: '#equipment-strip [data-id="electron"]',
      mode: 'backdrop',
      headline: 'Select Rocket Lab Electron',
      prompt: 'Choose Rocket Lab Electron ($7.5M, 300kg max) to bring your mission Budget safely green under $24M.',
      tip: 'Why it matters: Electron delivers dedicated Sun-Synchronous LEO insertion ideal for afternoon wildfire passes.',
      assistLabel: 'Auto-Select Rocket',
    };
  }

  if (step === 5) {
    if (cml < 4) {
      if (activeSegment !== 'ground') {
        return {
          target: '#segment-tabs [data-segment="ground"]',
          mode: 'backdrop',
          headline: 'Upgrade Downlink Comms',
          prompt: 'Data rate is bottlenecked. Click 04 Comms to upgrade your radio transceiver.',
          tip: 'Why it matters: High-resolution thermal maps generate 1,500 MB/day—too fast for slow UHF beacons.',
          assistLabel: 'Auto-Equip Comms',
        };
      }
      if (activeSub !== 'tx') {
        return {
          target: '#sub-pills [data-sub="tx"]',
          mode: 'backdrop',
          headline: 'Open Radio Transceivers',
          prompt: 'Click the Transceiver sub-tab to install a high-speed RF downlink.',
          tip: 'Why it matters: Ground station pass windows only last minutes—higher Mbps clears onboard buffers quickly.',
          assistLabel: 'Auto-Equip Comms',
        };
      }
      return {
        target: '#equipment-strip [data-id="sx-band"]',
        mode: 'backdrop',
        headline: 'Equip S/X-Band Transceiver',
        prompt: 'Select S/X-Band High-Rate Transceiver (45 Mbps) to unlock CML 4 Launch Clearance!',
        tip: 'Why it matters: Reaching green across all 6 gauges promotes your build to Verified Point Design (CML 4).',
        assistLabel: 'Auto-Equip Comms',
      };
    }
    return {
      target: '#launch-cta-btn',
      mode: 'backdrop',
      headline: 'CML 4 Clearance Unlocked!',
      prompt: 'All 6 gauges are green! Click Roll Out to move your rocket onto Launchpad 39G.',
      tip: 'Why it matters: Only CML 4 designs achieve full Flight Readiness before orbital rollout.',
      assistLabel: 'Roll Out To Pad',
    };
  }

  if (step === 6) {
    if (stage !== 'launch') {
      return {
        target: '#launch-cta-btn',
        mode: 'backdrop',
        headline: 'Roll Out To Pad',
        prompt: 'Click Roll Out to enter the 3D coastal launch complex.',
        tip: 'Why it matters: Pre-launch hold-down clamps stabilize thrust until T-0 ignition.',
        assistLabel: 'Roll Out To Pad',
      };
    }
    const armed = !launchTelemetry || launchTelemetry.armed;
    if (armed) {
      return {
        target: '#lch-ignite-btn',
        mode: 'backdrop',
        headline: 'Ignite Rocket Engines',
        prompt: 'Click IGNITE [SPACE] (or press Spacebar) to launch into Sun-Synchronous LEO.',
        tip: 'Why it matters: Umbilical swing arms retract at T-0 as full throttle clears the steel launch tower.',
        assistLabel: 'Ignite Now',
      };
    }
    return {
      target: '#stage-hud [data-lcam="hull"]',
      mode: 'clear',
      headline: 'Ascent & Fairing Separation',
      prompt: 'Liftoff! Click Hull Cam to inspect fairing separation above the cloud deck, or ride smoothly into orbit.',
      tip: 'Why it matters: Upper stages jettison protective fairings above the atmosphere to deploy your 3D CubeSat.',
      assistLabel: 'Continue to Orbit',
    };
  }

  if (step === 7) {
    if (stage !== 'orbit') {
      return {
        target: '#stage-switcher [data-stage="orbit"]',
        mode: 'backdrop',
        headline: 'Enter Orbit Operations',
        prompt: 'Switch to 03 ORBIT to command live ground station passes.',
        tip: 'Why it matters: Orbital ops combine real-time attitude, solar power, and RF line-of-sight links.',
        assistLabel: 'Enter Orbit',
      };
    }
    if (!orbitTelemetry?.inLineOfSight) {
      return {
        target: '#orbit-telem',
        mode: 'clear',
        headline: 'Approaching Ground Radar Cone',
        prompt: 'Orbital speed is boosted cleanly toward the glowing green Arctic Polar Station cone—get ready to transmit!',
        tip: 'Why it matters: Ground stations only lock RF signals while the satellite rises above the horizon cone.',
        assistLabel: 'Next / Force Pass',
      };
    }
    return {
      target: '#orb-transmit-btn',
      mode: 'backdrop',
      headline: 'Beam Live Data Down',
      prompt: 'Line-of-sight locked at 1x speed! Click [SPC] DOWNLINK (or press Spacebar) to transmit science data.',
      tip: 'Why it matters: Executing passes on schedule converts onboard storage into science score before the next orbit.',
      assistLabel: 'Transmit Data Now',
    };
  }

  return null;
}

function updateCoachContent(desc) {
  if (!desc) return;
  const key = `${step}:${desc.headline}:${desc.target}`;
  if (key === lastHighlightKey) return;
  lastHighlightKey = key;

  document.getElementById('tut-step-label').textContent = `FLIGHT ACADEMY // STEP ${step} OF ${TOTAL_STEPS}`;
  document.getElementById('tut-step-dots').innerHTML = Array.from({ length: TOTAL_STEPS }, (_, idx) => {
    const n = idx + 1;
    const cls = n < step ? 'done' : (n === step ? 'active' : '');
    return `<span class="tut-dot ${cls}"></span>`;
  }).join('');
  document.getElementById('tut-headline').textContent = desc.headline;
  document.getElementById('tut-prompt').textContent = desc.prompt;
  document.getElementById('tut-tip').textContent = desc.tip;
  const assistText = (desc.assistLabel || 'Auto-Select / Next').replace(/\s*→\s*$/, '');
  document.getElementById('tut-assist-btn').innerHTML = `${assistText} ${svgIcon('chevron-right')}`;

  const targetEl = document.querySelector(desc.target);
  if (targetEl && targetEl !== lastTargetEl) {
    lastTargetEl = targetEl;
    targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

function rectsOverlap(a, b, pad = 12) {
  return !(a.right + pad < b.left || a.left - pad > b.right || a.bottom + pad < b.top || a.top - pad > b.bottom);
}

function chooseCardPosition(targetRect, cardW, cardH) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const margin = 16, gap = 24;
  const clampX = (x) => Math.max(margin, Math.min(vw - cardW - margin, x));
  const clampY = (y) => Math.max(62, Math.min(vh - cardH - margin, y));

  const cx = targetRect.left + targetRect.width * 0.5;
  const cy = targetRect.top + targetRect.height * 0.5;

  const candidates = [
    { x: clampX(cx - cardW * 0.5), y: targetRect.top - cardH - gap },
    { x: clampX(cx - cardW * 0.5), y: targetRect.bottom + gap },
    { x: targetRect.left - cardW - gap, y: clampY(cy - cardH * 0.5) },
    { x: targetRect.right + gap, y: clampY(cy - cardH * 0.5) },
    { x: margin, y: 112 },
    { x: margin, y: vh - cardH - margin },
  ];

  for (const c of candidates) {
    const x = clampX(c.x), y = clampY(c.y);
    const box = { left: x, top: y, right: x + cardW, bottom: y + cardH };
    if (!rectsOverlap(box, targetRect, 14)) return { x, y };
  }
  return { x: clampX(candidates[4].x), y: clampY(candidates[4].y) };
}

function drawPointerArrow(cardRect, targetRect) {
  const cX = cardRect.left + cardRect.width * 0.5;
  const cY = cardRect.top + cardRect.height * 0.5;
  const tX = targetRect.left + targetRect.width * 0.5;
  const tY = targetRect.top + targetRect.height * 0.5;

  const sx = Math.max(cardRect.left, Math.min(cardRect.right, tX));
  const sy = Math.max(cardRect.top, Math.min(cardRect.bottom, tY));
  const ex = Math.max(targetRect.left, Math.min(targetRect.right, cX));
  const ey = Math.max(targetRect.top, Math.min(targetRect.bottom, cY));

  const dx = ex - sx, dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 12) {
    arrowPath.setAttribute('d', '');
    arrowHead.setAttribute('points', '0,0 0,0 0,0');
    return;
  }

  const ux = dx / len, uy = dy / len;
  const endX = ex - ux * 6, endY = ey - uy * 6;
  const ctrlX = (sx + endX) * 0.5 - uy * Math.min(32, len * 0.14);
  const ctrlY = (sy + endY) * 0.5 + ux * Math.min(32, len * 0.14);

  arrowPath.setAttribute('d', `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`);

  const tipAng = Math.atan2(endY - ctrlY, endX - ctrlX);
  const headLen = 12, wing = 0.48;
  const p1x = endX - Math.cos(tipAng - wing) * headLen;
  const p1y = endY - Math.sin(tipAng - wing) * headLen;
  const p2x = endX - Math.cos(tipAng + wing) * headLen;
  const p2y = endY - Math.sin(tipAng + wing) * headLen;
  arrowHead.setAttribute('points', `${endX.toFixed(1)},${endY.toFixed(1)} ${p1x.toFixed(1)},${p1y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}`);
}

function positionFrame() {
  if (!active || !cb || completed) return;
  const ctx = cb.getContext();
  if (ctx.titleOpen) {
    stopTutorial();
    return;
  }

  const desc = getStepDescriptor(ctx);
  if (!desc) return;
  updateCoachContent(desc);

  const el = document.querySelector(desc.target);
  const elStyle = el ? getComputedStyle(el) : null;
  const visible = Boolean(el && !el.hidden && el.getClientRects().length > 0 && elStyle.display !== 'none' && elStyle.visibility !== 'hidden');

  spotlightEl.classList.toggle('is-clear', desc.mode === 'clear');

  if (visible) {
    const r = el.getBoundingClientRect();
    const pad = 7;
    const spotRect = {
      left: Math.max(2, r.left - pad),
      top: Math.max(2, r.top - pad),
      width: Math.max(24, r.width + pad * 2),
      height: Math.max(24, r.height + pad * 2),
    };
    spotRect.right = spotRect.left + spotRect.width;
    spotRect.bottom = spotRect.top + spotRect.height;

    spotlightEl.hidden = false;
    spotlightEl.style.left = `${spotRect.left}px`;
    spotlightEl.style.top = `${spotRect.top}px`;
    spotlightEl.style.width = `${spotRect.width}px`;
    spotlightEl.style.height = `${spotRect.height}px`;

    const cW = coachCard.offsetWidth || 380;
    const cH = coachCard.offsetHeight || 220;
    const pos = chooseCardPosition(spotRect, cW, cH);
    coachCard.style.left = `${pos.x}px`;
    coachCard.style.top = `${pos.y}px`;

    const cardRect = { left: pos.x, top: pos.y, right: pos.x + cW, bottom: pos.y + cH, width: cW, height: cH };
    drawPointerArrow(cardRect, spotRect);
  } else {
    spotlightEl.hidden = true;
    arrowPath.setAttribute('d', '');
    arrowHead.setAttribute('points', '0,0 0,0 0,0');
    coachCard.style.left = '22px';
    coachCard.style.top = '112px';
  }
}

function tick() {
  if (!active || completed) return;
  positionFrame();
  rafId = requestAnimationFrame(tick);
}

function advanceTo(nextStep) {
  step = nextStep;
  lastHighlightKey = '';
  lastTargetEl = null;
  playEquip();
  if (step === 3) flashGauges();
  if (step === 7) {
    passSought = false;
    warpDroppedForLos = false;
  }
  notifyTutorialState();
}

function finishAcademy() {
  if (completed) return;
  completed = true;
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  spotlightEl.hidden = true;
  arrowSvg.hidden = true;
  coachCard.hidden = true;
  completeToast.hidden = false;
  playVictoryFanfare();
}

function handleAssist() {
  if (!active || !cb) return;
  const ctx = cb.getContext();
  const ms = ctx.missionState;

  if (step === 1) {
    cb.selectPart('userObjective', 'wildfire-ir');
    cb.setSegment('space', 'inst');
    advanceTo(2);
    return;
  }
  if (step === 2) {
    cb.setSegment('space', 'inst');
    if (!ms.instrumentIds?.includes('ir-bolometer')) cb.selectPart('instrumentIds', 'ir-bolometer', 'add');
    return;
  }
  if (step === 3) {
    cb.setSegment('space', 'solar');
    if (ms.solarId !== 'deployable-wings') cb.selectPart('solarId', 'deployable-wings');
    return;
  }
  if (step === 4) {
    cb.setSegment('launch', 'veh');
    if (ms.vehicleId !== 'electron') cb.selectPart('vehicleId', 'electron');
    return;
  }
  if (step === 5) {
    if ((ctx.lastEval?.cmlLevel || 1) < 4) {
      cb.setSegment('ground', 'tx');
      cb.selectPart('transceiverId', 'sx-band');
    } else {
      cb.goToStage('launch');
    }
    return;
  }
  if (step === 6) {
    if (!ctx.launchTelemetry || ctx.launchTelemetry.armed) cb.igniteLaunch();
    else cb.goToStage('orbit');
    return;
  }
  if (step === 7) {
    if (!ctx.orbitTelemetry?.inLineOfSight) {
      cb.seekPass();
      cb.setOrbitWarp(6);
    } else {
      cb.transmitNow();
    }
  }
}

export function notifyTutorialState() {
  if (!active || !cb || completed) return;
  const ctx = cb.getContext();
  if (ctx.titleOpen) {
    stopTutorial();
    return;
  }

  const ms = ctx.missionState;
  const ev = ctx.lastEval;

  if (step === 2 && ms.instrumentIds?.includes('ir-bolometer')) {
    advanceTo(3);
    cb.setSegment('space', 'solar');
    return;
  }
  if (step === 3 && (ms.solarId === 'deployable-wings' || (ev?.metrics?.powerMargin ?? -99) >= 5)) {
    flashGauges();
    advanceTo(4);
    cb.setSegment('launch', 'veh');
    return;
  }
  if (step === 4 && ms.vehicleId === 'electron') {
    flashGauges();
    advanceTo(5);
    cb.setSegment('ground', 'tx');
    return;
  }
  if (step === 5) {
    if ((ev?.cmlLevel || 1) >= 4 && !cmlCelebrated) {
      cmlCelebrated = true;
      flashGauges();
      playEquip();
    }
    if (ctx.stage === 'launch') {
      advanceTo(6);
      return;
    }
  }
  if (step === 6 && ctx.stage === 'orbit') {
    advanceTo(7);
  }
  if (step === 7 && ctx.stage === 'orbit') {
    if (!passSought) {
      passSought = true;
      cb.seekPass();
      cb.setOrbitWarp(4);
    }
    if (ctx.orbitTelemetry?.inLineOfSight && !warpDroppedForLos) {
      warpDroppedForLos = true;
      cb.setOrbitWarp(1);
      playEquip();
    }
    if ((ctx.orbitTelemetry?.downlinkCount || 0) >= 1) {
      finishAcademy();
      return;
    }
  }
  positionFrame();
}

export function startInteractiveTutorial(callbacks) {
  stopTutorial();
  cb = callbacks;
  ensureDom();

  active = true;
  completed = false;
  step = 1;
  cmlCelebrated = false;
  passSought = false;
  warpDroppedForLos = false;
  lastTargetEl = null;
  lastHighlightKey = '';

  rootEl.hidden = false;
  spotlightEl.hidden = false;
  arrowSvg.hidden = false;
  coachCard.hidden = false;
  completeToast.hidden = true;

  resizeHandler = () => positionFrame();
  keyHandler = (e) => {
    if (e.key === 'Escape' && active) {
      e.preventDefault();
      stopTutorial();
    }
  };
  clickCaptureHandler = (e) => {
    if (!active || completed) return;
    if (step === 1 && e.target.closest('#equipment-strip [data-id="wildfire-ir"]')) {
      setTimeout(() => {
        if (active && step === 1) {
          cb?.setSegment('space', 'inst');
          advanceTo(2);
        }
      }, 40);
    }
  };

  window.addEventListener('resize', resizeHandler);
  window.addEventListener('keydown', keyHandler, true);
  window.addEventListener('click', clickCaptureHandler, true);

  cb.setupStarterBuild();
  notifyTutorialState();
  rafId = requestAnimationFrame(tick);
}

export function stopTutorial() {
  active = false;
  completed = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
  if (keyHandler) { window.removeEventListener('keydown', keyHandler, true); keyHandler = null; }
  if (clickCaptureHandler) { window.removeEventListener('click', clickCaptureHandler, true); clickCaptureHandler = null; }
  if (rootEl) rootEl.hidden = true;
  document.getElementById('resource-gauges')?.classList.remove('tut-gauge-flash');
}

export const isTutorialActive = () => active;
