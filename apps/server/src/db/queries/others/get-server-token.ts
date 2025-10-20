import { getSettings } from './get-settings';

// since this is static, we can keep it in memory to avoid querying the DB every time
let token: string;

const getServerToken = async (): Promise<string> => {
  if (token) return token;

  const { secretToken } = await getSettings();

  if (!secretToken) {
    throw new Error('Secret token not found in database settings');
  }

  token = secretToken;

  return token;
};

export { getServerToken };
