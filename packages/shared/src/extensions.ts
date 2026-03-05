export const imageExtensions = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.tiff',
  '.tif'
];

export const videoExtensions = [
  '.mp4',
  '.mkv',
  '.mov',
  '.avi',
  '.wmv',
  '.flv',
  '.webm',
  '.mpeg',
  '.mpg',
  '.3gp'
];

export const audioExtensions = [
  '.mp3',
  '.wav',
  '.flac',
  '.aac',
  '.ogg',
  '.m4a',
  '.wma',
  '.alac'
];

export const documentExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.rtf',
  '.odt',
  '.ods',
  '.odp'
];

export enum FileCategory {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other'
}

export const getFileCategory = (extension: string): FileCategory => {
  const ext = extension.toLowerCase();

  if (imageExtensions.includes(ext)) return FileCategory.IMAGE;
  if (videoExtensions.includes(ext)) return FileCategory.VIDEO;
  if (audioExtensions.includes(ext)) return FileCategory.AUDIO;
  if (documentExtensions.includes(ext)) return FileCategory.DOCUMENT;

  return FileCategory.OTHER;
};
