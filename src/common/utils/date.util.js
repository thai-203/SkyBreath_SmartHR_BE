import moment from 'moment';

const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const buildYmdFormatter = (timeZone = DEFAULT_TIME_ZONE) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

export const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

export const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).format(format);
};

export const toYmd = (value, timeZone = DEFAULT_TIME_ZONE) => {
  if (value instanceof Date) {
    return buildYmdFormatter(timeZone).format(value);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return buildYmdFormatter(timeZone).format(date);
};

export const parseYmd = (value, timeZone = DEFAULT_TIME_ZONE) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'string') {
    const maybeDate = new Date(value);
    return Number.isNaN(maybeDate.getTime()) ? null : maybeDate;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const [_, year, month, day] = match;
  return new Date(`${year}-${month}-${day}T00:00:00+07:00`);
};

export const getTodayYmd = (timeZone = DEFAULT_TIME_ZONE) => {
  return buildYmdFormatter(timeZone).format(new Date());
};

export const getTodayDate = (timeZone = DEFAULT_TIME_ZONE) => {
  return parseYmd(getTodayYmd(timeZone), timeZone);
};
