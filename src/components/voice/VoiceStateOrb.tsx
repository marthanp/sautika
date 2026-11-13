'use client';

import { Mic, Loader2, Volume2 } from 'lucide-react';
import AudioWaveformVisualizer from '@/components/voice/AudioWaveformVisualizer';
import { triggerFeedback } from '@/lib/feedback';

interface VoiceStateOrbProps {
  isRecording: boolean;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  disabled?: boolean;
  activeDialectName?: string;
  analyser?: AnalyserNode | null;
  className?: string;
}

export default function VoiceStateOrb({
  isRecording,
  isProcessing = false,
  isSpeaking = false,
  onClick,
  size = 'md',
  label,
  disabled = false,
  activeDialectName,
  analyser,
  className = '',
}: VoiceStateOrbProps) {
  // Dimensions based on size
  const sizeConfig = {
    sm: {
      btn: 'h-11 w-11',
      icon: 'h-4 w-4',
      ripple: '-inset-2.5',
      rippleOuter: '-inset-5',
      barCount: 4,
    },
    md: {
      btn: 'h-14 w-14',
      icon: 'h-6 w-6',
      ripple: '-inset-3',
      rippleOuter: '-inset-7',
      barCount: 5,
    },
    lg: {
      btn: 'h-20 w-20',
      icon: 'h-8 w-8',
      ripple: '-inset-4',
      rippleOuter: '-inset-10',
      barCount: 7,
    },
  }[size];

  const handleClick = () => {
    if (disabled || isProcessing) return;
    triggerFeedback(isRecording ? 'record-stop' : 'record-start');
    onClick();
  };

  const getStatusText = (): string => {
    if (isRecording) return `Listening${activeDialectName ? ` in ${activeDialectName}` : ''}… Tap to finish`;
    if (isProcessing) return `Transcribing${activeDialectName ? ` with Sunbird AI` : ''}…`;
    if (isSpeaking) return `Speaking in ${activeDialectName || 'local dialect'}…`;
    return label || (activeDialectName ? `Speak in ${activeDialectName}` : 'Speak to Sautika');
  };

  const getAriaLabel = (): string => {
    if (isRecording) return 'Stop listening to your voice input';
    if (isProcessing) return 'Transcribing your audio, please wait';
    if (isSpeaking) return 'Voice output playing';
    return label || (activeDialectName ? `Start speaking in ${activeDialectName}` : 'Start voice input');
  };

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      {/* Container with antigravity bobbing when idle */}
      <div className={`relative flex items-center justify-center ${!isRecording && !isProcessing ? 'animate-antigravity-bob' : ''}`}>
        
        {/* Layer 1: Concentric Organic Sonic Spring Ripple 1 */}
        {isRecording && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute ${sizeConfig.rippleOuter} rounded-full bg-red-400/25 animate-sonic-ripple`}
          />
        )}

        {/* Layer 2: Concentric Organic Sonic Spring Ripple 2 (delayed) */}
        {isRecording && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute ${sizeConfig.ripple} rounded-full bg-amber-400/35 animate-sonic-ripple-delayed-1`}
          />
        )}

        {/* Layer 3: Concentric Organic Sonic Spring Ripple 3 (delayed) */}
        {isRecording && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute ${sizeConfig.ripple} rounded-full bg-red-500/20 animate-sonic-ripple-delayed-2`}
          />
        )}

        {/* Processing kinetic orbit ring */}
        {isProcessing && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2.5 rounded-full border-2 border-dashed border-sun animate-orbit-spin opacity-80"
          />
        )}

        {/* Primary Interactive Voice Orb Button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isProcessing}
          aria-label={getAriaLabel()}
          aria-pressed={isRecording}
          className={`relative z-10 flex shrink-0 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-sun/60 ${sizeConfig.btn} ${
            isRecording
              ? 'animate-spring-pulse bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white shadow-[0_0_28px_rgba(239,68,68,0.55)] scale-105'
              : isProcessing
              ? 'bg-gradient-to-tr from-navy via-navy-2 to-[#1b3457] text-sun shadow-[0_0_20px_rgba(255,196,0,0.4)]'
              : isSpeaking
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-102'
              : 'bg-gradient-to-tr from-sun via-amber-400 to-[#ffe066] text-ink shadow-[0_6px_22px_rgba(255,196,0,0.35)] hover:shadow-[0_8px_28px_rgba(255,196,0,0.5)] hover:scale-105 active:scale-95'
          }`}
        >
          {isProcessing ? (
            <Loader2 className={`${sizeConfig.icon} animate-spin text-sun`} aria-hidden="true" />
          ) : isRecording ? (
            <AudioWaveformVisualizer
              analyser={analyser}
              isRecording={isRecording}
              mode="compact-bars"
              barCount={sizeConfig.barCount}
              color="white"
            />
          ) : isSpeaking ? (
            <Volume2 className={`${sizeConfig.icon} animate-bounce text-white`} aria-hidden="true" />
          ) : (
            <Mic className={`${sizeConfig.icon} transition-transform duration-300 group-hover:scale-110`} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Screen reader status announcements */}
      <span role="status" aria-live="polite" className="sr-only">
        {getStatusText()}
      </span>
    </div>
  );
}
