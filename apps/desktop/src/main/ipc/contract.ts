import type { z } from 'zod';
import type { IPC_ROUTES } from './register-ipc';

type TIpcCalls = (typeof IPC_ROUTES)[number][0];
type TIpcChannel = TIpcCalls['channel'];
type TIpcCallOf<C extends TIpcChannel> = Extract<TIpcCalls, { channel: C }>;
type TIpcArgs<C extends TIpcChannel> = z.input<TIpcCallOf<C>['args']>;
type TIpcResult<C extends TIpcChannel> = z.output<TIpcCallOf<C>['result']>;

export type { TIpcArgs, TIpcChannel, TIpcResult };
