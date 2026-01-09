import { useSelector } from 'react-redux';
import { commandsSelector } from './selectors';

export const usePluginCommands = () => useSelector(commandsSelector);
