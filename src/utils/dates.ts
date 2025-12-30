/**
 * Date utilities for Arabic locale with Sunday-first week support
 */

const ARABIC_DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const ARABIC_MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/**
 * Get start of week for a given date
 * @param date - The reference date
 * @param weekStartsOn - Day the week starts on (0=Sunday, 6=Saturday). Default is 0 (Sunday) for Arabic locale
 * @returns Date object representing the start of the week
 */
export const getStartOfWeek = (date: Date, weekStartsOn: number = 0): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get array of 7 dates starting from the given start of week
 * @param startOfWeek - The first day of the week
 * @returns Array of 7 Date objects
 */
export const getWeekDays = (startOfWeek: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

/**
 * Check if two dates are the same day
 * @param a - First date
 * @param b - Second date
 * @returns true if same day
 */
export const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

/**
 * Format date to Arabic day name
 * @param date - Date to format
 * @returns Arabic day name (e.g., "السبت")
 */
export const formatArabicDayName = (date: Date): string => {
  return ARABIC_DAY_NAMES[date.getDay()];
};

/**
 * Format date to Arabic date string
 * @param date - Date to format
 * @returns Arabic formatted date (e.g., "18 يناير")
 */
export const formatArabicDate = (date: Date): string => {
  const day = date.getDate();
  const month = ARABIC_MONTH_NAMES[date.getMonth()];
  return `${day} ${month}`;
};

/**
 * Get end of week for a given start of week date
 * @param startOfWeek - The first day of the week
 * @returns Date object representing the end of the week (23:59:59)
 */
export const getEndOfWeek = (startOfWeek: Date): Date => {
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
};

/**
 * Format time from ISO string to HH:MM format
 * @param isoString - ISO date string
 * @returns Time string in HH:MM format
 */
export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Calculate end time from start time and duration
 * @param startsAt - ISO date string of start time
 * @param durationMin - Duration in minutes
 * @returns Time string in HH:MM format
 */
export const getEndTime = (startsAt: string, durationMin: number): string => {
  const startDate = new Date(startsAt);
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
  const hours = endDate.getHours().toString().padStart(2, '0');
  const minutes = endDate.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};
