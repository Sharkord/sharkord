import { cn } from '@/lib/utils';
import { memo, type CSSProperties } from 'react';

// the bars scale with transform so the endless animation stays on the compositor, animating
// height or y repaints the whole sidebar on every frame for everyone who can see the channel
const BAR_STYLES = [
  { maxHeight: 10, delay: 0 },
  { maxHeight: 16, delay: 0.2 },
  { maxHeight: 12, delay: 0.4 },
  { maxHeight: 20, delay: 0.6 },
  { maxHeight: 10, delay: 0.8 }
].map(({ maxHeight, delay }) => ({
  height: `${(maxHeight / 24) * 100}%`,
  animationDelay: `${delay}s`,
  '--min-scale': 6 / maxHeight
})) as CSSProperties[];

type TIndicatorProps = {
  className?: string;
  isScreenSharing?: boolean;
};

const Waveform = memo(({ className, isScreenSharing }: TIndicatorProps) => {
  if (isScreenSharing) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-4 w-4 animate-in zoom-in-75 duration-300',
          className
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <path
            d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            className="animate-eye-blink"
            cx="12"
            cy="12"
            r="3"
            fill="currentColor"
          />
        </svg>
        <style>{`
          @keyframes eye-blink {
            0%, 90%, 100% { transform: scale(1); opacity: 1; }
            95% { transform: scale(0.1); opacity: 0.5; }
          }
          .animate-eye-blink {
            transform-origin: center;
            animation: eye-blink 4s infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-[1.33px] h-4 w-4 animate-in fade-in duration-700',
        className
      )}
    >
      {BAR_STYLES.map((style, index) => (
        <span
          key={index}
          className="animate-wf-loop w-[1.33px] rounded-full bg-current"
          style={style}
        />
      ))}

      <style>{`
        @keyframes wf-pulsate {
          0%, 100% { transform: scaleY(var(--min-scale)); }
          50% { transform: scaleY(1); }
        }

        .animate-wf-loop {
          animation: wf-pulsate 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

export { Waveform };
