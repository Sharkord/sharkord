import Queue from 'queue';
import { publishMessage, publishExternalMessage } from '../../db/publishers';
import { processMessageMetadata } from './get-message-metadata';

const messageMetadataQueue = new Queue({
  concurrency: 1,
  autostart: true,
  timeout: 3000
});

messageMetadataQueue.autostart = true;

const enqueueProcessMetadata = (content: string, messageId: number) => {
  messageMetadataQueue.push(async (callback) => {
    const updatedMessage = await processMessageMetadata(content, messageId);

    if (updatedMessage) {
      if( updatedMessage.externalChannelId ) {
        publishExternalMessage(messageId, undefined, 'update');
      }
      else {
        publishMessage(messageId, undefined, 'update');
      }
    }

    callback?.();
  });
};

export { enqueueProcessMetadata, messageMetadataQueue };
 