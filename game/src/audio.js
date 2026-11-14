// Short tones and noise bursts synthesized in the browser. No audio files.

export function createAudio() {
  let ctx = null;
  let master = null;
  let drone = null;
  let wind = null;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
      const length = ctx.sampleRate * 2;
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function envGain(duration, peak) {
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(master);
    return gain;
  }

  function tone(freq, duration, type, peak, slide) {
    if (!ensure() || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ctx.currentTime + duration);
    const gain = envGain(duration, peak);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function noise(duration, peak, frequency) {
    if (!ensure() || muted || !noiseBuffer) return;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    const gain = envGain(duration, peak);
    source.connect(filter);
    filter.connect(gain);
    source.start();
    source.stop(ctx.currentTime + duration + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.85;
      return muted;
    },
    get muted() {
      return muted;
    },
    click() {
      tone(640, 0.08, "triangle", 0.05);
    },
    cast() {
      tone(420, 0.18, "sine", 0.06, 880);
      tone(660, 0.22, "triangle", 0.03, 990);
    },
    lock() {
      tone(880, 0.05, "square", 0.02);
    },
    boom() {
      noise(0.55, 0.22, 420);
      tone(90, 0.6, "sine", 0.18, 42);
      tone(220, 0.35, "triangle", 0.06, 680);
    },
    shatter() {
      noise(0.18, 0.06, 1800);
      tone(540, 0.12, "square", 0.03, 180);
    },
    shot() {
      tone(760, 0.09, "sawtooth", 0.035, 1480);
      tone(1180, 0.07, "triangle", 0.02, 1860);
    },
    demon() {
      noise(0.22, 0.08, 900);
      tone(300, 0.16, "square", 0.04, 90);
    },
    hurt() {
      noise(0.2, 0.1, 300);
      tone(140, 0.22, "sawtooth", 0.05, 70);
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, index) => {
        setTimeout(() => tone(freq, 0.28, "triangle", 0.05), index * 120);
      });
    },
    startDrone(mode) {
      if (!ensure() || muted) return;
      this.stopDrone();
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc2.type = "triangle";
      filter.type = "lowpass";
      if (mode === "flight") {
        osc.frequency.value = 82;
        osc2.frequency.value = 164.5;
        filter.frequency.value = 520;
        gain.gain.value = 0.03;
      } else {
        osc.frequency.value = 55;
        osc2.frequency.value = 82.5;
        filter.frequency.value = 240;
        gain.gain.value = 0.04;
      }
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start();
      osc2.start();
      drone = { osc, osc2, gain };
      if (mode === "flight") {
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;
        const windFilter = ctx.createBiquadFilter();
        windFilter.type = "bandpass";
        windFilter.frequency.value = 700;
        windFilter.Q.value = 0.6;
        const windGain = ctx.createGain();
        windGain.gain.value = 0.015;
        source.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(master);
        source.start();
        wind = { source, windGain };
      }
    },
    stopDrone() {
      if (drone) {
        try {
          drone.osc.stop();
          drone.osc2.stop();
        } catch {
          /* already stopped */
        }
        drone = null;
      }
      if (wind) {
        try {
          wind.source.stop();
        } catch {
          /* already stopped */
        }
        wind = null;
      }
    },
  };
}
