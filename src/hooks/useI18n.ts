// Minimal i18n hook shim to satisfy frontend imports and provide safe defaults.
// Keeps existing t(key, defaultText) usage working during build and in production
// until a full i18n implementation (Supabase-backed or JSON locales) is wired.

export const useI18n = () => {
  // direction: 'ltr' or 'rtl'
  const dir: 'ltr' | 'rtl' = 'ltr';

  const t = (key: string, defaultText?: string) => {
    // If a default text is provided, return it; otherwise return the key.
    // This keeps existing calls like t('auth.ok', '...') functional.
    return typeof defaultText !== 'undefined' ? defaultText : key;
  };

  return { t, dir } as const;
};
