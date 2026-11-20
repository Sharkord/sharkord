import { app, net, protocol } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';

const SHELL_SCHEME = 'sharkord-shell';
const RENDERER_PATH = path.join(__dirname, '../renderer');

const registerShellScheme = () => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SHELL_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        codeCache: true
      }
    }
  ]);
};

const handleShellProtocol = () => {
  protocol.handle(SHELL_SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    const [, version, ...segments] = decodeURIComponent(pathname).split('/');
    const filePath = path.join(RENDERER_PATH, ...segments);
    const relative = path.relative(RENDERER_PATH, filePath);

    if (
      version !== app.getVersion() ||
      !relative ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      return new Response(null, { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
};

const getShellUrl = (page: string) =>
  `${SHELL_SCHEME}://app/${app.getVersion()}/${page}`;

export { getShellUrl, handleShellProtocol, registerShellScheme };
