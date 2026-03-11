import React, { createContext, useContext, useState } from 'react';

export const LANGUAGES = [
  { code: 'en',  label: 'English',   flag: '🇬🇧' },
  { code: 'sw',  label: 'Kiswahili', flag: '🇰🇪' },
  { code: 'ki',  label: 'Gĩkũyũ',   flag: '🏔️' },
  { code: 'luo', label: 'Dholuo',    flag: '🌊' },
];

export const TRANSLATIONS = {
  en: {
    appName: 'HALO',
    tagline: 'Guardian Network',
    aiActive: 'AI Active',
    aiPoweredProtection: 'AI-Powered Protection',
    youAreNotAlone: 'You Are Not Alone',
    subtitle: "Kenya's first AI-powered safety network for survivors of gender-based violence",

    emergency: 'Emergency SOS',
    alertContacts: 'Alert trusted contacts instantly',
    aiAssistant: 'AI Assistant',
    aiAssistantSub: 'Chat with empathetic AI',
    quickCheck: 'Quick Check',
    quickCheckSub: 'Fast risk assessment',
    report: 'Report',
    reportSub: 'Anonymous reporting',
    resources: 'Resource Directory',
    resourcesSub: '50+ verified, AI-matched resources',
    evidenceVault: 'Evidence Vault',
    evidenceVaultSub: 'Encrypted, court-admissible docs',
    safetyPlan: 'Safety Plan',
    safetyPlanSub: 'Personal escape plan',
    caseTracker: 'Case Tracker',
    caseTrackerSub: 'Track legal proceedings',

    privacyTitle: 'Your Privacy & Safety First',
    privacyBody: 'Military-grade encryption • ML predictions run locally • Anonymous reporting • No data shared without consent • Works offline when needed',
    hotlineFooter: 'Emergency Hotline: 1195 (24/7 Free) • Police: 999',
  },

  sw: {
    appName: 'HALO',
    tagline: 'Mtandao wa Ulinzi',
    aiActive: 'AI Inafanya Kazi',
    aiPoweredProtection: 'Ulinzi wa AI',
    youAreNotAlone: 'Huko Si Peke Yako',
    subtitle: 'Mtandao wa kwanza wa Kenya wa usalama unaotumia AI kwa waathirika wa unyanyasaji wa kijinsia',

    emergency: 'Dharura SOS',
    alertContacts: 'Tahadharisha marafiki wa kuamini mara moja',
    aiAssistant: 'Msaidizi wa AI',
    aiAssistantSub: 'Zungumza na AI yenye huruma',
    quickCheck: 'Tathmini ya Haraka',
    quickCheckSub: 'Tathmini ya hatari haraka',
    report: 'Ripoti',
    reportSub: 'Ripoti bila kujitambulisha',
    resources: 'Orodha ya Rasilimali',
    resourcesSub: 'Rasilimali 50+ zilizothibitishwa',
    evidenceVault: 'Hifadhi ya Ushahidi',
    evidenceVaultSub: 'Hati zilizosimbwa, zinazokubaliwa mahakamani',
    safetyPlan: 'Mpango wa Usalama',
    safetyPlanSub: 'Mpango wako wa kutoroka',
    caseTracker: 'Fuatilia Kesi',
    caseTrackerSub: 'Fuatilia mashauri ya kisheria',

    privacyTitle: 'Faragha na Usalama Wako Kwanza',
    privacyBody: 'Usimbaji fiche wa kijeshi • Utabiri wa AI hufanya kazi ndani ya simu • Ripoti bila kujitambulisha • Hakuna data inayoshirikiwa bila idhini • Inafanya kazi bila mtandao',
    hotlineFooter: 'Laini ya Dharura: 1195 (Bure, 24/7) • Polisi: 999',
  },

  ki: {
    appName: 'HALO',
    tagline: 'Ũtũi wa Ũlindĩ',
    aiActive: 'AI Ĩratũma',
    aiPoweredProtection: 'Ũlindĩ wa AI',
    youAreNotAlone: 'Ndũrĩ Ũkĩrĩ Wega',
    subtitle: 'Ũtũi wa mbere wa Kenya wa ũlindĩ ũtũmĩtio AI kũhũũria arĩĩ a ũhonge wa kĩnjĩ',

    emergency: 'SOS ya Ũhangĩko',
    alertContacts: 'Tahadharisha marafiki wa kuamini',
    aiAssistant: 'Mũteithia wa AI',
    aiAssistantSub: 'Ũgweti na AI',
    quickCheck: 'Thibitiko ya Haraka',
    quickCheckSub: 'Thibitiko ya haraka ya hatari',
    report: 'Rĩpoti',
    reportSub: 'Rĩpoti bila kũjĩtambũrĩria',
    resources: 'Orodha ya Mĩrĩmba',
    resourcesSub: 'Mĩrĩmba 50+ ĩthibitĩtĩkĩtĩe',
    evidenceVault: 'Ndũ ya Ũhoro',
    evidenceVaultSub: 'Makũmbu ma mahakama',
    safetyPlan: 'Mpango wa Ũlindĩ',
    safetyPlanSub: 'Mpango waku wa gũthiĩ',
    caseTracker: 'Rũrĩrĩrio rwa Kesi',
    caseTrackerSub: 'Rũrĩrĩria kesi yaku',

    privacyTitle: 'Faragha na Ũlindĩ Waku Kwanza',
    privacyBody: 'Usimbaji wa kĩjeshi • AI ĩratũma ndũng\'ũ • Rĩpoti bila kũjĩtambũrĩria • Hakũna data ĩgaanĩrwo',
    hotlineFooter: 'Laini ya Dharura: 1195 (Bure, 24/7) • Polisi: 999',
  },

  luo: {
    appName: 'HALO',
    tagline: 'Oganda mar Gweth',
    aiActive: 'AI timo tich',
    aiPoweredProtection: 'Gweth mar AI',
    youAreNotAlone: 'Ok in kende',
    subtitle: 'Oganda mokwongo e Kenya mar gweth ma tiyo gi AI ni joma osando gi teko mar dhano',

    emergency: 'SOS mar Chandruok',
    alertContacts: 'Ng\'ony joweteni piyo',
    aiAssistant: 'Jakony mar AI',
    aiAssistantSub: 'Wuoyi gi AI maber',
    quickCheck: 'Nonro Piyo',
    quickCheckSub: 'Nonro piyo mar chandruok',
    report: 'Ripot',
    reportSub: 'Ripot maonge nying',
    resources: 'Ndiko mar Gigo Makonyo',
    resourcesSub: 'Gigo 50+ mosenoni',
    evidenceVault: 'Od Adiera',
    evidenceVaultSub: 'Weche mag dala mar bura',
    safetyPlan: 'Duond Gweth',
    safetyPlanSub: 'Duond gweth maru',
    caseTracker: 'Luwo Kaso',
    caseTrackerSub: 'Luwo kaso mar chik',

    privacyTitle: 'Mwandu ni Gweth Mara Mokwongo',
    privacyBody: 'Kido mar golo mwandu • AI timo tich e phone • Ripot maonge nying • Onge weche mochiwo',
    hotlineFooter: 'Helo mar Chandruok: 1195 (Onge chudo, 24/7) • Police: 999',
  },
};

// ─── Single shared context ────────────────────────────────────────────────────
const I18nContext = createContext(null);
const LANG_KEY = 'halo_language';

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || 'en');

  const setLanguage = (code) => {
    if (!TRANSLATIONS[code]) return;
    localStorage.setItem(LANG_KEY, code);
    setLangState(code);
  };

  const t = (key) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return dict[key] ?? TRANSLATIONS.en[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be inside <I18nProvider>');
  return {
    t: ctx.t,
    lang: ctx.lang,
    setLanguage: ctx.setLanguage,
    currentLanguage: LANGUAGES.find(l => l.code === ctx.lang) || LANGUAGES[0],
  };
};

export default { t: (key) => TRANSLATIONS[localStorage.getItem(LANG_KEY) || 'en']?.[key] ?? TRANSLATIONS.en[key] ?? key };