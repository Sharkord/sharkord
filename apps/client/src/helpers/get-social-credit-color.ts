const getSocialCreditColor = (score: number): string => {
  if (score <= -50) return '#dc2626'; // bright red
  if (score <= -20) return '#ef4444'; // red
  if (score <= 0) return '#f87171'; // light red
  if (score <= 25) return '#3b82f6'; // blue
  if (score <= 50) return '#22c55e'; // green
  if (score <= 100) return '#f97316'; // orange
  if (score <= 200) return '#eab308'; // yellow
  return '#f59e0b'; // gold
};

export { getSocialCreditColor };
