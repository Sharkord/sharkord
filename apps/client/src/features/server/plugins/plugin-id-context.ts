import { createContext, useContext } from 'react';

const PluginIdContext = createContext<string | null>(null);

const usePluginId = () => useContext(PluginIdContext);

export { PluginIdContext, usePluginId };
