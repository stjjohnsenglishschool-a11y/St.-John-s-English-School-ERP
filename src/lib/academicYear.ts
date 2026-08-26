/**
 * Academic Year Utilities
 * Automatically computes current academic session based on school calendar (April - March)
 * and generates a selectable list of past, current, and future academic years.
 */

export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // Standard Indian academic year begins in April
  const startYear = month >= 4 ? year : year - 1;
  const endYearShort = String(startYear + 1).slice(-2);
  return `${startYear}-${endYearShort}`;
}

export function getAcademicYearOptions(pastYears = 3, futureYears = 6): string[] {
  const current = getCurrentAcademicYear();
  const currentStart = parseInt(current.split('-')[0], 10) || new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentStart - pastYears; y <= currentStart + futureYears; y++) {
    const endShort = String(y + 1).slice(-2);
    options.push(`${y}-${endShort}`);
  }
  return options;
}

export const ACADEMIC_YEAR_OPTIONS = getAcademicYearOptions();
export const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();
