/**
 * Question & Math Sanitizer Utility
 * Cleans up raw text, decodes HTML entities, strips internal tags like [JEE Hard #123],
 * extracts math from pre-rendered KaTeX HTML, and converts legacy TeX macros to KaTeX.
 */

const PUA_MAP: Record<string, string> = {
  '\uf02d': '-',
  '\uf02b': '+',
  '\uf03d': '=',
  '\uf03c': '<',
  '\uf03e': '>',
  '\uf0b3': '≥',
  '\uf0a3': '≤',
  '\uf0b9': '≠',
  '\uf0ce': '∈',
  '\uf0cd': '∉',
  '\uf0c8': '∪',
  '\uf0c7': '∩',
  '\uf0ae': '→',
  '\uf0be': '→',
  '\uf0de': '→',
  '\uf0b4': '×',
  '\uf0d7': '⋅',
  '\uf0b7': '⋅',
  '\uf0b0': '°',
  '\uf0b1': '±',
  '\uf020': ' ',
  '\uf028': '(',
  '\uf029': ')',
  '\uf05b': '[',
  '\uf05d': ']',
  '\uf07b': '{',
  '\uf07d': '}',
  '\uf0f2': '∫',
  '\uf0e5': '∑',
  '\uf061': 'α',
  '\uf062': 'β',
  '\uf067': 'γ',
  '\uf064': 'δ',
  '\uf065': 'ε',
  '\uf066': 'φ',
  '\uf068': 'η',
  '\uf06c': 'λ',
  '\uf06d': 'μ',
  '\uf06e': 'ν',
  '\uf070': 'π',
  '\uf071': 'θ',
  '\uf072': 'ρ',
  '\uf073': 'σ',
  '\uf077': 'ω',
  '\uf049': 'I',
  '\uf04c': 'Λ',
  '\uf0a5': '∞',
  '\uf0bc': '⋅',
  '\uf0ba': '≡',
};

export const preprocessTeXMacros = (tex: string): string => {
  if (!tex) return '';
  let m = tex;
  
  // 1. Convert TeX \over fraction notation: { A \over B } -> \frac{A}{B}
  // Repeat to handle nested \over
  for (let i = 0; i < 5; i++) {
    if (!m.includes('\\over')) break;
    m = m.replace(/\{\s*([^{}]+?)\s+\\over\s+([^{}]+?)\s*\}/g, '\\frac{$1}{$2}');
    m = m.replace(/([a-zA-Z0-9_\{\}\(\)\|]+)\s+\\over\s+([a-zA-Z0-9_\{\}\(\)\|]+)/g, '\\frac{$1}{$2}');
  }
  
  // 2. Convert TeX \matrix notation: {\matrix{ A & B \cr C & D }} or \matrix{ A & B \cr C & D }
  m = m.replace(/\{\s*\\matrix\s*\{([\s\S]*?)\}\s*\}/g, '\\begin{matrix}$1\\end{matrix}');
  m = m.replace(/\\matrix\s*\{([\s\S]*?)\}/g, '\\begin{matrix}$1\\end{matrix}');
  
  // 3. Convert TeX \cr line breaks to KaTeX \\ line breaks
  m = m.replace(/\\cr\b/g, '\\\\');
  
  // 4. Convert \left\{ \begin{matrix} ... \end{matrix} \right. to \begin{cases} ... \end{cases}
  m = m.replace(/\\left\\\{\s*\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}\s*\\right\./g, '\\begin{cases}$1\\end{cases}');
  m = m.replace(/\\left\\\{\s*([\s\S]*?)\\right\./g, (match, inner) => {
    if (inner.includes('&') || inner.includes('\\\\')) {
      return `\\begin{cases}${inner}\\end{cases}`;
    }
    return match;
  });

  return m;
};

export const cleanQuestionText = (text: string): string => {
  if (!text) return '';

  let cleaned = String(text);

  // 0. Extract math from embedded pre-rendered KaTeX HTML (<annotation encoding="application/x-tex">TeX</annotation>)
  if (cleaned.includes('<annotation encoding="application/x-tex">') || cleaned.includes('<span class="katex">') || cleaned.includes('<math')) {
    // Replace display KaTeX HTML blocks with extracted TeX
    cleaned = cleaned.replace(/<span class="katex-display">[\s\S]*?<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>[\s\S]*?<\/span>\s*<\/span>/gi, ' $$$$ $1 $$$$ ');
    // Replace inline KaTeX HTML blocks with extracted TeX
    cleaned = cleaned.replace(/<span class="katex">[\s\S]*?<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>[\s\S]*?<\/span>/gi, ' $ $1 $ ');
    // Strip leftover KaTeX HTML containers or math elements
    cleaned = cleaned.replace(/<span class="katex[^"]*">[\s\S]*?<\/span>/gi, '');
    cleaned = cleaned.replace(/<math[\s\S]*?<\/math>/gi, '');
  }

  // 1. Strip internal identification tags like [JEE Hard #771], [NEET Medium #3015], [#507]
  cleaned = cleaned.replace(/\[\s*(JEE|NEET|KCET|UPSC)?\s*(Hard|Medium|Easy|Advanced|Main)?\s*#\d+\s*\]/gi, '');
  cleaned = cleaned.replace(/\[\s*#\d+\s*\]/gi, '');

  // 2. Decode common HTML entities that break math rendering
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 3. Clean up bad HTML breaks inside or outside math blocks
  cleaned = cleaned.replace(/<\s*br\s*\/?>/gi, ' ');

  // 4. Replace Private Use Area (PUA) font glyphs from PDF extraction
  cleaned = cleaned.replace(/[\uf000-\uf0ff]/g, (char) => PUA_MAP[char] || '');

  // 5. Preprocess TeX macros (\matrix, \over, \cr, \left\{ ... \right.)
  cleaned = preprocessTeXMacros(cleaned);

  // 6. Clean up corrupted greatest integer notation artifacts like [ ]≡ or [ ]⋅
  cleaned = cleaned.replace(/\[\s*\]\s*≡/g, '[·]').replace(/\[\s*\]\s*⋅/g, '[·]');

  // 7. Clean up KaTeX formatting issues (e.g. {\rho _{oil}} formatting)
  cleaned = cleaned.replace(/\{\s*\\rho\s*_\{([^}]+)\}\s*\}/g, '\\rho_{$1}');

  return cleaned.trim();
};
