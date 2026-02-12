import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TUploadEmojiProps = {
  uploadEmoji: () => void;
  isUploading: boolean;
};

const UploadEmoji = memo(({ uploadEmoji, isUploading }: TUploadEmojiProps) => {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-1 items-center justify-center">
      <CardContent className="py-12 text-center text-muted-foreground max-w-md">
        <div className="text-4xl mb-4">😀</div>
        <h3 className="font-medium mb-2">{t('serverSettings.emojis.uploadTitle')}</h3>
        <p className="text-sm mb-4">
          {t('serverSettings.emojis.uploadDescription')}
        </p>
        <Button onClick={uploadEmoji} disabled={isUploading}>
          <Upload className="h-4 w-4 mr-2" />
          {t('serverSettings.emojis.uploadButton')}
        </Button>
      </CardContent>
    </Card>
  );
});

export { UploadEmoji };
