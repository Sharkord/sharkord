import z from 'zod';
import { SUPPORTED_LOCALES } from './supported-locales';

export const zLocale = z.enum(SUPPORTED_LOCALES);
