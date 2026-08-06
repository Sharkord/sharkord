import type {
  TPluginHttpMethod,
  TPluginHttpRouteHandler
} from '@sharkord/plugin-sdk';
import { hasPrefixPathSegment, isSupportedHttpMethod } from '../http/helpers';
import type { PluginLogger } from './plugin-logger';

type TPluginHttpRoute = {
  method: TPluginHttpMethod;
  path: string;
  handler: TPluginHttpRouteHandler;
};

// a single '*' is only allowed as the last segment, e.g. '/api/*' or '/*'
const VALID_WILDCARD_PATH = /^[^*]*\/\*$/;

// '/hello/' and '/hello' are the same route, '/' stays '/'
const normalizeRoutePath = (routePath: string) =>
  routePath.replace(/\/+$/, '') || '/';

const matchesWildcardRoutePath = (registeredPath: string, routePath: string) =>
  registeredPath.endsWith('/*') &&
  hasPrefixPathSegment(routePath, registeredPath.slice(0, -2));

const getRouteKey = (method: TPluginHttpMethod, path: string) =>
  `${method} ${path}`;

class PluginHttpRouteRegistry {
  private routes = new Map<string, Map<string, TPluginHttpRoute>>();

  constructor(private readonly pluginLogger: PluginLogger) {}

  public register = (
    pluginId: string,
    method: TPluginHttpMethod,
    routePath: string,
    handler: TPluginHttpRouteHandler
  ) => {
    if (!isSupportedHttpMethod(method)) {
      throw new Error(`HTTP method '${method}' is not supported.`);
    }

    if (!routePath.startsWith('/')) {
      throw new Error(`HTTP route path '${routePath}' must start with '/'.`);
    }

    if (routePath.includes('*') && !VALID_WILDCARD_PATH.test(routePath)) {
      throw new Error(
        `HTTP route path '${routePath}' can only use '*' as the final segment.`
      );
    }

    const path = normalizeRoutePath(routePath);
    const key = getRouteKey(method, path);
    const pluginRoutes = this.routes.get(pluginId) ?? new Map();

    if (pluginRoutes.has(key)) {
      this.pluginLogger.log(
        pluginId,
        'error',
        `HTTP route '${key}' was already registered, replacing the previous handler.`
      );
    }

    pluginRoutes.set(key, { method, path, handler });

    this.routes.set(pluginId, pluginRoutes);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Registered HTTP route: ${method} /plugins/${pluginId}${path}`
    );
  };

  public get = (
    pluginId: string,
    method: TPluginHttpMethod,
    routePath: string
  ): TPluginHttpRouteHandler | undefined => {
    const pluginRoutes = this.routes.get(pluginId);

    if (!pluginRoutes) {
      return undefined;
    }

    const path = normalizeRoutePath(routePath);
    const exactMatch = pluginRoutes.get(getRouteKey(method, path));

    if (exactMatch) {
      return exactMatch.handler;
    }

    // the most specific wildcard wins, so '/api/v1/*' beats '/api/*'
    let wildcardMatch: TPluginHttpRoute | undefined;

    for (const route of pluginRoutes.values()) {
      if (route.method !== method) continue;
      if (!matchesWildcardRoutePath(route.path, path)) continue;

      if (!wildcardMatch || route.path.length > wildcardMatch.path.length) {
        wildcardMatch = route;
      }
    }

    return wildcardMatch?.handler;
  };

  public unload = (pluginId: string) => {
    this.routes.delete(pluginId);
  };
}

export { PluginHttpRouteRegistry };
