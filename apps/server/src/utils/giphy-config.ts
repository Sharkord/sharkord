import fs from 'fs/promises';
import { parse, stringify } from 'ini';
import { config } from '../config';
import { deepMerge } from '../helpers/deep-merge';
import { CONFIG_INI_PATH } from '../helpers/paths';

let giphyApiKey = config.giphy.apiKey ?? '';

const getGiphyApiKey = (): string => giphyApiKey;

const setGiphyApiKey = async (value: string): Promise<void> => {
  giphyApiKey = value;

  const existingText = await fs.readFile(CONFIG_INI_PATH, { encoding: 'utf-8' });
  const existing = parse(existingText) as Record<string, unknown>;
  const merged = deepMerge(existing, {
    giphy: { apiKey: value }
  }) as Record<string, unknown>;
  await fs.writeFile(CONFIG_INI_PATH, stringify(merged));
};

export { getGiphyApiKey, setGiphyApiKey };
