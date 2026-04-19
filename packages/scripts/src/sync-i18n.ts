import { Glob } from 'bun';
import fs from 'fs/promises';
import path from 'path';

const flatten = (obj: any, prefix = ''): Record<string, string> =>
  Object.entries(obj).reduce(
    (acc, [key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        Object.assign(acc, flatten(value, newKey));
      } else {
        acc[newKey] = value as string;
      }

      return acc;
    },
    {} as Record<string, string>
  );

const cwd = process.cwd();
const projectRoot = path.join(cwd, '..', '..');
const i18nPath = path.join(projectRoot, 'apps', 'client', 'src', 'i18n');
const i18nLocalesPath = path.join(i18nPath, 'locales');
const enLocalePath = path.join(i18nLocalesPath, 'en');

const otherLocales: string[] = [];

const entries = await fs.readdir(i18nLocalesPath, { withFileTypes: true });

for (const entry of entries) {
  if (entry.isDirectory() && entry.name !== 'en') {
    otherLocales.push(entry.name);
  }
}

const glob = new Glob(`${enLocalePath}/*.json`);

const enFiles: {
  name: string;
  path: string;
}[] = [];

for await (const file of glob.scan('.')) {
  enFiles.push({
    name: path.basename(file, '.json'),
    path: file
  });
}

const missingTranslationsReport: {
  locale: string;
  file: string;
  missingKeys: {
    key: string;
    original: string;
  }[];
}[] = [];

for (const { name, path: filePath } of enFiles) {
  const content = await Bun.file(filePath).json();
  const flattenedContent = flatten(content);

  for (const locale of otherLocales) {
    const otherLocaleFilePath = path.join(
      i18nLocalesPath,
      locale,
      `${name}.json`
    );

    try {
      const otherLocaleContent = await Bun.file(otherLocaleFilePath).json();
      const flattenedOtherLocaleContent = flatten(otherLocaleContent);

      const missingKeys = Object.entries(flattenedContent)
        .filter(([key]) => !(key in flattenedOtherLocaleContent))
        .map(([key, original]) => ({ key, original }));

      if (missingKeys.length > 0) {
        missingTranslationsReport.push({
          locale,
          file: `${locale}/${name}.json`,
          missingKeys
        });
      }
    } catch (error) {
      console.error(`Error reading file for locale ${locale}:`, error);
    }
  }
}

if (missingTranslationsReport.length > 0) {
  console.log('Missing Translations Report:');

  for (const { locale, file, missingKeys } of missingTranslationsReport) {
    console.log(`\nLocale: ${locale}`);
    console.log(`File: ${file}`);
    console.log('Missing Keys:');

    for (const { key, original } of missingKeys) {
      console.log(`- ${key}: ${original}`);
    }
  }
} else {
  console.log('All translations are up to date!');
}
