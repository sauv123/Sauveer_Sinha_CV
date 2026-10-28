/**
 * Tactile Studio Paper & Sticky-Note Foley Synthesizer (Web Audio API)
 * Generates synchronized, spatialized 120gsm cotton paper & Post-it adhesive acoustics:
 *  - 2D stereo panning coupled to the active corner / traveling fold crease
 *  - Stochastic stick-slip cellulose micro-fiber impulses during slow bends
 *  - Dual-layer continuous movement: warm 240Hz sheet-body resonance + dry fiber friction
 *  - Two-stage release: aerodynamic air-pocket sigh followed by damped tabletop contact thud
 *  - Sticky-note Foley: adhesive micro-tack peel ("zzzzp-snap"), corner flutter hover, and thumb-press restick
 */

export class PaperSoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;
    this.noiseBuffer = null;

    // Continuous movement audio graph
    this.moveSource = null;
    this.moveGain = null;
    this.movePanner = null;
    this.moveFilterLow = null;
    this.moveFilterHigh = null;
    this.moveFormant = null;
    this.bodyResonance = null;
    this.bodyGain = null;

    this.smoothedSpeed = 0;
    this.prevCurlAmount = 0;
    this.crackleAccumulator = 0;
    this.lastCrackleTime = 0;
    this.lastHoverTime = 0;
  }

  /**
   * Initialize AudioContext on first user gesture to respect browser autoplay policies.
   */
  ensureContext() {
    if (this.isMuted) return false;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this._buildCelluloseNoiseBuffer();
      this._setupContinuousRustleChain();
      this.isInitialized = true;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx.state === 'running';
  }

  /**
   * Helper to create a stereo panner node (with graceful fallback on older WebKit).
   */
  _createPanner(panValue = 0) {
    if (this.ctx && typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, panValue));
      return panner;
    }
    const dummy = this.ctx.createGain();
    dummy.pan = { value: 0, setTargetAtTime: () => {}, setValueAtTime: () => {} };
    return dummy;
  }

  /**
   * Creates a 4.5-second stereo buffer combining warm 1/f pink fibrous noise
   * with organic micro-slip cellulose grain clusters so it never sounds synthetic.
   */
  _buildCelluloseNoiseBuffer() {
    const sampleRate = this.ctx.sampleRate;
    const duration = 4.5;
    const length = Math.floor(sampleRate * duration);
    this.noiseBuffer = this.ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = this.noiseBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      let grainEnv = 0;
      let microSnap = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.044;
        b6 = white * 0.115926;

        if (Math.random() < 0.0065) {
          grainEnv = 0.4 + Math.random() * 0.6;
        }
        grainEnv *= 0.9935;

        if (Math.random() < 0.0014) {
          microSnap = (Math.random() * 2 - 1) * 0.38;
        }
        microSnap *= 0.92;

        const fadeFrames = 2048;
        let windowMult = 1.0;
        if (i < fadeFrames) windowMult = i / fadeFrames;
        else if (i > length - fadeFrames) windowMult = (length - i) / fadeFrames;

        data[i] = (pink * (0.64 + 0.36 * grainEnv) + microSnap * 0.12) * windowMult;
      }
    }
  }

  /**
   * Persistent, silent-until-moving audio graph for continuous page rustling.
   */
  _setupContinuousRustleChain() {
    if (!this.ctx || !this.noiseBuffer) return;

    this.moveSource = this.ctx.createBufferSource();
    this.moveSource.buffer = this.noiseBuffer;
    this.moveSource.loop = true;

    this.moveFilterLow = this.ctx.createBiquadFilter();
    this.moveFilterLow.type = 'highpass';
    this.moveFilterLow.frequency.value = 460;
    this.moveFilterLow.Q.value = 0.7;

    this.moveFormant = this.ctx.createBiquadFilter();
    this.moveFormant.type = 'bandpass';
    this.moveFormant.frequency.value = 1380;
    this.moveFormant.Q.value = 1.25;

    this.moveFilterHigh = this.ctx.createBiquadFilter();
    this.moveFilterHigh.type = 'lowpass';
    this.moveFilterHigh.frequency.value = 5400;
    this.moveFilterHigh.Q.value = 0.55;

    this.bodyResonance = this.ctx.createBiquadFilter();
    this.bodyResonance.type = 'bandpass';
    this.bodyResonance.frequency.value = 245;
    this.bodyResonance.Q.value = 2.1;

    this.bodyGain = this.ctx.createGain();
    this.bodyGain.gain.value = 0.42;

    this.moveGain = this.ctx.createGain();
    this.moveGain.gain.value = 0.0;

    this.movePanner = this._createPanner(0);

    this.moveSource.connect(this.moveFilterLow);
    this.moveFilterLow.connect(this.moveFormant);
    this.moveFormant.connect(this.moveFilterHigh);
    this.moveFilterHigh.connect(this.moveGain);

    this.moveSource.connect(this.bodyResonance);
    this.bodyResonance.connect(this.bodyGain);
    this.bodyGain.connect(this.moveGain);

    this.moveGain.connect(this.movePanner);
    this.movePanner.connect(this.ctx.destination);

    this.moveSource.start(0);
  }

  /**
   * Fires a delicate stick-slip cellulose fiber impulse during bending.
   */
  _triggerFiberCrackle(intensity = 0.4, pan = 0.0, curlTension = 0.5) {
    if (!this.ctx || this.ctx.state !== 'running' || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCrackleTime < 0.028) return;
    this.lastCrackleTime = now;

    const dur = 0.022 + Math.random() * 0.018;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.15 + Math.random() * 0.35;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const baseFreq = 2200 + curlTension * 1400 + Math.random() * 900;
    bp.frequency.setValueAtTime(baseFreq, now);
    bp.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, now + dur);
    bp.Q.value = 3.8 + Math.random() * 1.8;

    const gain = this.ctx.createGain();
    const peak = Math.min(0.036, 0.012 + 0.022 * intensity);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    src.start(now, Math.random() * 3.0, dur + 0.01);
  }

  /**
   * Subtle sticky-note lower edge flutter when hovering over a note.
   */
  triggerStickyHover(pan = 0.0) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    if (now - this.lastHoverTime < 0.07) return;
    this.lastHoverTime = now;

    const dur = 0.048;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.25 + Math.random() * 0.15;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400, now);
    bp.frequency.exponentialRampToValueAtTime(1650, now + dur);
    bp.Q.value = 2.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.018, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);
    src.start(now, Math.random() * 2.5, dur + 0.01);
  }

  /**
   * Signature tactile Post-it adhesive peel sound ("zzzzp-pop") when plucking a sticky note off the sheet.
   */
  triggerStickyPeel(pan = 0.0) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const peelDur = 0.135;

    const panner = this._createPanner(pan);
    panner.connect(this.ctx.destination);

    // 1. High-frequency adhesive micro-tack separation sweep
    const tackSrc = this.ctx.createBufferSource();
    tackSrc.buffer = this.noiseBuffer;
    tackSrc.playbackRate.value = 1.45;

    const tackBp = this.ctx.createBiquadFilter();
    tackBp.type = 'bandpass';
    tackBp.frequency.setValueAtTime(2600, now);
    tackBp.frequency.exponentialRampToValueAtTime(5600, now + peelDur * 0.85);
    tackBp.Q.value = 3.2;

    const tackGain = this.ctx.createGain();
    tackGain.gain.setValueAtTime(0.0001, now);
    tackGain.gain.linearRampToValueAtTime(0.044, now + 0.025);
    tackGain.gain.exponentialRampToValueAtTime(0.0001, now + peelDur);

    tackSrc.connect(tackBp);
    tackBp.connect(tackGain);
    tackGain.connect(panner);
    tackSrc.start(now, Math.random() * 2.0, peelDur + 0.02);

    // 2. Crisp paper-corner release snap at the end of the adhesive strip
    const snapTime = now + peelDur * 0.72;
    const snapDur = 0.042;
    const snapSrc = this.ctx.createBufferSource();
    snapSrc.buffer = this.noiseBuffer;
    snapSrc.playbackRate.value = 1.1;

    const snapBp = this.ctx.createBiquadFilter();
    snapBp.type = 'bandpass';
    snapBp.frequency.setValueAtTime(1450, snapTime);
    snapBp.frequency.exponentialRampToValueAtTime(620, snapTime + snapDur);
    snapBp.Q.value = 2.0;

    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.0001, snapTime);
    snapGain.gain.linearRampToValueAtTime(0.048, snapTime + 0.005);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, snapTime + snapDur);

    snapSrc.connect(snapBp);
    snapBp.connect(snapGain);
    snapGain.connect(panner);
    snapSrc.start(snapTime, Math.random() * 2.0, snapDur + 0.01);
  }

  /**
   * Soft thumb-press & adhesive tack sound when sticking a note onto the desk or back onto the resume.
   */
  triggerStickyStick(pan = 0.0) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const dur = 0.085;

    const panner = this._createPanner(pan);
    panner.connect(this.ctx.destination);

    // Soft paper brush
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.85;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1100, now);
    bp.frequency.exponentialRampToValueAtTime(340, now + dur);
    bp.Q.value = 1.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.034, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    src.start(now, Math.random() * 2.0, dur + 0.02);

    // Gentle low thumb tap
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.055);

    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, now);
    thudGain.gain.linearRampToValueAtTime(0.024, now + 0.006);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(thudGain);
    thudGain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Initial lift: crisp fingertip-on-cotton-edge pickup with subtle low paper flex.
   */
  triggerLift(intensity = 0.65, pan = 0.35) {
    if (!this.ensureContext()) return;

    const now = this.ctx.currentTime;
    const dur = 0.088;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.04 + Math.random() * 0.08;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1850, now);
    bp.frequency.exponentialRampToValueAtTime(2850, now + dur);
    bp.Q.value = 2.2;

    const bodyBp = this.ctx.createBiquadFilter();
    bodyBp.type = 'bandpass';
    bodyBp.frequency.setValueAtTime(280, now);
    bodyBp.Q.value = 1.9;

    const gain = this.ctx.createGain();
    const peak = Math.min(0.052, 0.030 * intensity);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);

    src.connect(bp);
    src.connect(bodyBp);
    bp.connect(gain);
    bodyBp.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    src.start(now, Math.random() * 2.5, dur + 0.02);
  }

  /**
   * Continuous page movement: spatialized fibrous rustling + curvature-driven micro-crackle.
   */
  updateMovement(speed, curlAmount = 0.5, pan = 0.0) {
    if (this.isMuted || !this.ctx || !this.moveGain) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    this.smoothedSpeed = this.smoothedSpeed * 0.68 + speed * 0.32;

    const curlDelta = Math.abs(curlAmount - this.prevCurlAmount);
    this.prevCurlAmount = curlAmount;

    if (this.smoothedSpeed < 0.0025) {
      this.moveGain.gain.setTargetAtTime(0.0, now, 0.016);
      return;
    }

    const shapedSpeed = Math.min(1.0, Math.pow(this.smoothedSpeed, 0.74));
    const archFactor = Math.sin(Math.PI * Math.min(1.0, Math.max(0.05, curlAmount)));
    const targetGain = shapedSpeed * 0.076 * (0.62 + 0.38 * archFactor);

    const targetFreq = 1080 + shapedSpeed * 1650 + (1.0 - archFactor) * 280;
    const targetQ = 1.42 - shapedSpeed * 0.38;
    const bodyFreq = 210 + (1.0 - archFactor) * 120 + shapedSpeed * 65;

    this.moveGain.gain.setTargetAtTime(targetGain, now, 0.020);
    this.moveFormant.frequency.setTargetAtTime(targetFreq, now, 0.025);
    this.moveFormant.Q.setTargetAtTime(targetQ, now, 0.025);
    if (this.bodyResonance) {
      this.bodyResonance.frequency.setTargetAtTime(bodyFreq, now, 0.030);
    }
    if (this.movePanner && this.movePanner.pan) {
      this.movePanner.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, pan)), now, 0.035);
    }

    this.crackleAccumulator += curlDelta * 14.0 + shapedSpeed * 0.16;
    if (this.crackleAccumulator > 0.38) {
      this.crackleAccumulator = 0;
      if (Math.random() < 0.75) {
        this._triggerFiberCrackle(shapedSpeed, pan, 1.0 - archFactor * 0.5);
      }
    }
  }

  /**
   * Immediately silences continuous movement sound.
   */
  stopMovement() {
    this.smoothedSpeed = 0;
    if (this.ctx && this.moveGain) {
      this.moveGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.015);
    }
  }

  /**
   * Subtle paper crease / tension settle when folding a corner or side open.
   */
  triggerCreaseHold(pan = 0.0) {
    this.stopMovement();
    if (!this.ensureContext()) return;

    const now = this.ctx.currentTime;
    const dur = 0.14;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.88;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(920, now);
    bp.frequency.exponentialRampToValueAtTime(380, now + dur);
    bp.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.026, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);
    src.start(now, Math.random() * 2.0, dur + 0.02);
  }

  /**
   * Two-stage page release:
   *  1. Aerodynamic paper flutter + low-frequency trapped air-pocket escape sigh
   *  2. Damped tabletop contact thud as the paper meets the studio surface
   */
  triggerRelease(travelMagnitude = 0.6, settleDurationSec = 0.42, pan = 0.0) {
    this.stopMovement();
    if (!this.ensureContext()) return;

    const now = this.ctx.currentTime;
    const mag = Math.max(0.14, Math.min(1.0, travelMagnitude));
    const dur = Math.max(0.18, Math.min(0.68, settleDurationSec));
    const panner = this._createPanner(pan);
    panner.connect(this.ctx.destination);

    const flutterSrc = this.ctx.createBufferSource();
    flutterSrc.buffer = this.noiseBuffer;
    flutterSrc.playbackRate.value = 0.92 + Math.random() * 0.06;

    const flutterBp = this.ctx.createBiquadFilter();
    flutterBp.type = 'bandpass';
    flutterBp.frequency.setValueAtTime(1450 + mag * 420, now);
    flutterBp.frequency.exponentialRampToValueAtTime(580, now + dur * 0.85);
    flutterBp.Q.value = 1.45;

    const flutterGain = this.ctx.createGain();
    flutterGain.gain.setValueAtTime(0.0001, now);
    flutterGain.gain.linearRampToValueAtTime(0.036 * mag, now + dur * 0.22);
    flutterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.96);

    flutterSrc.connect(flutterBp);
    flutterBp.connect(flutterGain);
    flutterGain.connect(panner);
    flutterSrc.start(now, Math.random() * 2.0, dur + 0.04);

    const airTime = now + dur * 0.46;
    const airDur = 0.13;
    const airSrc = this.ctx.createBufferSource();
    airSrc.buffer = this.noiseBuffer;
    airSrc.playbackRate.value = 0.65;

    const airLp = this.ctx.createBiquadFilter();
    airLp.type = 'lowpass';
    airLp.frequency.setValueAtTime(340 + mag * 160, airTime);
    airLp.frequency.exponentialRampToValueAtTime(105, airTime + airDur);
    airLp.Q.value = 1.2;

    const airGain = this.ctx.createGain();
    airGain.gain.setValueAtTime(0.0001, airTime);
    airGain.gain.linearRampToValueAtTime(0.032 * mag, airTime + 0.025);
    airGain.gain.exponentialRampToValueAtTime(0.0001, airTime + airDur);

    airSrc.connect(airLp);
    airLp.connect(airGain);
    airGain.connect(panner);
    airSrc.start(airTime, Math.random() * 2.0, airDur + 0.02);

    const thudTime = airTime + 0.034;
    const thudDur = 0.085;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(112 + mag * 24, thudTime);
    osc.frequency.exponentialRampToValueAtTime(52, thudTime + thudDur);

    const thudLp = this.ctx.createBiquadFilter();
    thudLp.type = 'lowpass';
    thudLp.frequency.value = 190;

    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, thudTime);
    thudGain.gain.linearRampToValueAtTime(0.028 * mag, thudTime + 0.008);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, thudTime + thudDur);

    osc.connect(thudLp);
    thudLp.connect(thudGain);
    thudGain.connect(panner);
    osc.start(thudTime);
    osc.stop(thudTime + thudDur + 0.01);
  }

  /**
   * Toggle mute state and return new muted boolean.
   */
  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.isMuted) {
      this.stopMovement();
    } else {
      this.ensureContext();
    }
    return this.isMuted;
  }
}
