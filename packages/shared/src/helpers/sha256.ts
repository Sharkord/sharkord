import { sha256 as sha } from 'js-sha256';

const sha256 = async (input: string) => sha(input);

export { sha256 };
