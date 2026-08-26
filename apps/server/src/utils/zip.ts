import fs from 'fs';
import path from 'path';
import * as yauzl from 'yauzl';
import * as yazl from 'yazl';

const zipDirectory = (srcDir: string, outPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const zipfile = new yazl.ZipFile();

    const addDir = (dir: string, baseDir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          addDir(fullPath, baseDir);
        } else {
          zipfile.addFile(fullPath, relativePath);
        }
      }
    };

    addDir(srcDir, srcDir);

    const output = fs.createWriteStream(outPath);
    zipfile.outputStream.pipe(output);

    output.on('close', resolve);
    output.on('error', reject);

    zipfile.end();
  });
};

const unzipBlobToDirectory = async (
  zipBlob: Blob | Buffer | Uint8Array,
  outDir: string
): Promise<void> => {
  // Convert Blob → Buffer if needed
  const buffer =
    zipBlob instanceof Blob
      ? Buffer.from(await zipBlob.arrayBuffer())
      : Buffer.isBuffer(zipBlob)
        ? zipBlob
        : Buffer.from(zipBlob);

  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        const entryPath = path.join(outDir, entry.fileName);

        // Prevent ZipSlip vulnerability
        if (!entryPath.startsWith(path.resolve(outDir))) {
          return reject(
            new Error('Illegal file path in zip: ' + entry.fileName)
          );
        }

        if (/\/$/.test(entry.fileName)) {
          fs.mkdirSync(entryPath, { recursive: true });
          zipfile.readEntry();
        } else {
          fs.mkdirSync(path.dirname(entryPath), { recursive: true });
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err || !readStream) return reject(err);

            const writeStream = fs.createWriteStream(entryPath);
            readStream.pipe(writeStream);

            writeStream.on('close', () => zipfile.readEntry());
          });
        }
      });

      zipfile.on('end', resolve);
      zipfile.on('error', reject);
    });
  });
};

export { unzipBlobToDirectory, zipDirectory };
