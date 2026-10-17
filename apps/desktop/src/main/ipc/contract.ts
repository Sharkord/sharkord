import type { z } from 'zod';
import type { addServerCall } from './add-server';
import type { getRailVisibleCall } from './get-rail-visible';
import type { getStateCall } from './get-state';
import type { removeServerCall } from './remove-server';
import type { selectServerCall } from './select-server';
import type { setAddingCall } from './set-adding';
import type { setOverlayCall } from './set-overlay';
import type { setRailHiddenCall } from './set-rail-hidden';
import type { toggleRailCall } from './toggle-rail';

type TIpcCalls =
  | typeof getStateCall
  | typeof addServerCall
  | typeof selectServerCall
  | typeof removeServerCall
  | typeof setAddingCall
  | typeof setOverlayCall
  | typeof setRailHiddenCall
  | typeof getRailVisibleCall
  | typeof toggleRailCall;

type TIpcChannel = TIpcCalls['channel'];
type TIpcCallOf<C extends TIpcChannel> = Extract<TIpcCalls, { channel: C }>;
type TIpcArgs<C extends TIpcChannel> = z.input<TIpcCallOf<C>['args']>;
type TIpcResult<C extends TIpcChannel> = z.output<TIpcCallOf<C>['result']>;

export type { TIpcArgs, TIpcChannel, TIpcResult };
