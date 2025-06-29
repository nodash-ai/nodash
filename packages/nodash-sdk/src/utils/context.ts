import { PageProperties, Event } from '../types.js';

export function getContext(): Event['context'] {
  return {
    library: {
      name: '@nodash/sdk',
      version: '1.0.0'
    },
    page: getPageInfo(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

export function getPageInfo(): PageProperties {
  if (typeof window === 'undefined') {
    return {};
  }
  
  return {
    url: window.location.href,
    title: document.title,
    path: window.location.pathname,
    referrer: document.referrer || undefined
  };
} 