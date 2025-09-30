// i18n-config.ts
export const i18n = {
  defaultLocale: "en",
  locales: ["en", "id"], // bisa ditambah 'jp', 'fr', dll
};

export type Locale = (typeof i18n)["locales"][number];