import {
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
  startOfDay,
  addYears,
  addMonths,
  addDays,
  addHours,
  addMinutes,
  addSeconds,
  addMilliseconds,
  subYears,
  subMonths,
  subDays,
  subHours,
  subMinutes,
  subSeconds,
  subMilliseconds,
  isAfter,
  isSameYear,
  isSameMonth,
  isSameDay,
  isBefore,
} from 'date-fns';

// ----------------------------------------------------------------------

export type DatePickerFormat = Date | string | number | null | undefined;

/**
 * Docs: https://date-fns.org/docs/format
 */
export const formatStr = {
  dateTime: 'dd MMM yyyy h:mm a', // 17 Apr 2022 12:00 am
  date: 'dd MMM yyyy', // 17 Apr 2022
  time: 'h:mm a', // 12:00 am
  split: {
    dateTime: 'dd/MM/yyyy h:mm a', // 17/04/2022 12:00 am
    date: 'dd/MM/yyyy', // 17/04/2022
  },
  paramCase: {
    dateTime: 'dd-MM-yyyy h:mm a', // 17-04-2022 12:00 am
    date: 'dd-MM-yyyy', // 17-04-2022
  },
};

export function today(formatString?: string) {
  const todayDate = startOfDay(new Date());
  return formatString ? format(todayDate, formatString) : format(todayDate, formatStr.date);
}

// ----------------------------------------------------------------------

/** output: 17 Apr 2022 12:00 am
 */
export function fDateTime(date: DatePickerFormat, formatString?: string) {
  if (!date) {
    return null;
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const dateIsValid = isValid(dateObj);

  return dateIsValid ? format(dateObj, formatString ?? formatStr.dateTime) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: 17 Apr 2022
 */
export function fDate(date: DatePickerFormat, formatString?: string) {
  if (!date) {
    return null;
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const dateIsValid = isValid(dateObj);

  return dateIsValid ? format(dateObj, formatString ?? formatStr.date) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: 12:00 am
 */
export function fTime(date: DatePickerFormat, formatString?: string) {
  if (!date) {
    return null;
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const dateIsValid = isValid(dateObj);

  return dateIsValid ? format(dateObj, formatString ?? formatStr.time) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: 1713250100
 */
export function fTimestamp(date: DatePickerFormat) {
  if (!date) {
    return null;
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const dateIsValid = isValid(dateObj);

  return dateIsValid ? dateObj.getTime() : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: a few seconds, 2 years
 */
export function fToNow(date: DatePickerFormat) {
  if (!date) {
    return null;
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const dateIsValid = isValid(dateObj);

  return dateIsValid ? formatDistanceToNow(dateObj, { addSuffix: false }) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: boolean
 */
export function fIsBetween(
  inputDate: DatePickerFormat,
  startDate: DatePickerFormat,
  endDate: DatePickerFormat
) {
  if (!inputDate || !startDate || !endDate) {
    return false;
  }

  const inputDateObj = typeof inputDate === 'string' ? parseISO(inputDate) : new Date(inputDate);
  const startDateObj = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate);
  const endDateObj = typeof endDate === 'string' ? parseISO(endDate) : new Date(endDate);

  if (!isValid(inputDateObj) || !isValid(startDateObj) || !isValid(endDateObj)) {
    return false;
  }

  return !isBefore(inputDateObj, startDateObj) && !isAfter(inputDateObj, endDateObj);
}

// ----------------------------------------------------------------------

/** output: boolean
 */
export function fIsAfter(startDate: DatePickerFormat, endDate: DatePickerFormat) {
  if (!startDate || !endDate) {
    return false;
  }

  const startDateObj = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate);
  const endDateObj = typeof endDate === 'string' ? parseISO(endDate) : new Date(endDate);

  if (!isValid(startDateObj) || !isValid(endDateObj)) {
    return false;
  }

  return isAfter(startDateObj, endDateObj);
}

// ----------------------------------------------------------------------

/** output: boolean
 */
export function fIsSame(
  startDate: DatePickerFormat,
  endDate: DatePickerFormat,
  unit?: 'year' | 'month' | 'day'
) {
  if (!startDate || !endDate) {
    return false;
  }

  const startDateObj = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate);
  const endDateObj = typeof endDate === 'string' ? parseISO(endDate) : new Date(endDate);

  if (!isValid(startDateObj) || !isValid(endDateObj)) {
    return false;
  }

  const unitToCheck = unit ?? 'year';

  if (unitToCheck === 'year') {
    return isSameYear(startDateObj, endDateObj);
  }
  if (unitToCheck === 'month') {
    return isSameMonth(startDateObj, endDateObj);
  }
  if (unitToCheck === 'day') {
    return isSameDay(startDateObj, endDateObj);
  }

  return false;
}

// ----------------------------------------------------------------------

/** output:
 * Same day: 26 Apr 2024
 * Same month: 25 - 26 Apr 2024
 * Same month: 25 - 26 Apr 2024
 * Same year: 25 Apr - 26 May 2024
 */
export function fDateRangeShortLabel(
  startDate: DatePickerFormat,
  endDate: DatePickerFormat,
  initial?: boolean
) {
  if (!startDate || !endDate) {
    return 'Invalid time value';
  }

  const startDateObj = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate);
  const endDateObj = typeof endDate === 'string' ? parseISO(endDate) : new Date(endDate);

  const dateIsValid = isValid(startDateObj) && isValid(endDateObj);
  const dateIsAfter = fIsAfter(startDate, endDate);

  if (!dateIsValid || dateIsAfter) {
    return 'Invalid time value';
  }

  let label = `${fDate(startDate)} - ${fDate(endDate)}`;

  if (initial) {
    return label;
  }

  const sameYear = fIsSame(startDate, endDate, 'year');
  const sameMonth = fIsSame(startDate, endDate, 'month');
  const sameDay = fIsSame(startDate, endDate, 'day');

  if (sameYear && !sameMonth) {
    label = `${fDate(startDate, 'dd MMM')} - ${fDate(endDate)}`;
  } else if (sameYear && sameMonth && !sameDay) {
    label = `${fDate(startDate, 'dd')} - ${fDate(endDate)}`;
  } else if (sameYear && sameMonth && sameDay) {
    label = `${fDate(endDate)}`;
  }

  return label;
}

// ----------------------------------------------------------------------

export type DurationProps = {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
};

/** output: '2024-05-28T05:55:31+00:00'
 */
export function fAdd({
  years = 0,
  months = 0,
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
}: DurationProps) {
  let result = new Date();

  if (years !== 0) result = addYears(result, years);
  if (months !== 0) result = addMonths(result, months);
  if (days !== 0) result = addDays(result, days);
  if (hours !== 0) result = addHours(result, hours);
  if (minutes !== 0) result = addMinutes(result, minutes);
  if (seconds !== 0) result = addSeconds(result, seconds);
  if (milliseconds !== 0) result = addMilliseconds(result, milliseconds);

  return result.toISOString();
}

/** output: '2024-05-28T05:55:31+00:00'
 */
export function fSub({
  years = 0,
  months = 0,
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
}: DurationProps) {
  let result = new Date();

  if (years !== 0) result = subYears(result, years);
  if (months !== 0) result = subMonths(result, months);
  if (days !== 0) result = subDays(result, days);
  if (hours !== 0) result = subHours(result, hours);
  if (minutes !== 0) result = subMinutes(result, minutes);
  if (seconds !== 0) result = subSeconds(result, seconds);
  if (milliseconds !== 0) result = subMilliseconds(result, milliseconds);

  return result.toISOString();
}
