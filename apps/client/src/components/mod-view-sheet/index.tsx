import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { setModViewOpen } from '@/features/app/actions';
import { useModViewOpen } from '@/features/app/hooks';
import { useAdminUserInfo } from '@/features/server/admin/hooks';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ModViewContext, ModViewScreen, type TModViewContext } from './context';
import { ModViewContent } from './mod-view-content';

type TContentWrapperProps = {
  userId: number;
};

const ContentWrapper = memo(({ userId }: TContentWrapperProps) => {
  const [currentView, setCurrentView] = useState<ModViewScreen | undefined>(
    undefined
  );
  const { user, loading, refetch, logins, files, messages } =
    useAdminUserInfo(userId);

  const contextValue = useMemo<TModViewContext>(() => {
    const links: string[] = messages
      .map((msg) => {
        const content = msg.content ?? '';
        const urls: string[] = [];

        const hrefRegex = /href="([^"]+)"/g;
        let match;
        while ((match = hrefRegex.exec(content)) !== null) {
          const url = match[1];
          if (url.startsWith('http://') || url.startsWith('https://')) {
            urls.push(url);
          }
        }

        const plainUrlRegex =
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
        let plainMatch;
        while ((plainMatch = plainUrlRegex.exec(content)) !== null) {
          urls.push(plainMatch[0]);
        }

        return urls;
      })
      .flat()
      .filter((value, index, self) => self.indexOf(value) === index);

    return {
      userId,
      user: user!,
      logins,
      files,
      messages,
      links,
      refetch,
      view: currentView,
      setView: setCurrentView
    };
  }, [userId, refetch, files, user, logins, messages, currentView]);

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <ModViewContext.Provider value={contextValue}>
      <ModViewContent key={userId} />
    </ModViewContext.Provider>
  );
});

const ModViewSheet = memo(() => {
  const { isOpen, userId } = useModViewOpen();

  const handleClose = useCallback(() => {
    setModViewOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, handleClose]);

  return (
    <Sheet defaultOpen={false} open={isOpen}>
      <SheetContent close={handleClose}>
        <SheetTitle className="sr-only">User Moderation Panel</SheetTitle>
        {userId && <ContentWrapper userId={userId} />}
      </SheetContent>
    </Sheet>
  );
});

export { ModViewSheet };
