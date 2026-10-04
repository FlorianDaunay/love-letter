import { useProfile } from "@/store/profile";

/**
 * Every sound is synthesized with WebAudio: no files to load, nothing to license.
 * The context is created lazily on the first user gesture (browser autoplay rules).
 */
export type SoundName =
  | "click"
  | "draw"
  | "play"
  | "reveal"
  | "protect"
  | "eliminate"
  | "miss"
  | "swap"
  | "shuffle"
  | "turn"
  | "roundWin"
  | "gameWin"
  | "chat";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  master!.gain.value = useProfile.getState().volume * 0.6;
  return ctx;
}

export function unlockAudio() {
  if (useProfile.getState().sound) audio();
}

function tone(c: AudioContext, freq: number, start: number, duration: number, opts: { type?: OscillatorType; gain?: number; attack?: number; glide?: number } = {}) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.glide) osc.frequency.exponentialRampToValueAtTime(opts.glide, start + duration);
  const peak = opts.gain ?? 0.25;
  const attack = opts.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(master!);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noise(c: AudioContext, start: number, duration: number, opts: { freq?: number; q?: number; gain?: number; type?: BiquadFilterType; sweepTo?: number } = {}) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? "bandpass";
  filter.frequency.setValueAtTime(opts.freq ?? 2000, start);
  if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, start + duration);
  filter.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter).connect(g).connect(master!);
  src.start(start, Math.random() * 0.5);
  src.stop(start + duration + 0.05);
}

/** Bell-like note: a few inharmonic partials. */
function bell(c: AudioContext, freq: number, start: number, gain = 0.12, duration = 1.2) {
  [1, 2.01, 2.76, 4.07].forEach((ratio, i) => tone(c, freq * ratio, start, duration / (1 + i * 0.6), { gain: gain / (1 + i * 1.5) }));
}

const NOTES = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E4: 329.63, G4: 392, A4: 440, B4: 493.88 };

const recipes: Record<SoundName, (c: AudioContext, t: number) => void> = {
  click: (c, t) => tone(c, 1800, t, 0.04, { type: "triangle", gain: 0.06 }),
  draw: (c, t) => noise(c, t, 0.22, { freq: 3200, sweepTo: 1200, gain: 0.12, q: 0.6 }),
  play: (c, t) => {
    noise(c, t, 0.12, { freq: 900, type: "lowpass", gain: 0.35 });
    tone(c, 140, t, 0.16, { glide: 70, gain: 0.25 });
  },
  reveal: (c, t) => {
    bell(c, NOTES.A5, t, 0.1);
    bell(c, NOTES.E5 * 2, t + 0.12, 0.06);
  },
  protect: (c, t) => {
    [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => tone(c, f, t + i * 0.05, 1.1, { gain: 0.06, attack: 0.15 }));
  },
  eliminate: (c, t) => {
    tone(c, 330, t, 0.5, { type: "triangle", glide: 110, gain: 0.18 });
    tone(c, 196, t + 0.18, 0.7, { type: "sine", glide: 82, gain: 0.2 });
    noise(c, t, 0.4, { freq: 300, type: "lowpass", gain: 0.25 });
  },
  miss: (c, t) => {
    tone(c, 620, t, 0.08, { type: "triangle", gain: 0.08 });
    tone(c, 470, t + 0.1, 0.12, { type: "triangle", gain: 0.08 });
  },
  swap: (c, t) => {
    noise(c, t, 0.2, { freq: 2500, sweepTo: 900, gain: 0.12 });
    noise(c, t + 0.18, 0.2, { freq: 900, sweepTo: 2500, gain: 0.12 });
  },
  shuffle: (c, t) => {
    for (let i = 0; i < 9; i++) noise(c, t + i * 0.045 + Math.random() * 0.01, 0.05, { freq: 2600 + Math.random() * 1500, gain: 0.1, q: 1.4 });
  },
  turn: (c, t) => {
    bell(c, NOTES.E5, t, 0.07, 0.8);
    bell(c, NOTES.A5, t + 0.13, 0.07, 1);
  },
  roundWin: (c, t) => {
    [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => bell(c, f, t + i * 0.11, 0.09, 1.4));
  },
  gameWin: (c, t) => {
    const seq = [NOTES.G4, NOTES.C5, NOTES.E5, NOTES.G5, NOTES.E5, NOTES.G5, NOTES.C6];
    const times = [0, 0.14, 0.28, 0.42, 0.62, 0.76, 0.95];
    seq.forEach((f, i) => {
      tone(c, f, t + times[i], 0.5, { type: "triangle", gain: 0.1 });
      bell(c, f, t + times[i], 0.05, 1.6);
    });
  },
  chat: (c, t) => tone(c, 1320, t, 0.09, { gain: 0.05 }),
};

export function playSound(name: SoundName, delay = 0) {
  if (!useProfile.getState().sound) return;
  const c = audio();
  if (!c || !master) return;
  recipes[name](c, c.currentTime + 0.01 + delay);
}
