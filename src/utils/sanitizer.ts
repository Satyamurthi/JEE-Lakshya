/**
 * Question & Math Sanitizer Utility
 * Cleans up raw text, decodes HTML entities, strips internal tags like [JEE Hard #123],
 * strips malformed/pre-rendered HTML tags, and fixes KaTeX formatting & fraction syntax errors.
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

export const fixTeXBraces = (tex: string): string => {
  if (!tex) return '';
  let t = tex;

  // 1. Clean up corrupted fractions with parens/braces like \frac{((309)}{{22}} or \frac{((135)}{{2}} or \frac{((135)}{(2)}
  t = t.replace(/\\frac\s*\{\s*[\(\{\s]*([^()\{\}\s]+)[\)\}\s]*\}\s*\{\s*[\(\{\s]*([^()\{\}\s]+)[\)\}\s]*\}/gi, '\\frac{$1}{$2}');
  t = t.replace(/\\frac\s*\{\s*[\(\{\s]*([^{}]+?)[\)\}\s]*\}\s*\{\s*[\(\{\s]*([^{}]+?)[\)\}\s]*\}/gi, '\\frac{$1}{$2}');

  // 2. Clean up double parentheses inside math expressions: ((A)) -> (A), ((A) -> (A)
  t = t.replace(/\(\(\s*([^()]+)\s*\)\)/gi, '($1)');
  t = t.replace(/\(\(\s*([^()]+)\s*\)/gi, '($1)');
  t = t.replace(/\(\s*([^()]+)\s*\)\)/gi, '($1)');

  // 3. Balance unclosed braces if any
  let openCount = (t.match(/\{/g) || []).length;
  let closeCount = (t.match(/\}/g) || []).length;
  while (openCount > closeCount) {
    t += '}';
    closeCount++;
  }
  return t;
};

export const replaceRaiseLower = (text: string): string => {
  if (!text) return '';
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    if (text.startsWith('\\raise', i) || text.startsWith('\\lower', i)) {
      const isRaise = text.startsWith('\\raise', i);
      const startIdx = i;
      i += 6;
      
      while (i < len && /\s/.test(text[i])) i++;
      let dim = '';
      while (i < len && /[0-9\.\-a-zA-Z]/.test(text[i])) {
        dim += text[i];
        i++;
      }
      
      while (i < len && /\s/.test(text[i])) i++;
      if (text.startsWith('\\hbox', i)) {
        i += 5;
        while (i < len && /\s/.test(text[i])) i++;
        
        if (i < len && text[i] === '{') {
          i++;
          let braceCount = 1;
          let content = '';
          
          while (i < len && braceCount > 0) {
            const char = text[i];
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
            }
            if (braceCount > 0) {
              content += char;
            }
            i++;
          }
          
          let cleanedContent = content.trim();
          while (cleanedContent.startsWith('$')) {
            cleanedContent = cleanedContent.slice(1).trim();
          }
          while (cleanedContent.endsWith('$')) {
            cleanedContent = cleanedContent.slice(0, -1).trim();
          }
          
          const targetDim = isRaise ? dim : `-${dim}`;
          const replacement = `\\raisebox{${targetDim}}{$${cleanedContent}$}`;
          result += replacement;
          continue;
        }
      }
      
      result += text.substring(startIdx, i);
      continue;
    }
    
    result += text[i];
    i++;
  }
  
  return result;
};

export const preprocessTeXMacros = (tex: string): string => {
  if (!tex) return '';
  let m = tex;

  // 0. Replace Plain TeX \raise and \lower with LaTeX \raisebox
  m = replaceRaiseLower(m);

  // Fix double parentheses or corrupted braces first
  m = fixTeXBraces(m);

  // 1. Convert TeX \over fraction notation: { A \over B } -> \frac{A}{B}
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

  // 5. Convert Plain TeX italic correction slashes to normal division slashes
  m = m.replace(/\\\/([^\/a-zA-Z]|$)/g, '/$1');
  m = m.replace(/\\\//g, '/');

  return m;
};

export const cleanQuestionText = (text: string): string => {
  if (!text) return '';

  let cleaned = String(text);

  // 1. FIRST decode HTML entities (&lt; -> <, &gt; -> >, &amp; -> &, &quot; -> ", &#39; -> ', &nbsp; -> ' ')
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 2. Extract raw TeX from embedded annotation blocks (<annotation ...>TeX</annotation>) if present
  if (/<[\s]*annotation/i.test(cleaned)) {
    cleaned = cleaned.replace(/<\s*annotation[^>]*>([\s\S]*?)<\s*\/\s*annotation\s*>/gi, ' $$$$ $1 $$$$ ');
  }

  // 3. Strip ALL HTML-like tags (including malformed tags with spaces like < spanclass = ... >, < / span >, < mathxmlns = ... >)
  cleaned = cleaned.replace(/<\s*\/?[^>]+>/gi, ' ');

  // 4. Strip internal identification tags like [JEE Hard #771], [NEET Medium #3015], [#507]
  cleaned = cleaned.replace(/\[\s*(JEE|NEET|KCET|UPSC)?\s*(Hard|Medium|Easy|Advanced|Main)?\s*#\d+\s*\]/gi, '');
  cleaned = cleaned.replace(/\[\s*#\d+\s*\]/gi, '');

  // 5. Replace Private Use Area (PUA) font glyphs from PDF extraction
  cleaned = cleaned.replace(/[\uf000-\uf0ff]/g, (char) => PUA_MAP[char] || '');

  // 6. Preprocess TeX macros (\matrix, \over, \cr, \left\{ ... \right., brace fixes)
  cleaned = preprocessTeXMacros(cleaned);

  // 7. Clean up corrupted greatest integer notation artifacts like [ ]≡ or [ ]⋅
  cleaned = cleaned.replace(/\[\s*\]\s*≡/g, '[·]').replace(/\[\s*\]\s*⋅/g, '[·]');

  // 8. Clean up KaTeX formatting issues (e.g. {\rho _{oil}} formatting)
  cleaned = cleaned.replace(/\{\s*\\rho\s*_\{([^}]+)\}\s*\}/g, '\\rho_{$1}');

  // 9. Normalize contiguous whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
};
