import UAParser from 'ua-parser-js';

export function parseUserAgent(userAgent) {
  if (!userAgent) return null;

  const parser = new UAParser(userAgent);
  const ua = parser.getResult();

  return {
    browser: ua.browser?.name || null,
    browserVersion: ua.browser?.version || null,
    os: ua.os?.name || null,
    osVersion: ua.os?.version || null,
    device: ua.device?.type || 'desktop',
  };
}
