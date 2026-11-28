import { getUrlFromServer } from '@/helpers/get-file-url';
import { getTokenHeader } from '@/helpers/get-token-header';

type TUploadedPlugin = {
  id: string;
  name: string;
  version: string;
};

export const uploadPluginArchive = async (
  file: File
): Promise<TUploadedPlugin> => {
  const url = getUrlFromServer();

  const response = await fetch(`${url}/plugin-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      ...getTokenHeader()
    },
    body: file
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || response.statusText);
  }

  return data;
};

export const isPluginArchiveName = (fileName: string) =>
  /\.(tar|tar\.gz|tgz)$/i.test(fileName);
