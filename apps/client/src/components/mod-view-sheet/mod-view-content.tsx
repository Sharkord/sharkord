import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { memo, useCallback } from 'react';
import { ModViewScreen, useModViewContext } from './context';
import { Details } from './details';
import { Header } from './header';
import { ServerActivity } from './server-activity';
import { Files } from './server-activity/files';
import { Links } from './server-activity/links';
import { Messages } from './server-activity/messages';

type TWrapperProps = {
  children: React.ReactNode;
};

const Wrapper = memo(({ children }: TWrapperProps) => {
  const { setView } = useModViewContext();

  const onBackClick = useCallback(() => {
    setView(undefined);
  }, [setView]);

  return (
    <div className="w-full space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBackClick}
        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 mr-1" />
        Go back
      </Button>
      {children}
    </div>
  );
});

type TRoutingProps = {
  view: ModViewScreen | undefined;
};

const Routing = memo(({ view }: TRoutingProps) => {
  if (view === ModViewScreen.FILES) {
    return (
      <Wrapper>
        <Files />
      </Wrapper>
    );
  }

  if (view === ModViewScreen.MESSAGES) {
    return (
      <Wrapper>
        <Messages />
      </Wrapper>
    );
  }

  if (view === ModViewScreen.LINKS) {
    return (
      <Wrapper>
        <Links />
      </Wrapper>
    );
  }

  return (
    <>
      <ServerActivity />
      <Details />
    </>
  );
});

const ModViewContent = memo(() => {
  const { view } = useModViewContext();

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        <Header />
        <div className="border-t border-border" />
        <Routing view={view} />
      </div>
    </div>
  );
});

export { ModViewContent };
