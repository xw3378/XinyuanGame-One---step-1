// ============================================================
// FEEDBACK TRANSLATION  (brief.md section 4 + 9)
// ============================================================
// "Hands slip ... appears as character leaning animation and creaking
//  body sound."
// "Body trembles ... appears as trembling limb animation and heavy
//  breathing audio."
// "Body sway ... appears as animation of body leaning and swaying, and
//  soft shifting body sound."
// ============================================================
// Every sound here is synthesised at runtime. Nothing is fetched from a
// CDN, so GitHub Pages serves a fully self-contained exhibition with no
// external requests and no binary audio assets in the repository.
// ============================================================

export function createAudio() {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let breathGain = null;
  let breathSource = null;
  let muted = false;
  let breathPhase = 0;

  function makeNoise(seconds = 2) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Browsers refuse to start audio without a user gesture.
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);
    noiseBuffer = makeNoise();

    // Continuous breathing bed, driven by how exhausted the climber is.
    breathSource = ctx.createBufferSource();
    breathSource.buffer = noiseBuffer;
    breathSource.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 520;
    band.Q.value = 1.1;
    breathGain = ctx.createGain();
    breathGain.gain.value = 0;
    breathSource.connect(band).connect(breathGain).connect(master);
    breathSource.start();
    return true;
  }

  function noiseVoice({ type = 'lowpass', freq = 800, q = 1, gain = 0.3, attack = 0.005, decay = 0.25, sweepTo = null }) {
    if (!ctx || muted) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
    if (sweepTo) {
      filter.frequency.setValueAtTime(freq, now);
      filter.frequency.exponentialRampToValueAtTime(sweepTo, now + attack + decay);
    }
    src.connect(filter).connect(g).connect(master);
    src.start(now);
    src.stop(now + attack + decay + 0.05);
  }

  return {
    resume() {
      ensure();
    },
    get ready() {
      return !!ctx;
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.85;
    },
    get muted() {
      return muted;
    },

    // A limb lands on a hold: a solid, reassuring contact.
    thunk(pitchy = 1) {
      if (!ensure() || muted) return;
      noiseVoice({ type: 'lowpass', freq: 700 * pitchy, gain: 0.32, decay: 0.14 });
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 96 * pitchy;
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + 0.2);
    },

    // The hold is starting to give: a strained, rising creak.
    creak(intensity = 1) {
      noiseVoice({
        type: 'bandpass',
        freq: 900 + 700 * intensity,
        q: 6,
        gain: 0.1 + 0.22 * intensity,
        attack: 0.03,
        decay: 0.3,
        sweepTo: 1500 + 900 * intensity,
      });
    },

    // A foot or hand pops off for real.
    slip() {
      noiseVoice({ type: 'lowpass', freq: 2400, gain: 0.4, attack: 0.005, decay: 0.5, sweepTo: 220 });
    },

    // Weight shifting badly over your feet.
    swayShift(intensity = 1) {
      noiseVoice({ type: 'lowpass', freq: 380, gain: 0.09 + 0.14 * intensity, attack: 0.08, decay: 0.42 });
    },

    chime() {
      if (!ensure() || muted) return;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const now = ctx.currentTime + i * 0.11;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        osc.connect(g).connect(master);
        osc.start(now);
        osc.stop(now + 0.8);
      });
    },

    // Called every frame with how pumped out the climber is (0..1).
    updateBreath(exhaustion, dt) {
      if (!ctx || muted || !breathGain) return;
      breathPhase += dt * (0.9 + 1.8 * exhaustion);
      const cycle = Math.max(0, Math.sin(breathPhase * Math.PI * 2));
      const target = exhaustion * exhaustion * 0.5 * (0.35 + 0.65 * cycle);
      breathGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    },
  };
}
