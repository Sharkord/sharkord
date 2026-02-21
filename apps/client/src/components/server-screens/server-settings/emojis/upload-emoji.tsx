import { Button, Card, CardContent } from '@sharkord/ui';
import { Upload } from 'lucide-react';
import { memo } from 'react';

type TUploadEmojiProps = {
  uploadEmoji: () => void;
  isUploading: boolean;
};

const UploadEmoji = memo(({ uploadEmoji, isUploading }: TUploadEmojiProps) => {
  return (
    <Card className="flex flex-1 items-center justify-center">
      <CardContent className="py-12 text-center text-muted-foreground max-w-md">
        <div className="text-4xl mb-4">😀</div>
        <h3 className="font-medium mb-2">Upload Custom Emojis</h3>
        <p className="text-sm mb-4">
          Select an emoji to edit or upload new ones to customize your server
        </p>
        <Button onClick={uploadEmoji} disabled={isUploading}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Emoji
        </Button>
      </CardContent>
    </Card>
  );
});

export { UploadEmoji };
