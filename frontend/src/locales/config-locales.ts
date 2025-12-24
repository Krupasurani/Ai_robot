// ----------------------------------------------------------------------

export type LanguageValue = 'en' | 'de' | 'fr' | 'es' | 'it' | 'vi' | 'cn' | 'ar';

export const fallbackLng = 'en';
export const languages = ['en', 'de', 'fr', 'es', 'it', 'vi', 'cn', 'ar'];
export const defaultNS = 'common';
export const cookieName = 'i18next';

// ----------------------------------------------------------------------

export function i18nOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    // debug: true,
    lng,
    fallbackLng,
    ns,
    defaultNS,
    fallbackNS: defaultNS,
    supportedLngs: languages,
  };
}

// ----------------------------------------------------------------------

export const changeLangMessages: Record<
  LanguageValue,
  { success: string; error: string; loading: string }
> = {
  en: {
    success: 'Language has been changed!',
    error: 'Error changing language!',
    loading: 'Loading...',
  },
  vi: {
    success: 'Ngôn ngữ đã được thay đổi!',
    error: 'Lỗi khi thay đổi ngôn ngữ!',
    loading: 'Đang tải...',
  },
  fr: {
    success: 'La langue a été changée!',
    error: 'Erreur lors du changement de langue!',
    loading: 'Chargement...',
  },
  cn: {
    success: '语言已更改！',
    error: '更改语言时出错！',
    loading: '加载中...',
  },
  ar: {
    success: 'تم تغيير اللغة!',
    error: 'خطأ في تغيير اللغة!',
    loading: 'جارٍ التحميل...',
  },
  de: {
    success: 'Sprache wurde geändert!',
    error: 'Fehler beim Ändern der Sprache!',
    loading: 'Laden...',
  },
  es: {
    success: '¡El idioma ha sido cambiado!',
    error: '¡Error al cambiar el idioma!',
    loading: 'Cargando...',
  },
  it: {
    success: 'La lingua è stata cambiata!',
    error: 'Errore nel cambio lingua!',
    loading: 'Caricamento...',
  },
};
