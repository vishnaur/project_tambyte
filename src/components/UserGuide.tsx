import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, Info, MapPinned, Plus, SlidersHorizontal, X } from 'lucide-react';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const GUIDE_STEPS = [
  {
    title: 'Explore the map',
    description: 'Tap a pin to preview a place. Zoom in or use Locate Me to find your way around campus.',
    icon: MapPinned,
  },
  {
    title: 'Find the right spot',
    description: 'Filter by category or choose Open now. On mobile, tap Filters in the top bar.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Save your favorites',
    description: 'Tap a spot’s heart to save it, then find it in Favorites. Saved spots stay on this device—no sign-in needed.',
    icon: Heart,
  },
  {
    title: 'Get the details',
    description: 'Open a spot for its hours, amenities, and directions. See something outdated? Report an issue.',
    icon: Info,
  },
  {
    title: 'Add a spot',
    description: 'Tap the + button on the map, mark the location, fill in the details, and submit it for admin review.',
    icon: Plus,
  },
];

export function UserGuide({ isOpen, onClose }: UserGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const currentStep = GUIDE_STEPS[stepIndex];
  const StepIcon = currentStep.icon;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    setStepIndex(0);
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-deep-maroon/65 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-guide-title"
        aria-describedby="user-guide-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gold/50 bg-warm-cream text-dark-burgundy shadow-2xl"
      >
        <div className="brand-header flex items-center justify-between px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200">Quick guide</p>
            <h2 id="user-guide-title" className="mt-1 text-lg font-bold">
              {currentStep.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Close guide"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-6 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-deep-crimson text-warm-cream shadow-sm ring-2 ring-gold/50">
              <StepIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p id="user-guide-description" className="pt-1 text-sm leading-6 text-slate-700">
              {currentStep.description}
            </p>
          </div>

          <div className="mt-7 flex items-center justify-between">
            <div className="flex items-center gap-2" aria-label={`Step ${stepIndex + 1} of ${GUIDE_STEPS.length}`}>
              {GUIDE_STEPS.map((guideStep, index) => (
                <span
                  key={guideStep.title}
                  className={`h-2 rounded-full transition-all ${
                    index === stepIndex ? 'w-6 bg-deep-crimson' : 'w-2 bg-gold/50'
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-medium text-slate-500">
                {stepIndex + 1} of {GUIDE_STEPS.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIndex((index) => index - 1)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-dark-burgundy transition-colors hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-crimson"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              )}
              {stepIndex < GUIDE_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStepIndex((index) => index + 1)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-deep-crimson px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-dark-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-10 rounded-lg bg-deep-crimson px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-dark-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  Tara G!
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
