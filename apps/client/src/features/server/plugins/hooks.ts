import { useSelector } from 'react-redux';
import { commandsSelector, flatCommandsSelector } from './selectors';

export const usePluginCommands = () => useSelector(commandsSelector);

export const useFlatPluginCommands = () => useSelector(flatCommandsSelector);
