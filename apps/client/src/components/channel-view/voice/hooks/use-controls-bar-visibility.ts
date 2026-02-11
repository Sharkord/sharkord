import { useEffect, useState } from 'react';

const useControlsBarVisibility = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isBottomHalf = e.clientY > window.innerHeight / 2;
      const isRightZone = e.clientX > window.innerWidth - 300;
      setIsVisible(isBottomHalf || isRightZone);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return isVisible;
};

export { useControlsBarVisibility };
