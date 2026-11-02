import { getErrorMessage, type TUserSession } from '@sharkord/shared';
import { logger } from '../logger';
import { getIpInfo } from './logins';

const resolveSessionLocation = async (session: TUserSession) => {
  if (!session.ip) return;

  try {
    const info = await getIpInfo(session.ip);

    session.location = {
      city: info.city || null,
      region: info.region || null,
      country: info.country || null,
      org: info.org || null,
      timezone: info.timezone || null
    };
  } catch (error) {
    logger.debug(
      'Failed to resolve session location: %s',
      getErrorMessage(error)
    );
  }
};

export { resolveSessionLocation };
