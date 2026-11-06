import type { TAdminUserSession } from '@/features/server/admin/hooks';
import type { TUserSessionLocation } from '@sharkord/shared';
import { AppWindow, Monitor, Smartphone } from 'lucide-react';

export const getLocationLabel = (location: TUserSessionLocation) => {
  const parts: string[] = [];

  if (location.city) parts.push(location.city);
  if (location.region && location.region !== location.city) {
    parts.push(location.region);
  }
  if (location.country) parts.push(location.country);

  return parts.join(', ');
};

export const getSessionIcon = (session: TAdminUserSession) => {
  if (session.desktopVersion) return AppWindow;
  if (session.device && session.device !== 'Desktop') return Smartphone;

  return Monitor;
};
