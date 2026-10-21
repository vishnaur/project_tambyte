import { lazy, Suspense, useCallback, useState } from 'react';
import { IntroSplash } from './components/IntroSplash';

const HomePage = lazy(() => import('./pages/HomePage'));

export default function App() {
  const [isIntroVisible, setIsIntroVisible] = useState(() => {
    try {
      return window.sessionStorage.getItem('tambyte-intro-seen') !== 'true';
    } catch {
      return true;
    }
  });
  const [isIntroFinished, setIsIntroFinished] = useState(() => {
    try {
      return window.sessionStorage.getItem('tambyte-intro-seen') === 'true';
    } catch {
      return false;
    }
  });

  const handleIntroFinish = useCallback(() => {
    try {
      window.sessionStorage.setItem('tambyte-intro-seen', 'true');
    } catch {
      // The splash still completes when session storage is unavailable.
    }
    setIsIntroFinished(true);
    setIsIntroVisible(false);
  }, []);

  return (
    <>
      <IntroSplash isVisible={isIntroVisible} onFinish={handleIntroFinish} />
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-warm-cream text-sm font-medium text-dark-burgundy">
            Loading Tambyte...
          </main>
        }
      >
        <HomePage isIntroFinished={isIntroFinished} />
      </Suspense>
    </>
  );
}