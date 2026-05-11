const LANGUAGE_MAP = {
  js: true,
  jsx: true,
  ts: true,
  tsx: true,
  ty: true,
};

export function normalizeLanguage(language = 'js') {
  return LANGUAGE_MAP[language] ? language : 'js';
}

export function transpileSource(source, language = 'js') {
  return { code: source, language: normalizeLanguage(language) };
}

