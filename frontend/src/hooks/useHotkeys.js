import { useEffect } from 'react';

export default function useHotkeys({ onRun }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        onRun();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRun]);
}
