import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const INTRO_CONFIG = {
  sounds: {
    open: '/sounds/monster-open.mp3',
    chew: '/sounds/monster-chew.mp3',
  },
  timing: {
    CHEW_DELAY_MS: 400,
    EXIT_MS: 2500,
    CHOMP_DURATION_MS: 1800,
  },
  colors: {
    background: 'radial-gradient(circle, var(--color-crimson-dark, var(--color-dark-burgundy)) 0%, var(--color-crimson-wine, var(--color-deep-maroon)) 100%)',
    scarlet: 'var(--color-crimson-scarlet, var(--color-deep-crimson))',
    wordmarkClass: 'text-white',
    taglineClass: 'text-rose-200/80',
    promptClass: 'text-white/70',
    promptBorderClass: 'border-white/20',
    progressTrackClass: 'bg-white/10',
    sweepClass: 'bg-gradient-to-r from-transparent via-white/20 to-transparent',
    progressGradient: 'linear-gradient(90deg, var(--color-crimson-scarlet, var(--color-deep-crimson)), var(--color-rose-300))',
  },
};

interface IntroSplashProps {
  isVisible: boolean;
  onFinish: () => void;
  duration?: number;
}

type AudioName = 'open' | 'chew';

export function IntroSplash({
  isVisible,
  onFinish,
  duration = INTRO_CONFIG.timing.EXIT_MS,
}: IntroSplashProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hasEntered, setHasEntered] = useState(false);
  const hasEnteredRef = useRef(false);
  const openAudioRef = useRef<HTMLAudioElement | null>(null);
  const chewAudioRef = useRef<HTMLAudioElement | null>(null);
  const chewTimeoutRef = useRef<number | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (prefersReducedMotion) {
      onFinish();
      return;
    }

    const openAudio = new Audio(INTRO_CONFIG.sounds.open);
    const chewAudio = new Audio(INTRO_CONFIG.sounds.chew);
    for (const audio of [openAudio, chewAudio]) {
      audio.preload = 'auto';
      audio.volume = 0.8;
      audio.load();
    }
    openAudioRef.current = openAudio;
    chewAudioRef.current = chewAudio;

    return () => {
      if (chewTimeoutRef.current !== null) {
        window.clearTimeout(chewTimeoutRef.current);
        chewTimeoutRef.current = null;
      }
      if (exitTimeoutRef.current !== null) {
        window.clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }

      for (const audio of [openAudio, chewAudio]) {
        audio.pause();
        audio.currentTime = 0;
      }
      openAudioRef.current = null;
      chewAudioRef.current = null;
    };
  }, [isVisible, onFinish, prefersReducedMotion]);

  const playAudio = async (audio: HTMLAudioElement | null, name: AudioName) => {
    if (!audio) {
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.warn(`Tambyte intro ${name} audio could not be played.`, error);
    }
  };

  const handleEnter = () => {
    if (hasEnteredRef.current || prefersReducedMotion) {
      return;
    }

    hasEnteredRef.current = true;
    setHasEntered(true);
    void playAudio(openAudioRef.current, 'open');

    chewTimeoutRef.current = window.setTimeout(() => {
      void playAudio(chewAudioRef.current, 'chew');
    }, INTRO_CONFIG.timing.CHEW_DELAY_MS);

    exitTimeoutRef.current = window.setTimeout(onFinish, duration);
  };

  const { colors, timing } = INTRO_CONFIG;
  const chompScales = [1, 0.85, 1.05, 0.85, 1.05, 0.85, 1.05, 1];

  return (
    <AnimatePresence>
      {isVisible && !prefersReducedMotion && (
        <motion.div
          className="fixed inset-0 z-[3000] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: colors.background }}
          role="status"
          aria-label="Loading Tambyte"
          initial={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 1.15,
            transition: { duration: 0.6, ease: [0.7, 0, 0.84, 0] },
          }}
        >
          <motion.div
            className="pointer-events-none absolute h-64 w-64 rounded-full blur-3xl sm:h-80 sm:w-80"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${colors.scarlet} 40%, transparent) 0%, transparent 72%)`,
            }}
            initial={{ opacity: 0.5, scale: 0.8 }}
            animate={
              hasEntered
                ? { opacity: [0.5, 0.9, 0.55], scale: [0.8, 1.2, 1] }
                : { opacity: [0.35, 0.6, 0.35], scale: [0.8, 1, 0.8] }
            }
            transition={
              hasEntered
                ? { duration: 1.3, times: [0, 0.65, 1], ease: 'easeOut' }
                : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
            }
            aria-hidden="true"
          />

          {!hasEntered ? (
            <button
              type="button"
              onClick={handleEnter}
              className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center bg-transparent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white"
              aria-label="Enter Tambyte"
            >
              <motion.svg
                viewBox="0 0 160 160"
                className="h-36 w-36 fill-white sm:h-44 sm:w-44"
                style={{ filter: `drop-shadow(0 0 22px ${colors.scarlet})` }}
                initial={{ scale: 0.92 }}
                animate={{ scale: [0.96, 1.04, 0.96] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              >
                <rect x="24" y="28" width="112" height="26" rx="13" />
                <rect x="67" y="42" width="26" height="91" rx="13" />
              </motion.svg>
              <motion.span
                className={`mt-8 rounded-full border ${colors.promptBorderClass} px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] ${colors.promptClass}`}
                animate={{ opacity: [0.55, 1, 0.55], scale: [0.98, 1, 0.98] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                Tap to bite
              </motion.span>
            </button>
          ) : (
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ scale: 0.9, y: 8 }}
              animate={{ scale: [0.9, 1.15, 1], y: [8, 0, 0] }}
              transition={{ type: 'spring', stiffness: 230, damping: 15, duration: 0.55 }}
            >
              <div className="relative">
                <motion.svg
                  viewBox="0 0 160 160"
                  className="h-36 w-36 fill-white sm:h-44 sm:w-44"
                  initial={{ scaleY: 1 }}
                  animate={{ scaleY: chompScales }}
                  transition={{
                    duration: timing.CHOMP_DURATION_MS / 1000,
                    delay: timing.CHEW_DELAY_MS / 1000,
                    ease: 'easeInOut',
                    times: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1],
                  }}
                  style={{
                    transformOrigin: 'center center',
                    filter: `drop-shadow(0 0 22px ${colors.scarlet})`,
                  }}
                  aria-hidden="true"
                >
                  <rect x="24" y="28" width="112" height="26" rx="13" />
                  <rect x="67" y="42" width="26" height="91" rx="13" />
                </motion.svg>
                <motion.div
                  className={`pointer-events-none absolute inset-y-0 left-0 w-7 blur-sm ${colors.sweepClass}`}
                  initial={{ x: '-140%', opacity: 0 }}
                  animate={{ x: '520%', opacity: [0, 1, 0] }}
                  transition={{
                    duration: 0.65,
                    delay: timing.CHEW_DELAY_MS / 1000 + 0.2,
                    ease: 'easeInOut',
                  }}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-2 flex h-12 overflow-hidden" role="img" aria-label="Tambyte">
                {'Tambyte'.split('').map((letter, index) => (
                  <span key={`${letter}-${index}`} className="overflow-hidden">
                    <motion.span
                      className={`inline-block text-4xl font-bold tracking-tight sm:text-5xl ${colors.wordmarkClass}`}
                      initial={{ y: '110%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        duration: 0.42,
                        delay: timing.CHEW_DELAY_MS / 1000 + 0.1 + index * 0.075,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      aria-hidden="true"
                    >
                      {letter}
                    </motion.span>
                  </span>
                ))}
              </div>

              <motion.p
                className={`mt-3 text-center text-[10px] font-medium uppercase tracking-[0.3em] sm:text-xs ${colors.taglineClass}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: timing.CHEW_DELAY_MS / 1000 + 0.85,
                  ease: 'easeOut',
                }}
              >
                Campus Study &amp; Tambay Map
              </motion.p>
            </motion.div>
          )}

          {hasEntered && (
            <motion.div
              className={`absolute inset-x-0 bottom-0 h-1 ${colors.progressTrackClass}`}
              aria-hidden="true"
            >
              <motion.div
                className="h-full origin-left"
                style={{ background: colors.progressGradient }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
