import { FullScreenImage } from '@/components/fullscreen-image/content';
import { Button } from '@sharkord/ui';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { ImageWithFallback } from './image-with-fallback';

type TMarketplaceScreenshotsProps = {
  pluginId: string;
  pluginName: string;
  screenshots: string[];
};

const MarketplaceScreenshots = memo(
  ({ pluginId, pluginName, screenshots }: TMarketplaceScreenshotsProps) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({
      align: 'start',
      loop: false,
      slidesToScroll: 1
    });

    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    useEffect(() => {
      if (!emblaApi) return;

      const updateButtons = () => {
        setCanScrollPrev(emblaApi.canScrollPrev());
        setCanScrollNext(emblaApi.canScrollNext());
      };

      updateButtons();

      emblaApi.on('select', updateButtons);
      emblaApi.on('reInit', updateButtons);

      return () => {
        emblaApi.off('select', updateButtons);
        emblaApi.off('reInit', updateButtons);
      };
    }, [emblaApi]);

    const handlePrev = useCallback(() => {
      emblaApi?.scrollPrev();
    }, [emblaApi]);

    const handleNext = useCallback(() => {
      emblaApi?.scrollNext();
    }, [emblaApi]);

    return (
      <div className="relative">
        <div className="w-full overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3">
            {screenshots.map((url, index) => (
              <div
                key={`${pluginId}-shot-${index}`}
                className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.3333%]"
              >
                <FullScreenImage
                  src={url}
                  alt={`${pluginName} screenshot ${index + 1}`}
                  className="h-28 w-full rounded-md object-cover"
                  as={ImageWithFallback}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-y-0 left-0 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/80 shadow-sm"
            onClick={handlePrev}
            disabled={!canScrollPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/80 shadow-sm"
            onClick={handleNext}
            disabled={!canScrollNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
);

export { MarketplaceScreenshots };
