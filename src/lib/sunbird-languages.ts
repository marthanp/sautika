export const SUNBIRD_LANGUAGES = [
  { code: 'ach', name: 'Acholi' },
  { code: 'afr', name: 'Afrikaans' },
  { code: 'aka', name: 'Akan' },
  { code: 'amh', name: 'Amharic' },
  { code: 'teo', name: 'Ateso' },
  { code: 'bam', name: 'Bambara' },
  { code: 'bem', name: 'Bemba' },
  { code: 'ber', name: 'Berber' },
  { code: 'dga', name: 'Dagaare' },
  { code: 'dag', name: 'Dagbani' },
  { code: 'eng', name: 'English' },
  { code: 'ewe', name: 'Ewe' },
  { code: 'ful', name: 'Fulani' },
  { code: 'hau', name: 'Hausa' },
  { code: 'ibo', name: 'Igbo' },
  { code: 'kab', name: 'Kabyle' },
  { code: 'kln', name: 'Kalenjin' },
  { code: 'kau', name: 'Kanuri' },
  { code: 'kik', name: 'Kikuyu' },
  { code: 'kin', name: 'Kinyarwanda' },
  { code: 'led', name: 'Lendu' },
  { code: 'lgg', name: 'Lugbara' },
  { code: 'lin', name: 'Lingala' },
  { code: 'lug', name: 'Luganda' },
  { code: 'luy', name: 'Luhya' },
  { code: 'myx', name: 'Lumasaba' },
  { code: 'luo', name: 'Luo (Dholuo)' },
  { code: 'xog', name: 'Lusoga' },
  { code: 'mlg', name: 'Malagasy' },
  { code: 'nbl', name: 'Ndebele' },
  { code: 'nya', name: 'Chichewa' },
  { code: 'pcm', name: 'Nigerian Pidgin' },
  { code: 'orm', name: 'Oromo' },
  { code: 'cgg', name: 'Rukiga' },
  { code: 'koo', name: 'Rukonjo' },
  { code: 'nyn', name: 'Runyankole' },
  { code: 'ruc', name: 'Ruruuli' },
  { code: 'sna', name: 'Shona' },
  { code: 'som', name: 'Somali' },
  { code: 'sot', name: 'Sotho' },
  { code: 'swa', name: 'Swahili' },
  { code: 'tsn', name: 'Tswana' },
  { code: 'ttj', name: 'Rutooro' },
  { code: 'wol', name: 'Wolof' },
  { code: 'xho', name: 'Xhosa' },
  { code: 'yor', name: 'Yoruba' },
  { code: 'zul', name: 'Zulu' },
] as const;

export type VoiceLang = (typeof SUNBIRD_LANGUAGES)[number]['code'];

const SUPPORTED_TTS_LANGUAGES = new Set<VoiceLang>([
  'ach', 'afr', 'eng', 'ewe', 'ful', 'hau', 'ibo', 'kik', 'kin', 'lin',
  'lug', 'luo', 'nyn', 'swa', 'teo', 'xho', 'yor',
]);

export function normalizeSunbirdLanguage(language: string): string {
  return language === 'en' ? 'eng' : language;
}

export function isSunbirdLanguage(value: unknown): value is VoiceLang {
  return typeof value === 'string' && SUNBIRD_LANGUAGES.some((language) => language.code === value);
}

export function hasSunbirdTts(language: VoiceLang): boolean {
  return SUPPORTED_TTS_LANGUAGES.has(language);
}
