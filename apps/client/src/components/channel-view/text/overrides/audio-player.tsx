import { cn } from '@/lib/utils';
import { Button } from '@sharkord/ui';
import { Play, Pause } from 'lucide-react';
import { memo, useRef, useState, useEffect } from 'react';

type TAudioPlayerProps = {
  url: string;
  className?: string;
};

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const AudioPlayer = memo(({ url, className }: TAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onDurationChange = () => {
       if (audio.duration !== Infinity) {
           setDuration(audio.duration);
       }
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('play', () => setIsPlaying(true));

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('pause', () => setIsPlaying(false));
      audio.removeEventListener('play', () => setIsPlaying(true));
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(() => {});
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <div className={cn('flex items-center gap-3 p-2 bg-secondary/30 rounded-lg border border-border/50 max-w-[320px] w-full', className)}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <Button size="icon" variant="secondary" onClick={togglePlay} className="h-9 w-9 rounded-full shrink-0 shadow-sm">
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </Button>
      <div className="flex flex-col flex-1 min-w-0 pr-1">
        <input 
          type="range" 
          min="0" 
          max={duration || 100} 
          value={currentTime} 
          onChange={onSeek}
          className="h-1.5 w-full bg-secondary/80 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between items-center mt-1 text-[11px] text-muted-foreground font-medium tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
});

export { AudioPlayer };
