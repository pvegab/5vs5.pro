// Web Audio API Sound Effects Engine
// Provides subtle retro-futuristic sound effects for roulette ticker, draft lock, victory, and defeat

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  // Lazy initialization on first user interaction
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  
  // Resume if suspended (browser security policy)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  return audioCtx;
}

/**
 * Plays a discrete mechanical tick/chirp for roulette spinning
 */
export function playRouletteTick(pitchFactor = 1.0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Triangle wave gives a clean, slightly wooden mechanical click
    osc.type = 'triangle';
    // Slightly randomize or scale pitch according to speed
    const baseFreq = 800 * pitchFactor;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(300 * pitchFactor, now + 0.05);
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (err) {
    // Graceful fallback if audio is blocked or unsupported
    console.debug('Audio tick failed:', err);
  }
}

/**
 * Plays a mechanical dual-tone "locking" click sound
 */
export function playDraftLock() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const now = ctx.currentTime;
    
    // First solid low resonance click (ka)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(120, now);
    osc1.frequency.linearRampToValueAtTime(60, now + 0.06);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Second high tension lock snap (junk)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    // Slight offset to create double mechanical click sensation "ka-chunk"
    const startDelay = 0.03;
    osc2.frequency.setValueAtTime(320, now + startDelay);
    osc2.frequency.exponentialRampToValueAtTime(140, now + startDelay + 0.08);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.10, now + startDelay);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + startDelay + 0.08);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.07);
    
    osc2.start(now + startDelay);
    osc2.stop(now + startDelay + 0.09);
  } catch (err) {
    console.debug('Audio lock failed:', err);
  }
}

/**
 * Plays an immersive triumphant rising hex-arpeggio chime
 */
export function playVictorySound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const now = ctx.currentTime;
    // Major chord arpeggio for warm, epic victory sensation
    // C4, E4, G4, C5, E5, G5
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    
    freqs.forEach((freq, idx) => {
      const noteDelay = idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Warm sine note with soft triangle harmonic
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + noteDelay);
      
      // Give the final note more presence and sustain
      const duration = idx === freqs.length - 1 ? 0.6 : 0.35;
      const maxVolume = idx === freqs.length - 1 ? 0.08 : 0.04;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(maxVolume, now + noteDelay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + noteDelay + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + noteDelay);
      osc.stop(now + noteDelay + duration + 0.05);
    });
  } catch (err) {
    console.debug('Audio victory failed:', err);
  }
}

/**
 * Plays a tragic sweeping descending minor-dissonance beep
 */
export function playDefeatSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const now = ctx.currentTime;
    
    // Note 1: Descending heavy pitch
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth'; // Slightly buzzy for tragedy
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.linearRampToValueAtTime(85, now + 0.55);
    
    // Low pass filter to keep it from sounding harsh
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.55);
    
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.linearRampToValueAtTime(0.001, now + 0.55);
    
    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Note 2: Dissonant overlay note playing shortly after
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    const startDelay = 0.12;
    osc2.frequency.setValueAtTime(207.65, now + startDelay); // G#3 (creating clash with A/F tones)
    osc2.frequency.linearRampToValueAtTime(73.42, now + startDelay + 0.45); // D2
    
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.06, now + startDelay);
    gain2.gain.linearRampToValueAtTime(0.001, now + startDelay + 0.45);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.6);
    
    osc2.start(now + startDelay);
    osc2.stop(now + startDelay + 0.5);
  } catch (err) {
    console.debug('Audio defeat failed:', err);
  }
}
