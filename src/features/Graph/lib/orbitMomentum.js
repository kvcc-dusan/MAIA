// Orbit for the 3D graph beyond what OrbitControls does: the arrow keys orbit (panning is off, so they would
// otherwise do nothing), and a quick drag that is let go keeps turning the graph, easing to a stop.
import { Spherical, Vector3 } from "three";

const ORBIT_KEY_STEP = 0.08;
// Momentum after a flick: the speed measured over the last moments of the drag decays exponentially.
const SPIN_TAU_S = 0.55; // time constant: it has nearly stopped after about three of these
const SPIN_WINDOW_MS = 90; // how far back the release speed is measured
const SPIN_MIN_SPEED = 0.35; // rad/s: a slower release is a gentle placement, not a flick
const SPIN_STOP_SPEED = 0.03; // rad/s: below this the spin ends
const SPIN_MAX_SPEED = 7; // rad/s: even the hardest flick turns the graph at a readable pace
const SPIN_MIN_WINDOW_S = 0.016; // never divide by a sliver of time
const ORBIT_POLE_MARGIN = 0.05;

/**
 * @param {object} options
 * @param {object} options.graph the 3d-force-graph instance (camera access)
 * @param {object} options.controls its OrbitControls
 * @param {HTMLElement} options.container receives the arrow keys
 * @param {boolean} options.reducedMotion no momentum
 * @param {() => boolean} options.isLive false while the scene is paused or destroyed: the spin stops
 * @param {() => void} options.onInteract a key orbit counts as interaction (stops auto-rotation)
 */
export const createOrbitMomentum = ({ graph, controls, container, reducedMotion, isLive, onInteract }) => {
  const orbitOffset = new Vector3();
  const orbitSpherical = new Spherical();
  const orbitBy = (dTheta, dPhi) => {
    const camera = graph.camera();
    const target = controls.target ?? new Vector3();
    orbitOffset.copy(camera.position).sub(target);
    orbitSpherical.setFromVector3(orbitOffset);
    orbitSpherical.theta += dTheta;
    orbitSpherical.phi = Math.min(Math.PI - ORBIT_POLE_MARGIN, Math.max(ORBIT_POLE_MARGIN, orbitSpherical.phi + dPhi));
    orbitOffset.setFromSpherical(orbitSpherical);
    camera.position.copy(target).add(orbitOffset);
    camera.lookAt(target);
    controls.update?.();
  };
  const ARROW_ORBIT = {
    ArrowLeft: [ORBIT_KEY_STEP, 0], ArrowRight: [-ORBIT_KEY_STEP, 0], ArrowUp: [0, ORBIT_KEY_STEP], ArrowDown: [0, -ORBIT_KEY_STEP],
  };
  const handleOrbitKey = (event) => {
    const step = ARROW_ORBIT[event.key];
    if (!step) return;
    event.preventDefault();
    onInteract();
    stopSpin();
    orbitBy(step[0], step[1]);
  };
  container.addEventListener("keydown", handleOrbitKey);

  // --- momentum --------------------------------------------------------------
  // Let go of a quick drag and the graph keeps turning, easing to a stop. The speed comes from how the camera
  // moved during the last moments of the drag; any new touch, wheel or key press cancels it. Off with reduced motion.
  const spin = { dragging: false, samples: [], vTheta: 0, vPhi: 0, raf: 0, last: 0 };
  const angles = () => {
    const camera = graph.camera();
    const target = controls.target ?? new Vector3();
    orbitOffset.copy(camera.position).sub(target);
    orbitSpherical.setFromVector3(orbitOffset);
    return { theta: orbitSpherical.theta, phi: orbitSpherical.phi };
  };
  const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const stopSpin = () => {
    cancelAnimationFrame(spin.raf);
    spin.raf = 0;
    spin.vTheta = 0;
    spin.vPhi = 0;
  };
  const spinStep = (t) => {
    spin.raf = 0;
    if (!isLive()) return;
    const dt = Math.min(0.05, (t - spin.last) / 1000);
    spin.last = t;
    orbitBy(spin.vTheta * dt, spin.vPhi * dt);
    const decay = Math.exp(-dt / SPIN_TAU_S);
    spin.vTheta *= decay;
    spin.vPhi *= decay;
    if (Math.hypot(spin.vTheta, spin.vPhi) < SPIN_STOP_SPEED) return;
    spin.raf = requestAnimationFrame(spinStep);
  };
  const recordSpinSample = () => {
    if (!spin.dragging) return; // orbitBy() and the spin itself also fire "change"; only a real drag counts
    const now = performance.now();
    spin.samples.push({ t: now, ...angles() });
    while (spin.samples.length > 2 && now - spin.samples[0].t > SPIN_WINDOW_MS) spin.samples.shift();
  };
  const beginSpinTracking = () => {
    stopSpin();
    spin.dragging = true;
    spin.samples = [{ t: performance.now(), ...angles() }];
  };
  const releaseSpin = () => {
    spin.dragging = false;
    const { samples } = spin;
    spin.samples = [];
    if (reducedMotion || samples.length < 2) return;
    const first = samples[0];
    const lastSample = samples[samples.length - 1];
    const seconds = Math.max(SPIN_MIN_WINDOW_S, (lastSample.t - first.t) / 1000);
    // Still moving when released? A pause before letting go means the user stopped it on purpose.
    if (performance.now() - lastSample.t > SPIN_WINDOW_MS) return;
    const vTheta = wrapPi(lastSample.theta - first.theta) / seconds;
    const vPhi = (lastSample.phi - first.phi) / seconds;
    const speed = Math.hypot(vTheta, vPhi);
    if (speed < SPIN_MIN_SPEED) return;
    const scale = Math.min(1, SPIN_MAX_SPEED / speed);
    spin.vTheta = vTheta * scale;
    spin.vPhi = vPhi * scale;
    spin.last = performance.now();
    spin.raf = requestAnimationFrame(spinStep);
  };
  controls.addEventListener("start", beginSpinTracking);
  controls.addEventListener("change", recordSpinSample);
  controls.addEventListener("end", releaseSpin);

  return {
    stopSpin,
    /** Dev stats. */
    stats: () => ({ dragging: spin.dragging, vTheta: +spin.vTheta.toFixed(3), vPhi: +spin.vPhi.toFixed(3), running: spin.raf !== 0 }),
    dispose() {
      container.removeEventListener("keydown", handleOrbitKey);
      stopSpin();
      controls.removeEventListener("start", beginSpinTracking);
      controls.removeEventListener("change", recordSpinSample);
      controls.removeEventListener("end", releaseSpin);
    },
  };
};
