const MAX_COMBINING_PER_CHAR = 3;

// matches a base character followed by one or more combining characters
// captures: [1] base char, [2] the full run of combining marks
const ZALGO_RE =
  // eslint-disable-next-line no-misleading-character-class
  /([\s\S])([\u0300-\u036F\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+)/g;

const stripZalgo = (text: string): string => {
  return text.replace(ZALGO_RE, (_match, base: string, combiners: string) => {
    const kept = [...combiners].slice(0, MAX_COMBINING_PER_CHAR).join('');

    return base + kept;
  });
};

export { stripZalgo };
