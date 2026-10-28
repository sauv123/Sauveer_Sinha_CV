/**
 * Tactile Studio Paper & Die-Cut Vinyl Sticker Foley Synthesizer (Web Audio API)
 * Generates synchronized, spatialized 120gsm cotton paper & vinyl sticker acoustics:
 *  - 2D stereo panning coupled to the active corner / traveling fold crease
 *  - Stochastic stick-slip cellulose micro-fiber impulses during bends
 *  - Dual-layer continuous movement: warm 240Hz sheet-body resonance + crisp fiber friction
 *  - Two-stage release: aerodynamic air-pocket whoosh followed by damped tabletop contact thud
 *  - Vinyl Sticker Foley: corner hover flutter and tactile thumb-press tap
 */

export class PaperSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterOut = null;
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
    this.lastCornerHoverTime = 0;
  }

  /**
   * Initialize and unlock AudioContext on any user gesture.
   * Returns true as soon as `this.ctx` exists so scheduled nodes on the first click are never dropped.
   */
  ensureContext() {
    if (this.isMuted) return false;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();

      // Studio master bus (compressor + master gain) for warm, clearly audible output on laptop speakers
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 3.0;
      comp.attack.value = 0.003;
      comp.release.value = 0.12;

      const masterGain = this.ctx.createGain();
      masterGain.gain.value = 0.92;

      comp.connect(masterGain);
      masterGain.connect(this.ctx.destination);
      this.masterOut = comp;

      this._buildCelluloseNoiseBuffer();
      this._setupContinuousRustleChain();
      this.isInitialized = true;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return Boolean(this.ctx);
  }

  /**
   * Helper to create a stereo panner node connected to the master bus.
   */
  _createPanner(panValue = 0) {
    const dest = this.masterOut || this.ctx.destination;
    if (this.ctx && typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, panValue));
      panner.connect(dest);
      return panner;
    }
    const dummy = this.ctx.createGain();
    dummy.pan = { value: 0, setTargetAtTime: () => {}, setValueAtTime: () => {} };
    dummy.connect(dest);
    return dummy;
  }

  /**
   * Creates a 4.5-second normalized stereo buffer combining warm 1/f pink fibrous noise
   * with organic micro-slip cellulose grain clusters.
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
        // High-presence normalized pink cellulose fiber noise
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.24;
        b6 = white * 0.115926;

        if (Math.random() < 0.008) {
          grainEnv = 0.5 + Math.random() * 0.5;
        }
        grainEnv *= 0.9935;

        if (Math.random() < 0.0018) {
          microSnap = (Math.random() * 2 - 1) * 0.65;
        }
        microSnap *= 0.92;

        const fadeFrames = 2048;
        let windowMult = 1.0;
        if (i < fadeFrames) windowMult = i / fadeFrames;
        else if (i > length - fadeFrames) windowMult = (length - i) / fadeFrames;

        const sample = (pink * (0.65 + 0.35 * grainEnv) + microSnap * 0.22) * windowMult;
        data[i] = Math.max(-0.98, Math.min(0.98, sample));
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
    this.moveFilterLow.frequency.value = 380;
    this.moveFilterLow.Q.value = 0.7;

    this.moveFormant = this.ctx.createBiquadFilter();
    this.moveFormant.type = 'bandpass';
    this.moveFormant.frequency.value = 1320;
    this.moveFormant.Q.value = 1.15;

    this.moveFilterHigh = this.ctx.createBiquadFilter();
    this.moveFilterHigh.type = 'lowpass';
    this.moveFilterHigh.frequency.value = 5600;
    this.moveFilterHigh.Q.value = 0.55;

    this.bodyResonance = this.ctx.createBiquadFilter();
    this.bodyResonance.type = 'bandpass';
    this.bodyResonance.frequency.value = 240;
    this.bodyResonance.Q.value = 1.75;

    this.bodyGain = this.ctx.createGain();
    this.bodyGain.gain.value = 0.65;

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

    this.moveSource.start(0);
  }

  /**
   * Fires a delicate stick-slip cellulose fiber impulse during bending.
   */
  _triggerFiberCrackle(intensity = 0.5, pan = 0.0, curlTension = 0.5) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCrackleTime < 0.032) return;
    this.lastCrackleTime = now;

    const dur = 0.032 + Math.random() * 0.022;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.10 + Math.random() * 0.35;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const baseFreq = 1950 + curlTension * 1300 + Math.random() * 800;
    bp.frequency.setValueAtTime(baseFreq, now);
    bp.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + dur);
    bp.Q.value = 2.4 + Math.random() * 1.4;

    const gain = this.ctx.createGain();
    const peak = Math.min(0.24, 0.08 + 0.14 * intensity);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);

    src.start(now, Math.random() * 3.0, dur + 0.015);
  }

  /**
   * Subtle corner-hover paper whisper when the cursor approaches a corner/edge.
   */
  triggerCornerBeckon(pan = 0.25) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCornerHoverTime < 0.22) return;
    this.lastCornerHoverTime = now;

    const dur = 0.075;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.05 + Math.random() * 0.12;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, now);
    bp.frequency.exponentialRampToValueAtTime(2150, now + dur);
    bp.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    src.start(now, Math.random() * 2.5, dur + 0.015);
  }

  /**
   * Subtle vinyl sticker edge flutter when hovering over a personality sticker.
   */
  triggerStickyHover(pan = 0.0) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    if (now - this.lastHoverTime < 0.075) return;
    this.lastHoverTime = now;

    const dur = 0.065;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.2 + Math.random() * 0.15;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2100, now);
    bp.frequency.exponentialRampToValueAtTime(1450, now + dur);
    bp.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.010);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    src.start(now, Math.random() * 2.5, dur + 0.015);
  }

  /**
   * Signature tactile adhesive peel sound when lifting a sticker.
   */
  triggerStickyPeel(pan = 0.0) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const peelDur = 0.14;

    const panner = this._createPanner(pan);

    const tackSrc = this.ctx.createBufferSource();
    tackSrc.buffer = this.noiseBuffer;
    tackSrc.playbackRate.value = 1.38;

    const tackBp = this.ctx.createBiquadFilter();
    tackBp.type = 'bandpass';
    tackBp.frequency.setValueAtTime(2400, now);
    tackBp.frequency.exponentialRampToValueAtTime(5200, now + peelDur * 0.85);
    tackBp.Q.value = 2.4;

    const tackGain = this.ctx.createGain();
    tackGain.gain.setValueAtTime(0.0001, now);
    tackGain.gain.linearRampToValueAtTime(0.28, now + 0.025);
    tackGain.gain.exponentialRampToValueAtTime(0.0001, now + peelDur);

    tackSrc.connect(tackBp);
    tackBp.connect(tackGain);
    tackGain.connect(panner);
    tackSrc.start(now, Math.random() * 2.0, peelDur + 0.02);
  }

  /**
   * Tactile thumb-press & vinyl tap sound when clicking a personality sticker to zoom.
   */
  triggerStickyStick(pan = 0.0) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const dur = 0.095;

    const panner = this._createPanner(pan);

    // Crisp paper/vinyl brush
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.92;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1250, now);
    bp.frequency.exponentialRampToValueAtTime(380, now + dur);
    bp.Q.value = 1.3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    src.start(now, Math.random() * 2.0, dur + 0.02);

    // Warm low thumb tap
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(56, now + 0.065);

    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, now);
    thudGain.gain.linearRampToValueAtTime(0.22, now + 0.006);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

    osc.connect(thudGain);
    thudGain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Initial lift: crisp fingertip-on-cotton-edge pickup with warm 240Hz sheet flex.
   */
  triggerLift(intensity = 0.75, pan = 0.35) {
    if (!this.ensureContext()) return;

    const now = this.ctx.currentTime;
    const dur = 0.125;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.02 + Math.random() * 0.08;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, now);
    bp.frequency.exponentialRampToValueAtTime(2650, now + dur);
    bp.Q.value = 1.45;

    const bodyBp = this.ctx.createBiquadFilter();
    bodyBp.type = 'bandpass';
    bodyBp.frequency.setValueAtTime(260, now);
    bodyBp.Q.value = 1.5;

    const gain = this.ctx.createGain();
    const peak = Math.min(0.38, 0.28 * intensity);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);

    src.connect(bp);
    src.connect(bodyBp);
    bp.connect(gain);
    bodyBp.connect(gain);
    gain.connect(panner);

    src.start(now, Math.random() * 2.5, dur + 0.02);
  }

  /**
   * Continuous page movement: spatialized fibrous rustling + curvature-driven micro-crackle.
   */
  updateMovement(speed, curlAmount = 0.5, pan = 0.0) {
    if (!this.ensureContext() || !this.moveGain) return;

    const now = this.ctx.currentTime;
    this.smoothedSpeed = this.smoothedSpeed * 0.64 + speed * 0.36;

    const curlDelta = Math.abs(curlAmount - this.prevCurlAmount);
    this.prevCurlAmount = curlAmount;

    if (this.smoothedSpeed < 0.002) {
      this.moveGain.gain.setTargetAtTime(0.0, now, 0.018);
      return;
    }

    const shapedSpeed = Math.min(1.0, Math.pow(this.smoothedSpeed, 0.68));
    const archFactor = Math.sin(Math.PI * Math.min(1.0, Math.max(0.05, curlAmount)));
    const targetGain = shapedSpeed * 0.36 * (0.62 + 0.38 * archFactor);

    const targetFreq = 1020 + shapedSpeed * 1550 + (1.0 - archFactor) * 280;
    const targetQ = 1.25 - shapedSpeed * 0.32;
    const bodyFreq = 205 + (1.0 - archFactor) * 115 + shapedSpeed * 60;

    this.moveGain.gain.setTargetAtTime(targetGain, now, 0.020);
    this.moveFormant.frequency.setTargetAtTime(targetFreq, now, 0.025);
    this.moveFormant.Q.setTargetAtTime(targetQ, now, 0.025);
    if (this.bodyResonance) {
      this.bodyResonance.frequency.setTargetAtTime(bodyFreq, now, 0.030);
    }
    if (this.movePanner && this.movePanner.pan) {
      this.movePanner.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, pan)), now, 0.035);
    }

    this.crackleAccumulator += curlDelta * 14.0 + shapedSpeed * 0.18;
    if (this.crackleAccumulator > 0.34) {
      this.crackleAccumulator = 0;
      if (Math.random() < 0.80) {
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
      this.moveGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.018);
    }
  }

  /**
   * Subtle paper crease / tension settle when folding a corner or side open.
   */
  triggerCreaseHold(pan = 0.0) {
    this.stopMovement();
    if (!this.ensureContext()) return;

    const now = this.ctx.currentTime;
    const dur = 0.15;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.88;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(920, now);
    bp.frequency.exponentialRampToValueAtTime(380, now + dur);
    bp.Q.value = 1.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = this._createPanner(pan);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    src.start(now, Math.random() * 2.0, dur + 0.02);
  }

  /**
   * Two-stage page turn / release foley:
   *  1. Aerodynamic 120gsm cotton sheet sweep + trapped air-pocket escape whoosh
   *  2. Damped tabletop contact thud as the paper meets the studio desk surface
   */
  triggerRelease(travelMagnitude = 0.75, settleDurationSec = 0.46, pan = 0.0) {
    this.stopMovement();
    if (!this.ensureContext()) return;

    const now = this.ctx.currentTime;
    const mag = Math.max(0.25, Math.min(1.0, travelMagnitude));
    const dur = Math.max(0.22, Math.min(0.68, settleDurationSec));
    const panner = this._createPanner(pan);

    // 1. Crisp cotton paper sweep
    const flutterSrc = this.ctx.createBufferSource();
    flutterSrc.buffer = this.noiseBuffer;
    flutterSrc.playbackRate.value = 0.94 + Math.random() * 0.08;

    const flutterBp = this.ctx.createBiquadFilter();
    flutterBp.type = 'bandpass';
    flutterBp.frequency.setValueAtTime(1480 + mag * 460, now);
    flutterBp.frequency.exponentialRampToValueAtTime(540, now + dur * 0.88);
    flutterBp.Q.value = 1.15;

    const flutterGain = this.ctx.createGain();
    flutterGain.gain.setValueAtTime(0.0001, now);
    flutterGain.gain.linearRampToValueAtTime(0.38 * mag, now + dur * 0.22);
    flutterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.98);

    flutterSrc.connect(flutterBp);
    flutterBp.connect(flutterGain);
    flutterGain.connect(panner);
    flutterSrc.start(now, Math.random() * 2.0, dur + 0.04);

    // 2. Warm trapped air-pocket sigh
    const airTime = now + dur * 0.42;
    const airDur = 0.16;
    const airSrc = this.ctx.createBufferSource();
    airSrc.buffer = this.noiseBuffer;
    airSrc.playbackRate.value = 0.68;

    const airLp = this.ctx.createBiquadFilter();
    airLp.type = 'lowpass';
    airLp.frequency.setValueAtTime(380 + mag * 160, airTime);
    airLp.frequency.exponentialRampToValueAtTime(110, airTime + airDur);
    airLp.Q.value = 1.1;

    const airGain = this.ctx.createGain();
    airGain.gain.setValueAtTime(0.0001, airTime);
    airGain.gain.linearRampToValueAtTime(0.32 * mag, airTime + 0.025);
    airGain.gain.exponentialRampToValueAtTime(0.0001, airTime + airDur);

    airSrc.connect(airLp);
    airLp.connect(airGain);
    airGain.connect(panner);
    airSrc.start(airTime, Math.random() * 2.0, airDur + 0.02);

    // 3. Soft damped studio desk contact thud
    const thudTime = airTime + 0.032;
    const thudDur = 0.095;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(118 + mag * 26, thudTime);
    osc.frequency.exponentialRampToValueAtTime(48, thudTime + thudDur);

    const thudLp = this.ctx.createBiquadFilter();
    thudLp.type = 'lowpass';
    thudLp.frequency.value = 210;

    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, thudTime);
    thudGain.gain.linearRampToValueAtTime(0.28 * mag, thudTime + 0.008);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, thudTime + thudDur);

    osc.connect(thudLp);
    thudLp.connect(thudGain);
    thudGain.connect(panner);
    osc.start(thudTime);
    osc.stop(thudTime + thudDur + 0.015);
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
