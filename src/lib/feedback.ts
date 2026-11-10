/**
 * Tactile & Acoustic Micro-Feedback Utility for Sautika
 * Uses Web Audio API for synthetic offline-ready audio cues
 * and Vibration API (navigator.vibrate) for mobile micro-haptics.
 * 
 * Completely non-intrusive, zero-download, fails silently when unsupported.
 */

export type FeedbackType = 'record-start' | 'record-stop' | 'success' | 'chip';

// Vibration patterns in milliseconds (subtle, non-disruptive)
const HAPTIC_PATTERNS: Record<FeedbackType, number | number[]> = {
  'record-start': [18],              // Crisp micro-tap on mic press
  'record-stop': [12, 35, 14],       // Double micro-tap on mic release
  'success': [22, 50, 26],           // Gentle confirmation cadence
  'chip': [10],                      // Ultra-light touch tick
};

let sharedAudioCtx: AudioContext | null = null;

/**
 * Lazily obtains or initializes a shared AudioContext.
 * Respects browser autoplay policies by resuming on user interaction.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Triggers subtle device vibration if supported.
 * Fails silently on iOS Safari or devices without vibration hardware.
 */
export function triggerHaptic(type: FeedbackType = 'chip'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(HAPTIC_PATTERNS[type]);
    }
  } catch {
    // Fail silently
  }
}

/**
 * Plays a pleasant, ultra-short synthetic audio micro-cue via Web Audio API.
 * Uses low gain (~0.04 to 0.07) so sounds are soft, non-intrusive, and pleasant.
 */
export function playAudioCue(type: FeedbackType = 'chip'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === 'record-start') {
      // Crisp rising pop (500Hz -> 850Hz over 35ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.035);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'record-stop') {
      // Warm release click (650Hz -> 320Hz over 45ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.045);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'success') {
      // Gentle harmonious two-tone chime (G5: 784Hz -> C6: 1046Hz)
      const playTone = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.05, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + delay + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration + 0.01);
      };

      playTone(784, 0, 0.09);
      playTone(1046, 0.055, 0.12);
    } else if (type === 'chip') {
      // Ultra-short featherwood tick (1300Hz, 18ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1300, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.02);
    }
  } catch {
    // Fail silently without interrupting UI flow
  }
}

/**
 * Triggers coordinated tactile (haptic) and acoustic (sound) feedback cues.
 */
export function triggerFeedback(
  type: FeedbackType,
  options?: { haptic?: boolean; audio?: boolean }
): void {
  const { haptic = true, audio = true } = options ?? {};
  if (haptic) triggerHaptic(type);
  if (audio) playAudioCue(type);
}

