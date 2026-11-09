export class AmbientAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.voices = [];
    this.enabled = false;
    this.epoch = 1;
    this.rate = 1;
  }

  init() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('浏览器不支持 Web Audio');
    this.context = new Context();
    const ctx = this.context;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 6;
    this.master.connect(compressor).connect(ctx.destination);

    // 不下载音频：用轻微失谐的正弦波与滤波噪声合成缓慢呼吸的空间。
    const pitches = [36.71, 55, 73.42, 110, 146.83];
    for (let i = 0; i < pitches.length; i++) {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = pitches[i];
      oscillator.detune.value = i % 2 === 0 ? -3 : 3;
      const gain = ctx.createGain();
      gain.gain.value = .045 / (1 + i * .5);
      const pan = ctx.createStereoPanner();
      pan.pan.value = (i - 2) * .3;
      oscillator.connect(gain).connect(pan).connect(this.master);
      oscillator.start();
      const lfo = ctx.createOscillator();
      lfo.frequency.value = .037 + i * .019;
      const depth = ctx.createGain();depth.gain.value = .009;
      lfo.connect(depth).connect(gain.gain);lfo.start();
      this.voices.push({ oscillator, base: pitches[i] });
    }
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + (Math.random() * 2 - 1) * .025) / 1.025;
      data[i] = last * 3;
    }
    const source = ctx.createBufferSource();source.buffer = buffer;source.loop = true;
    const filter = ctx.createBiquadFilter();filter.type = 'lowpass';filter.frequency.value = 550;
    const noiseGain = ctx.createGain();noiseGain.gain.value = .055;
    source.connect(filter).connect(noiseGain).connect(this.master);source.start();
    this.setEpoch(this.epoch);
  }

  async toggle() {
    if (!this.context) this.init();
    this.enabled = !this.enabled;
    if (this.context.state === 'suspended') await this.context.resume();
    this.master.gain.setTargetAtTime(this.enabled ? .65 : 0, this.context.currentTime, .4);
    return this.enabled;
  }

  setEpoch(epoch) {
    this.epoch = epoch;
    if (!this.context) return;
    const ratio = [1.12, 1, 1.5][epoch];
    for (const voice of this.voices) voice.oscillator.frequency.setTargetAtTime(voice.base * ratio, this.context.currentTime, 1.5);
  }

  setRate(rate) {
    this.rate = rate;
    if (!this.context) return;
    for (const [i, voice] of this.voices.entries()) voice.oscillator.detune.setTargetAtTime(rate * (i % 2 ? 4 : -4), this.context.currentTime, .8);
  }

  pulse() {
    if (!this.context || !this.enabled) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.setValueAtTime(90, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 2.5);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(.17, ctx.currentTime + .1);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 3);
    oscillator.connect(gain).connect(this.master);oscillator.start();oscillator.stop(ctx.currentTime + 3);
    oscillator.onended = () => { oscillator.disconnect();gain.disconnect(); };
  }

  getState() {
    return { enabled: this.enabled, status: this.context?.state ?? 'not-started', voices: this.voices.length };
  }
}
