import { initReactI18next } from 'react-i18next';

import { createInstance } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HTTPApi from 'i18next-http-backend';

const i18next = createInstance();

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(HTTPApi)
  .init({
    lng: 'it',
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;
