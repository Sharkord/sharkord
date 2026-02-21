const formatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2
});

const formatBigNumber = (value: number): string => {
  return formatter.format(value);
};

export { formatBigNumber };
