import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import { getApprovedSpots } from './lib/supabase';

export default function App() {
  useEffect(() => {
    async function testBackend() {
      const spots = await getApprovedSpots();
      console.log('Database connected! Seed spots from Supabase:', spots);
    }
    testBackend();
  }, []);

  return <HomePage />;
}