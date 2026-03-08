import { Card, CardContent, CardHeader, CardTitle } from '@sharkord/ui';
import { Activity, File, Link, MessageSquareText } from 'lucide-react';
import { memo } from 'react';
import { ModViewScreen, useModViewContext } from '../context';

const ServerActivity = memo(() => {
  const { files, messages, links, setView } = useModViewContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Server Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div
          className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/30 rounded cursor-pointer"
          onClick={() => setView(ModViewScreen.MESSAGES)}
        >
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Messages</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {messages.length}
          </span>
        </div>

        <div
          className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/30 rounded cursor-pointer"
          onClick={() => setView(ModViewScreen.LINKS)}
        >
          <div className="flex items-center gap-3">
            <Link className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Links</span>
          </div>
          <span className="text-sm text-muted-foreground">{links.length}</span>
        </div>

        <div
          className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/30 rounded cursor-pointer"
          onClick={() => setView(ModViewScreen.FILES)}
        >
          <div className="flex items-center gap-3">
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Files</span>
          </div>
          <span className="text-sm text-muted-foreground">{files.length}</span>
        </div>
      </CardContent>
    </Card>
  );
});

export { ServerActivity };
