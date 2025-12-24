type TitleLabels = {
  placeholder: string;
  fallback: string;
};

const TITLE_LABELS: Record<string, TitleLabels> = {
  de: { placeholder: 'Neue Unterhaltung', fallback: 'Allgemeine Fragen' },
  en: { placeholder: 'New conversation', fallback: 'General questions' },
  es: { placeholder: 'Nueva conversación', fallback: 'Preguntas generales' },
  fr: { placeholder: 'Nouvelle conversation', fallback: 'Questions générales' },
  it: { placeholder: 'Nuova conversazione', fallback: 'Domande generali' },
  nl: { placeholder: 'Nieuw gesprek', fallback: 'Algemene vragen' },
  pt: { placeholder: 'Nova conversa', fallback: 'Perguntas gerais' },
};

const DEFAULT_LANG = 'en';

const normalizeLanguage = (language?: string | null) => {
  if (!language) {
    return DEFAULT_LANG;
  }
  const normalized = language.split(/[-_]/)[0].toLowerCase();
  return TITLE_LABELS[normalized] ? normalized : DEFAULT_LANG;
};

export const getPlaceholderTitle = (language?: string | null): string => {
  const lang = normalizeLanguage(language);
  return TITLE_LABELS[lang].placeholder;
};

export const getFallbackTitle = (language?: string | null): string => {
  const lang = normalizeLanguage(language);
  return TITLE_LABELS[lang].fallback;
};
