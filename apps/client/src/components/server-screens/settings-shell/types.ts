import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type TSettingsEntry = {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
  logo?: string;
};
