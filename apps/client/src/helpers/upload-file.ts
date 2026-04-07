import { UploadHeaders, type TTempFile } from '@sharkord/shared';
import { toast } from 'sonner';
import { getUrlFromServer } from './get-file-url';
import { getSessionStorageItem, SessionStorageKey } from './storage';

const getSafeFileName = (name: string) => {
  return (
    name
      .trim()
      .normalize('NFKD') // decomposes accented chars
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, '_') // replaces non-ASCII chars with underscore
  );
};

type TUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

type TUploadFileOptions = {
  onProgress?: (progress: TUploadProgress) => void;
};

const uploadFile = async (file: File, options?: TUploadFileOptions) => {
  const url = getUrlFromServer();

  return new Promise<TTempFile | undefined>((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${url}/upload`);

    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader(UploadHeaders.TYPE, file.type);
    xhr.setRequestHeader(UploadHeaders.CONTENT_LENGTH, file.size.toString());
    xhr.setRequestHeader(
      UploadHeaders.ORIGINAL_NAME,
      getSafeFileName(file.name)
    );
    xhr.setRequestHeader(
      UploadHeaders.TOKEN,
      getSessionStorageItem(SessionStorageKey.TOKEN) ?? ''
    );

    if (options?.onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          options.onProgress!({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100)
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const tempFile: TTempFile = JSON.parse(xhr.responseText);

        resolve(tempFile);
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);

          toast.error(errorData.error || xhr.statusText);
        } catch {
          toast.error(xhr.statusText);
        }

        resolve(undefined);
      }
    });

    xhr.addEventListener('error', () => {
      toast.error('Upload failed');

      resolve(undefined);
    });

    xhr.send(file);
  });
};

const uploadFiles = async (
  files: File[],
  onProgress?: (fileIndex: number, progress: TUploadProgress) => void
) => {
  const uploadedFiles: TTempFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const uploadedFile = await uploadFile(files[i], {
      onProgress: onProgress ? (progress) => onProgress(i, progress) : undefined
    });

    if (!uploadedFile) continue;

    uploadedFiles.push(uploadedFile);
  }

  return uploadedFiles;
};

export { uploadFile, uploadFiles, type TUploadProgress };
