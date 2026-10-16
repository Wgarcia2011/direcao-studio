import {cubicBezier, spring} from 'motion';

export const motionEaseOut = cubicBezier(0.16, 1, 0.3, 1);
export type MotionEnergy = 'soft' | 'balanced' | 'energetic';
const physics = {
  soft: {stiffness: 100, damping: 24, mass: 1},
  balanced: {stiffness: 160, damping: 19, mass: 0.7},
  energetic: {stiffness: 240, damping: 15, mass: 0.6},
};

/** Pure sampling: repeated, reverse and parallel frames have identical values. */
export function motionSpringAtFrame(frame: number, fps: number, energy: MotionEnergy = 'balanced') {
  if (!Number.isFinite(frame) || !Number.isFinite(fps) || fps <= 0) {
    throw new Error('Motion exige frame finito e fps positivo.');
  }
  if (frame <= 0) return 0;
  // Never share a stateful generator between frames or compositions.
  return spring({keyframes: [0, 1], ...physics[energy]}).next(frame * 1000 / fps).value;
}

export function motionProgress(frame: number, start: number, duration: number) {
  if (![frame, start, duration].every(Number.isFinite) || duration <= 0) {
    throw new Error('Motion exige intervalo finito e duração positiva.');
  }
  return motionEaseOut(Math.min(1, Math.max(0, (frame - start) / duration)));
}
