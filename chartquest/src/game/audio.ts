/** Procedural WebAudio SFX — no audio files, nothing fetched. Starts only after a user gesture. */
export type Sfx = 'boom' | 'crack' | 'whoosh' | 'zap' | 'chime' | 'portal' | 'rumble' | 'steal' | 'rise' | 'tick';

export class AudioFx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  private last: Partial<Record<Sfx, number>> = {};

  private ensure() {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    return this.ctx;
  }

  unlock() {
    const c = this.ensure();
    if (c && c.state === 'suspended') void c.resume();
  }

  private noise(c: AudioContext, dur: number) {
    const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource();
    s.buffer = b;
    return s;
  }

  private env(c: AudioContext, t: number, a: number, peak: number, d: number) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    return g;
  }

  play(s: Sfx, vol = 1) {
    if (this.muted) return;
    const c = this.ensure();
    if (!c || c.state !== 'running' || !this.master) return;
    const now = c.currentTime;
    if ((this.last[s] ?? -1) > now - 0.08) return; // de-dupe bursts
    this.last[s] = now;
    const out = this.master;
    const osc = (type: OscillatorType, f0: number, f1: number, dur: number, peak: number, at = 0) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, now + at);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + at + dur);
      const g = this.env(c, now + at, 0.005, peak * vol, dur);
      o.connect(g).connect(out);
      o.start(now + at);
      o.stop(now + at + dur + 0.05);
    };
    const nz = (dur: number, f: number, q: number, peak: number, type: BiquadFilterType = 'lowpass', f1?: number, at = 0) => {
      const n = this.noise(c, dur + 0.05);
      const bq = c.createBiquadFilter();
      bq.type = type;
      bq.frequency.setValueAtTime(f, now + at);
      if (f1) bq.frequency.exponentialRampToValueAtTime(f1, now + at + dur);
      bq.Q.value = q;
      const g = this.env(c, now + at, 0.004, peak * vol, dur);
      n.connect(bq).connect(g).connect(out);
      n.start(now + at);
    };
    switch (s) {
      case 'boom':
        osc('sine', 120, 32, 0.9, 0.9);
        nz(0.8, 900, 0.7, 0.7, 'lowpass', 120);
        break;
      case 'crack':
        nz(0.25, 3000, 1.2, 0.6, 'highpass');
        osc('square', 180, 60, 0.3, 0.25);
        nz(0.6, 500, 0.8, 0.4, 'lowpass', 90, 0.06);
        break;
      case 'whoosh':
        nz(0.7, 400, 2, 0.35, 'bandpass', 3200);
        break;
      case 'zap':
        osc('sawtooth', 1400, 90, 0.25, 0.25);
        nz(0.3, 5000, 3, 0.3, 'bandpass', 1200);
        osc('square', 600, 1800, 0.12, 0.12, 0.08);
        break;
      case 'chime':
        [660, 990, 1320].forEach((f, i) => osc('sine', f, f, 0.8, 0.18, i * 0.06));
        break;
      case 'portal':
        osc('sine', 180, 720, 0.9, 0.22);
        osc('triangle', 360, 1440, 0.9, 0.1, 0.05);
        break;
      case 'rumble':
        osc('sine', 60, 28, 1.6, 0.8);
        nz(1.4, 300, 0.6, 0.5, 'lowpass', 60);
        break;
      case 'steal':
        [880, 1175, 1568, 2093].forEach((f, i) => osc('triangle', f, f * 0.98, 0.18, 0.15, i * 0.05));
        nz(0.5, 800, 2, 0.25, 'bandpass', 4000, 0.2);
        break;
      case 'rise':
        osc('sawtooth', 110, 880, 1.1, 0.16);
        osc('sine', 220, 1760, 1.1, 0.16);
        break;
      case 'tick':
        osc('sine', 1800, 1500, 0.05, 0.05);
        break;
    }
  }
}
