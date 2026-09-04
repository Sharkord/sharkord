// what a plugin's client code does when it wants one enum: the whole barrel is
// the import, and the bundler has to drop the rest
import { ChannelType, PluginSlot } from '../../index';

export const probe = `${ChannelType.TEXT}:${PluginSlot.TOPBAR_RIGHT}`;
