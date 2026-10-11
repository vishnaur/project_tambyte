import { useCallback, useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import { getApprovedSpots } from './lib/supabase';
import { IntroSplash } from './components/IntroSplash';

export default function App() {
  const [isIntroVisible, setIsIntroVisible] = useState(() => {
    try {
      return window.sessionStorage.getItem('tambyte-intro-seen') !== 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    async function testBackend() {
      const spots = await getApprovedSpots();
      console.log('Database connected! Seed spots from Supabase:', spots);
    }
    testBackend();
  }, []);

  const handleIntroFinish = useCallback(() => {
    try {
      window.sessionStorage.setItem('tambyte-intro-seen', 'true');
    } catch {
      // The splash still completes when session storage is unavailable.
    }
    setIsIntroVisible(false);
  }, []);

  return (
    <>
      <IntroSplash isVisible={isIntroVisible} onFinish={handleIntroFinish} />
      <HomePage />
    </>
  );
}