import { setPinnedCard } from '@/features/server/voice/actions';
import { usePinnedCard } from '@/features/server/voice/hooks';
import { useCallback } from 'react';

enum PinnedCardType {
  USER = 'user',
  SCREEN_SHARE = 'screen-share'
}

type TPinnedCard = {
  id: string;
  type: PinnedCardType;
  userId: number;
};

const usePinCardController = () => {
  const pinnedCard = usePinnedCard();

  const pinCard = useCallback((card: TPinnedCard) => {
    setPinnedCard(card);
  }, []);

  const unpinCard = useCallback(() => {
    setPinnedCard(undefined);
  }, []);

  const isPinned = useCallback(
    (cardId: string) => {
      return pinnedCard?.id === cardId;
    },
    [pinnedCard]
  );

  return {
    pinnedCard,
    pinCard,
    unpinCard,
    isPinned
  };
};

export { PinnedCardType, usePinCardController };
export type { TPinnedCard };
