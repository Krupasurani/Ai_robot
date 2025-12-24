export const allLangs = [
  {
    value: 'en',
    label: 'English',
    countryCode: 'GB',
    adapterLocale: 'en',
    numberFormat: { code: 'en-US', currency: 'USD' },
  },
  {
    value: 'fr',
    label: 'French',
    countryCode: 'FR',
    adapterLocale: 'fr',
    numberFormat: { code: 'fr-Fr', currency: 'EUR' },
  },
  {
    value: 'de',
    label: 'Deutsch',
    countryCode: 'DE',
    adapterLocale: 'de',
    numberFormat: { code: 'de-DE', currency: 'EUR' },
  },
  {
    value: 'es',
    label: 'Español',
    countryCode: 'ES',
    adapterLocale: 'es',
    numberFormat: { code: 'es-ES', currency: 'EUR' },
  },
  {
    value: 'it',
    label: 'Italiano',
    countryCode: 'IT',
    adapterLocale: 'it',
    numberFormat: { code: 'it-IT', currency: 'EUR' },
  },
  {
    value: 'vi',
    label: 'Tiếng Việt',
    countryCode: 'VN',
    adapterLocale: 'en', // Fallback to English
    numberFormat: { code: 'vi-VN', currency: 'VND' },
  },
  {
    value: 'cn',
    label: '中文',
    countryCode: 'CN',
    adapterLocale: 'en', // Fallback to English
    numberFormat: { code: 'zh-CN', currency: 'CNY' },
  },
  {
    value: 'ar',
    label: 'العربية',
    countryCode: 'SA',
    adapterLocale: 'en', // Fallback to English
    numberFormat: { code: 'ar-SA', currency: 'SAR' },
  },
];

/**
 * Country code:
 * https://flagcdn.com/en/codes.json
 *
 * Number format code:
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */
