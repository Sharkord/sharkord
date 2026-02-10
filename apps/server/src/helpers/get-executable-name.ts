const getExecutableName = (fileName: string) => {
  if (process.platform === 'win32') {
    return `${fileName}.exe`;
  }

  return fileName;
};

export { getExecutableName };
