import type {
  TPluginHttpMethod,
  TPluginHttpRouteHandler
} from '@sharkord/plugin-sdk';
import type { PluginLogger } from './plugin-logger';

type TPluginHttpRoute = {
  method: TPluginHttpMethod;
  path: string;
  handler: TPluginHttpRouteHandler;
};

const supportedHttpMethods: TPluginHttpMethod[] = [
  'GET',
  'POST',
  'PATCH',
  'DELETE',
  'OPTIONS'
];

const isPluginHttpMethod = (method: string): method is TPluginHttpMethod => {
  return supportedHttpMethods.includes(method as TPluginHttpMethod);
};

const isWildcardRoutePath = (routePath: string) => routePath.endsWith('/*');

const matchesWildcardRoutePath = (
  registeredPath: string,
  routePath: string
) => {
  if (!isWildcardRoutePath(registeredPath)) {
    return false;
  }

  const prefix = registeredPath.slice(0, -2);

  if (!prefix) {
    return true;
  }

  return routePath === prefix || routePath.startsWith(`${prefix}/`);
};

class PluginHttpRouteRegistry {
  private routes = new Map<string, TPluginHttpRoute[]>();

  constructor(private readonly pluginLogger: PluginLogger) {}

  public register = (
    pluginId: string,
    method: TPluginHttpMethod,
    routePath: string,
    handler: TPluginHttpRouteHandler
  ) => {
    if (!isPluginHttpMethod(method)) {
      throw new Error(`HTTP method '${method}' is not supported.`);
    }

    if (!routePath.startsWith('/')) {
      throw new Error(`HTTP route path '${routePath}' must start with '/'.`);
    }

    if (
      routePath.includes('*') &&
      (!isWildcardRoutePath(routePath) ||
        routePath.indexOf('*') !== routePath.length - 1)
    ) {
      throw new Error(
        `HTTP route path '${routePath}' can only use '*' as the final segment.`
      );
    }

    const pluginRoutes = this.routes.get(pluginId) ?? [];
    const existingIndex = pluginRoutes.findIndex(
      (route) => route.method === method && route.path === routePath
    );

    if (existingIndex !== -1) {
      this.pluginLogger.log(
        pluginId,
        'error',
        `HTTP route '${method} ${routePath}' is already registered. Overwriting.`
      );

      pluginRoutes.splice(existingIndex, 1);
    }

    pluginRoutes.push({ method, path: routePath, handler });

    this.routes.set(pluginId, pluginRoutes);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Registered HTTP route: ${method} /plugins/${pluginId}${routePath}`
    );
  };

  public get = (
    pluginId: string,
    method: TPluginHttpMethod,
    routePath: string
  ): TPluginHttpRouteHandler | undefined => {
    const pluginRoutes = this.routes.get(pluginId);

    const exactMatch = pluginRoutes?.find(
      (route) => route.method === method && route.path === routePath
    );

    if (exactMatch) {
      return exactMatch.handler;
    }

    const wildcardMatches = pluginRoutes
      ?.filter(
        (route) =>
          route.method === method &&
          matchesWildcardRoutePath(route.path, routePath)
      )
      .sort((a, b) => b.path.length - a.path.length);

    return wildcardMatches?.[0]?.handler;
  };

  public unload = (pluginId: string) => {
    const pluginRoutes = this.routes.get(pluginId);

    if (!pluginRoutes || pluginRoutes.length === 0) {
      return;
    }

    this.routes.delete(pluginId);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Unregistered ${pluginRoutes.length} HTTP route(s)`
    );
  };
}

export { isPluginHttpMethod, PluginHttpRouteRegistry, supportedHttpMethods };
