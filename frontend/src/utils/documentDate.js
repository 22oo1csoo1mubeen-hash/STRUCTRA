export function parseDateString(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') return null;

  const date = value.trim();
  if (!date) return null;

  const dayFirst = date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dayFirst) {
    const day = Number.parseInt(dayFirst[1], 10);
    const month = Number.parseInt(dayFirst[2], 10) - 1;
    let year = Number.parseInt(dayFirst[3], 10);
    if (year < 100) year += 2000;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const parsed = new Date(year, month, day);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  const yearFirst = date.match(/^(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (yearFirst) {
    let year = Number.parseInt(yearFirst[1], 10);
    if (year < 100) year += 2000;
    const month = Number.parseInt(yearFirst[2], 10) - 1;
    const day = Number.parseInt(yearFirst[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const parsed = new Date(year, month, day);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
