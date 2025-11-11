/**
 * Date conversion utilities for email timestamps
 */

/**
 * Convert UTC date to local timezone ISO string
 */
export const convertToLocalDate = (date: string | Date | null | undefined): string => {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
};

/**
 * Format date to localized string
 */
export const formatLocalDate = (date: string | Date, locale: string = 'it-IT'): string => {
  return new Date(date).toLocaleString(locale);
};
