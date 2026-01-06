import { memo } from 'react';

type TTypingDotsProps = {
  className?: string;
};

const TypingDots = memo(({ className = '' }: TTypingDotsProps) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
    </div>
  );
});

TypingDots.displayName = 'TypingDots';

export { TypingDots };
