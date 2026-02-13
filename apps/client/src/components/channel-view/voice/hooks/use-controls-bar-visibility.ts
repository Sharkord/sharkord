import { useEffect, useState } from 'react';

const useControlsBarVisibility = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isBottomZone = e.clientY > window.innerHeight * 0.8;
      setIsVisible(isBottomZone);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return isVisible;
};

export { useControlsBarVisibility };
