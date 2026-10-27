import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const answerSourcePickCall = defineIpc({
  channel: IpcChannel.ANSWER_SOURCE_PICK,
  args: z.tuple([z.number().int(), z.string().max(500).nullable()]),
  result: z.void()
});

const registerAnswerSourcePick = ({ sourcePicker, isShell }: TIpcContext) => {
  handleIpc(
    answerSourcePickCall,
    (requestId, sourceId) => {
      sourcePicker.answer(requestId, sourceId);
    },
    isShell
  );
};

export { answerSourcePickCall, registerAnswerSourcePick };
