import React, { FC } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cleanQuestionText, preprocessTeXMacros, stripOrphanLeadingChars } from '../utils/sanitizer';

export interface MathTextProps {
  children?: string;
  text?: string;
  className?: string;
  inlineOnly?: boolean;
}

type Segment = { type: 'text' | 'inline' | 'display'; content: string };

/**
 * Split raw text into an array of typed segments.
 * Each segment is tagged as 'display' ($$...$$ or \[...\] or \begin{env}...\end{env}),
 * 'inline' ($...$ or \(...\)), or 'text'.
 */
export const splitIntoSegments = (text: string): Segment[] => {
  const cleanInput = stripOrphanLeadingChars(text);
  const segments: Segment[] = [];
  let i = 0;
  const len = cleanInput.length;
  let textStart = 0;

  const pushText = (end: number) => {
    const t = cleanInput.substring(textStart, end);
    if (t) segments.push({ type: 'text', content: t });
  };

  while (i < len) {
    // ---- Bare Environment Math: \begin{env} ... \end{env} ----
    if (cleanInput.startsWith('\\begin{', i)) {
      const closeEnvStart = cleanInput.indexOf('\\end{', i + 7);
      if (closeEnvStart !== -1) {
        const closeBrace = cleanInput.indexOf('}', closeEnvStart + 5);
        if (closeBrace !== -1) {
          pushText(i);
          const envEnd = closeBrace + 1;
          const mathContent = cleanInput.substring(i, envEnd);
          segments.push({ type: 'display', content: mathContent });
          i = envEnd;
          textStart = i;
          continue;
        }
      }
    }

    // ---- Display math: $$ ... $$ ----
    if (cleanInput.startsWith('$$', i)) {
      const close$$ = cleanInput.indexOf('$$', i + 2);
      if (close$$ === -1) {
        i++;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      let depth = 0;
      while (i < len) {
        if (cleanInput[i] === '{') depth++;
        else if (cleanInput[i] === '}') { if (depth > 0) depth--; }
        else if (cleanInput.startsWith('$$', i) && depth === 0) break;
        i++;
      }
      const mathContent = cleanInput.substring(mathStart, i);
      if (i < len) i += 2;
      segments.push({ type: 'display', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Display math: \[ ... \] ----
    if (cleanInput.startsWith('\\[', i)) {
      const closePos = cleanInput.indexOf('\\]', i + 2);
      if (closePos === -1) {
        pushText(i);
        i += 2;
        const mathContent = cleanInput.substring(i);
        segments.push({ type: 'display', content: mathContent });
        i = len;
        textStart = i;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      while (i < len && !cleanInput.startsWith('\\]', i)) i++;
      const mathContent = cleanInput.substring(mathStart, i);
      if (i < len) i += 2;
      segments.push({ type: 'display', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Inline math: \( ... \) ----
    if (cleanInput.startsWith('\\(', i)) {
      const closePos = cleanInput.indexOf('\\)', i + 2);
      if (closePos === -1) {
        pushText(i);
        i += 2;
        const mathContent = cleanInput.substring(i);
        segments.push({ type: 'inline', content: mathContent });
        i = len;
        textStart = i;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      while (i < len && !cleanInput.startsWith('\\)', i)) i++;
      const mathContent = cleanInput.substring(mathStart, i);
      if (i < len) i += 2;
      segments.push({ type: 'inline', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Inline math: $...$ (single dollar, not $$) ----
    if (cleanInput[i] === '$' && !cleanInput.startsWith('$$', i)) {
      const closeDollar = cleanInput.indexOf('$', i + 1);
      if (closeDollar === -1) {
        i++;
        continue;
      }
      pushText(i);
      i += 1;
      const mathStart = i;
      let depth = 0;
      while (i < len) {
        if (cleanInput[i] === '{') depth++;
        else if (cleanInput[i] === '}') { if (depth > 0) depth--; }
        else if (cleanInput[i] === '$' && depth === 0) break;
        i++;
      }
      const mathContent = cleanInput.substring(mathStart, i);
      if (i < len) i += 1;
      segments.push({ type: 'inline', content: mathContent });
      textStart = i;
      continue;
    }

    i++;
  }

  pushText(i);
  return segments;
};

/** Convert unrenderable TeX string to readable HTML/Unicode math symbols */
export const convertTeXToReadableHTML = (rawTeX: string): string => {
  let s = rawTeX;
  s = s.replace(/\\begin\{[a-zA-Z]+\}/g, '').replace(/\\end\{[a-zA-Z]+\}/g, '');
  for (let pass = 0; pass < 3; pass++) {
    s = s.replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '($1/$2)');
  }
  s = s.replace(/\\frac\s+([0-9a-zA-Z]+)\s+([0-9a-zA-Z]+)/g, '($1/$2)');
  s = s.replace(/\\Rightarrow/g, '⇒')
       .replace(/\\Leftarrow/g, '⇐')
       .replace(/\\rightarrow/g, '→')
       .replace(/\\leftarrow/g, '←')
       .replace(/\\cdot/g, '·')
       .replace(/\\times/g, '×')
       .replace(/\\alpha/g, 'α')
       .replace(/\\beta/g, 'β')
       .replace(/\\gamma/g, 'γ')
       .replace(/\\delta/g, 'δ')
       .replace(/\\theta/g, 'θ')
       .replace(/\\psi/g, 'ψ')
       .replace(/\\omega/g, 'ω')
       .replace(/\\pi/g, 'π')
       .replace(/\\mu/g, 'μ')
       .replace(/\\lambda/g, 'λ')
       .replace(/\\Delta/g, 'Δ')
       .replace(/\\Omega/g, 'Ω')
       .replace(/\\infty/g, '∞')
       .replace(/\\sum/g, '∑')
       .replace(/\\int/g, '∫')
       .replace(/\\sqrt\s*\{([^}]+)\}/g, '√$1')
       .replace(/\\sqrt/g, '√')
       .replace(/\\mathrm\s*\{([^}]+)\}/g, '$1')
       .replace(/\\text\s*\{([^}]+)\}/g, '$1')
       .replace(/\\left|\\right/g, '')
       .replace(/\\\\/g, '<br>')
       .replace(/&/g, ' ')
       .replace(/[\{\}]/g, '')
       .replace(/\\([a-zA-Z]+)/g, '$1');
  return s.trim();
};

/** Fix common corruption patterns before KaTeX rendering */
const fixCorruptedTeX = (tex: string): string => {
  let t = stripOrphanLeadingChars(tex);

  t = t.replace(/\\azin\b/g, '\\sin');
  t = t.replace(/\\asin\b/g, '\\sin');
  t = t.replace(/\\acos\b/g, '\\cos');
  t = t.replace(/\\atan\b/g, '\\tan');
  t = t.replace(/\\acot\b/g, '\\cot');
  t = t.replace(/\\tg\b/g, '\\tan');
  t = t.replace(/\\ctg\b/g, '\\cot');

  t = t.replace(/\\(mu|micro|nano|pico|femto|milli|kilo|mega|giga)\s*\.\s*([A-Za-z]+)\.?(?=\s|$|\\|\$)/gi, '\\$1\\text{$2}');
  t = t.replace(/\\(mu|micro)\s*([NCFHzmVAKgJWsT]|mol|rad|cd)\b(?!\s*\{)/g, '\\mu\\text{$2}');
  t = t.replace(/\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)\s*\.(?=\s|$|\\|\$)/g, '\\$1 ');
  t = t.replace(/(\\times|\\cdot)\s*10(?!\^)/g, '$1 10^');
  t = t.replace(/=\s*\\times/g, '= \\times');

  t = t.replace(/\^\{\s*(-?\s*\d+)\s*\}/g, (_, n) => `^{${n.replace(/\s+/g, '')}}`);
  t = t.replace(/(\^)(-\d+)(?!\})/g, '$1{$2}');
  t = t.replace(/\^(\d{2,})/g, '^{$1}');

  t = t.replace(/\\(sin|cos|tan|cot|sec|csc|log|ln|exp)\s+\^/g, '\\$1^');

  const leftParen = (t.match(/\\left\(/g) || []).length;
  const rightParen = (t.match(/\\right\)/g) || []).length;
  if (leftParen > rightParen) {
    let replaced = 0;
    const needed = leftParen - rightParen;
    t = t.replace(/\\right[.)](?!\]|\))/g, (m) => {
      if (replaced < needed) { replaced++; return '\\right)'; }
      return m;
    });
    if (replaced < needed) t += '\\right)'.repeat(needed - replaced);
  } else if (rightParen > leftParen) {
    let excess = rightParen - leftParen;
    t = t.replace(/\\right\)/g, (m) => {
      if (excess > 0) { excess--; return ')'; }
      return m;
    });
  }

  const leftBracket = (t.match(/\\left\[/g) || []).length;
  const rightBracket = (t.match(/\\right\]/g) || []).length;
  if (leftBracket > rightBracket) {
    let replaced = 0;
    const needed = leftBracket - rightBracket;
    t = t.replace(/\\right[.)](?!\])/g, (m) => {
      if (replaced < needed) { replaced++; return '\\right]'; }
      return m;
    });
    if (replaced < needed) t += '\\right]'.repeat(needed - replaced);
  } else if (rightBracket > leftBracket) {
    let excess = rightBracket - leftBracket;
    t = t.replace(/\\right\]/g, (m) => {
      if (excess > 0) { excess--; return ']'; }
      return m;
    });
  }

  const leftBrace = (t.match(/\\left\\\{/g) || []).length;
  const rightBrace = (t.match(/\\right\\\}/g) || []).length;
  if (leftBrace > rightBrace) {
    t += '\\right\\}'.repeat(leftBrace - rightBrace);
  } else if (rightBrace > leftBrace) {
    let excess = rightBrace - leftBrace;
    t = t.replace(/\\right\\\}/g, (m) => {
      if (excess > 0) { excess--; return '\\}'; }
      return m;
    });
  }

  // Fix KaTeX parse errors caused by math commands inside \text{...}
  t = t.replace(/\\text\s*\{([^}]*)\}/g, (match, inner) => {
    if (/\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega|Delta|Omega|Theta|Lambda|Sigma|Phi|Psi|frac|sqrt|int|sum|prod|lim|infty|Rightarrow|Leftarrow|rightarrow|leftarrow)/.test(inner)) {
      const cleaned = inner.replace(/(\\([a-zA-Z]+))/g, '}\\$2\\text{');
      return `\\text{${cleaned}}`.replace(/\\text\{\s*\}/g, '');
    }
    return match;
  });

  t = t.replace(/(?<!\\)times(?=[A-Za-z0-9\s\\\[\(\{\_])/gi, '\\times ');
  t = t.replace(/\btimes\b(?!\\)/gi, '\\times ');

  t = t.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
  t = t.replace(/\{\s*-\s*\\frac/g, ' -\\frac');
  t = t.replace(/\{\s*-\s*/g, ' - ');
  t = t.replace(/^\{\s*/g, '');

  t = t.replace(/^\{{2,}\s*/gm, '');   // Remove 2+ orphan leading braces at line start
  t = t.replace(/\{{3,}\s*\\?/g, '\\'); // Collapse 3+ braces to single backslash

  // frac with space-separated args (multi-char): "frac 1 v" -> "\frac{1}{v}"
  t = t.replace(/(?<!\\)frac\s+([a-zA-Z0-9][a-zA-Z0-9_^]*)\s+([a-zA-Z0-9][a-zA-Z0-9_^]*)/g, '\\frac{$1}{$2}');
  t = t.replace(/\\frac\s+([a-zA-Z0-9][a-zA-Z0-9_^]*)\s+([a-zA-Z0-9][a-zA-Z0-9_^]*)/g, '\\frac{$1}{$2}');

  t = t.replace(/(?<!\\frac)\{([a-zA-Z0-9_\^\s]+)\}\s*\{([a-zA-Z0-9_\^\s]+)\}/g, (match, g1, g2) => {
    if (g1.startsWith('d') || g2.startsWith('d') || g2 === 'dt' || g2 === 'dx' || g2 === 'dy' || g2 === 'dz') {
      return `\\frac{${g1}}{${g2}}`;
    }
    return match;
  });

  t = t.replace(/\{1\s*([a-zA-Z][a-zA-Z0-9_]*)\}/g, '{$1}');
  t = t.replace(/\{1\s*([a-zA-Z][a-zA-Z0-9_]*)/g, '{$1');
  t = t.replace(/\\frac\s*\{\s*1\s*\}\s*\{\s*1([a-zA-Z])\s*\}/g, '\\frac{1}{$1}');
  t = t.replace(/\\frac\s*\{\s*2\s*\}\s*\{\s*1([a-zA-Z])\s*\}/g, '\\frac{2}{$1}');

  t = t.replace(/\}\}\s*([a-zA-Z0-9_\^]+)/g, '} $1');
  t = t.replace(/\}\s*\{\s*([a-zA-Z0-9_]+)\s*\}/g, '} $1');

  t = t.replace(/(?<!\\)fracfrac/gi, '\\frac{\\frac');
  t = t.replace(/\\frac\s*\{\s*([^}]+)\s*\}\s*\{\s*--\s*\}/g, '-\\frac{$1}{1}');
  t = t.replace(/\^\s*\\frac\s*\{\s*(\d+)\s*\}\s*\{\s*1\s*\}/g, '^{$1}');
  t = t.replace(/\^\s*\\frac\s*\{\s*([a-zA-Z0-9+\-]+)\s*\}\s*\{\s*1\s*\}/g, '^{$1}');

  t = t.replace(/\\right\s*$/g, '');
  t = t.replace(/\\left\s*$/g, '');

  return t;
};

/** KaTeX render helper — returns rendered HTML or styled fallback (never raw TeX or red boxes) */
const renderKaTeX = (mathContent: string, displayMode: boolean): string => {
  try {
    const fixed = fixCorruptedTeX(mathContent.trim());
    const cleaned = preprocessTeXMacros(fixed);
    const result = katex.renderToString(cleaned, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      macros: {
        '\\degree': '^{\\circ}',
        '\\Celsius': '^{\\circ}\\text{C}',
        '\\eps': '\\varepsilon',
        '\\d': '\\mathrm{d}',
        '\\therefore': '\\Rightarrow ',
        '\\because': '\\Leftarrow ',
      },
    });

    if (result.includes('katex-error')) {
      const readableFallback = convertTeXToReadableHTML(cleaned);
      return `<span class="katex-fallback font-serif italic">${readableFallback}</span>`;
    }

    return result;
  } catch (e) {
    console.warn('KaTeX render error:', e, 'Content:', mathContent);
    const readableText = convertTeXToReadableHTML(mathContent);
    return `<span class="katex-fallback font-serif italic">${readableText}</span>`;
  }
};

/** Detect if a plain text segment still contains bare TeX macros */
const BARE_TEX_RE =
  /\\(left|right|matrix|cases|begin|end|frac|sqrt|vec|hat|bar|tilde|dot|ddot|widehat|underbrace|overbrace|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|over|ne|le|ge|to|infty|sum|prod|int|oint|lim|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|log|ln|exp|det|cdot|times|div|pm|mp|partial|nabla|hbar|ell|forall|exists|in|notin|subset|supset|cup|cap|emptyset|angle|parallel|perp|propto|sim|approx|equiv|cong|neq|leq|geq|ll|gg|subset|supset|subseteq|supseteq|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|uparrow|downarrow|text|mathrm|mathbf|mathit|mathcal|mathbb|operatorname|underset|overset|stackrel|limits|nolimits|displaystyle|textstyle|scriptstyle|scriptscriptstyle|raisebox|rule|hspace|vspace|mbox|quad|qquad|,|;|!|:|\\\\)/i;

/** Extract a full bare TeX expression token starting at position i in text */
const parseBareTeXTokenAt = (text: string, startIdx: number): { token: string; endIdx: number } | null => {
  let i = startIdx;
  const len = text.length;
  if (text[i] !== '\\') return null;

  let cmd = '\\';
  i++;

  // Handle single-char TeX special escapes: \%, \$, \{, \}, \_, \&, \#, \~, \,, \;, \:
  if (i < len && /[%${}&#~_,;:!]/.test(text[i])) {
    return { token: cmd + text[i], endIdx: i + 1 };
  }

  while (i < len && /[a-zA-Z]/.test(text[i])) {
    cmd += text[i];
    i++;
  }

  if (cmd === '\\left') {
    let depth = 1;
    while (i < len && depth > 0) {
      if (text.startsWith('\\left', i)) depth++;
      else if (text.startsWith('\\right', i)) {
        depth--;
        if (depth === 0) {
          i += 6;
          if (i < len && /[()\[\]{}|.]/.test(text[i])) i++;
          break;
        }
      }
      i++;
    }
    return { token: text.substring(startIdx, i), endIdx: i };
  }

  if (cmd === '\\begin') {
    const endEnv = text.indexOf('\\end{', i);
    if (endEnv !== -1) {
      const closeBrace = text.indexOf('}', endEnv + 5);
      if (closeBrace !== -1) {
        return { token: text.substring(startIdx, closeBrace + 1), endIdx: closeBrace + 1 };
      }
    }
  }

  while (i < len) {
    while (i < len && /[ \t]/.test(text[i])) i++;

    if (i < len && (text[i] === '{' || text[i] === '[')) {
      const openChar = text[i];
      const closeChar = openChar === '{' ? '}' : ']';
      let depth = 1;
      i++;
      while (i < len && depth > 0) {
        if (text[i] === openChar) depth++;
        else if (text[i] === closeChar) depth--;
        i++;
      }
    } else if (i < len && (text[i] === '_' || text[i] === '^')) {
      i++;
      if (i < len && text[i] === '{') {
        let depth = 1;
        i++;
        while (i < len && depth > 0) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') depth--;
          i++;
        }
      } else {
        if (i < len) i++;
      }
    } else {
      break;
    }
  }

  const token = text.substring(startIdx, i);
  return token.length > 1 ? { token, endIdx: i } : null;
};

/** Process a single text line that may contain bare TeX macros */
const processSingleTextLine = (
  text: string,
  inlineOnly: boolean,
  addKaTeXBlock: (html: string) => string
): string => {
  if (!BARE_TEX_RE.test(text)) {
    // No TeX macros — escape HTML but preserve HTML placeholder tokens intact
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const trimmed = text.trim();
  const hasCases = trimmed.includes('\\begin{') || trimmed.includes('\\left\\{') || trimmed.includes('\\[');
  const hasNewlines = trimmed.includes('\\\\');
  const startsWithMacro = /^[\(\{\[\s\-+]*\\(frac|sqrt|matrix|cases|begin|int|sum|prod|lim|vec|hat|overline|Rightarrow|Leftarrow)\b/i.test(trimmed);
  const startsWithWord = /^[A-Za-z]{3,}\s/.test(trimmed.replace(/^\{\{+/, ''));
  const containsEqOrTeX = /[=\+\-]\s*\\frac|\\frac.*\\frac|\\Rightarrow|\\int|\\sum|\^\\frac|\{.*\\frac|\\frac.*=|=.*\\frac|\{+\\Rightarrow/i.test(trimmed);
  const hasMultipleMacros =
    (trimmed.match(/\\(frac|sqrt|Rightarrow|Leftarrow|rightarrow|leftarrow|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|int|oint|sum|prod|lim|vec|hat|bar|tilde|partial|nabla|hbar|infty|cdot|times|div|pm|mp)/g) || []).length >= 1;
  // Detect bare ^ or _ superscript/subscript patterns (e.g. 10^-n, x^{2}, n_{0})
  const hasBareExponent = /\^\s*[\{\-]?\s*[a-zA-Z0-9]|_\s*\{/.test(trimmed);
  // Detect simple equations: e.g. "n = 7", "x = 10^{-3}"
  const isShortEquation = /^[a-zA-Z_]\s*[=<>]\s*[-+]?[0-9a-zA-Z\^\{\}\\_.]+$/.test(trimmed.replace(/\s+/g, ' '));
  // Detect lines that start with = and contain any LaTeX command → derivation step
  const isDerivationStep = /^[=\+\-]\s*.*\\[a-zA-Z]/.test(trimmed) || /^\\[a-zA-Z].*=/.test(trimmed);

  const isLikelyFullFormula = (
    hasCases ||
    hasNewlines ||
    (hasMultipleMacros && containsEqOrTeX) ||
    (startsWithMacro && !startsWithWord) ||
    (hasBareExponent && BARE_TEX_RE.test(trimmed)) ||
    isShortEquation ||
    isDerivationStep
  ) && trimmed.length > 2;

  if (isLikelyFullFormula) {
    const displayMode = !inlineOnly && (hasCases || hasNewlines || trimmed.length > 30);
    return addKaTeXBlock(renderKaTeX(trimmed, displayMode));
  }

  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    if (text[i] === '\\') {
      const parsed = parseBareTeXTokenAt(text, i);
      if (parsed && parsed.token.length > 1) {
        result += addKaTeXBlock(renderKaTeX(parsed.token, false));
        i = parsed.endIdx;
        continue;
      }
    }

    const char = text[i];
    if (char === '&') result += '&amp;';
    else if (char === '<') result += '&lt;';
    else if (char === '>') result += '&gt;';
    else result += char;

    i++;
  }

  return result;
};

/** Convert Markdown tables and basic markdown formatting into HTML elements */
const renderMarkdownAndTables = (text: string): string => {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  let inTable = false;
  let tableBuffer: string[] = [];
  const outLines: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    if (tableBuffer.length >= 2) {
      let html = '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-slate-300 rounded-lg text-sm my-2">';
      let isHeader = true;

      for (let idx = 0; idx < tableBuffer.length; idx++) {
        const line = tableBuffer[idx];
        if (line.replace(/[\s|:-]/g, '').length === 0) {
          continue; // Divider line |---|---|
        }

        const cells = line.split('|').map(c => c.trim()).filter((c, i, a) => !(i === 0 && c === '') && !(i === a.length - 1 && c === ''));
        if (cells.length === 0) continue;

        if (isHeader) {
          html += '<thead class="bg-slate-100 font-bold"><tr>';
          cells.forEach(cell => {
            html += `<th class="border border-slate-300 p-2.5 text-left">${cell}</th>`;
          });
          html += '</tr></thead><tbody>';
          isHeader = false;
        } else {
          html += '<tr>';
          cells.forEach(cell => {
            html += `<td class="border border-slate-300 p-2.5">${cell}</td>`;
          });
          html += '</tr>';
        }
      }

      if (!isHeader) html += '</tbody>';
      html += '</table></div>';
      outLines.push(html);
    } else {
      outLines.push(...tableBuffer);
    }
    tableBuffer = [];
    inTable = false;
  };

  for (const line of lines) {
    const isTableLine = line.trim().startsWith('|') && line.includes('|');
    if (isTableLine) {
      inTable = true;
      tableBuffer.push(line.trim());
    } else {
      if (inTable) flushTable();
      outLines.push(line);
    }
  }
  if (inTable) flushTable();

  let body = outLines.join('\n');

  // Convert Bold: **text** or __text__ -> <strong>text</strong>
  body = body.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Convert Headers: ### Header -> <h3>Header</h3>
  body = body.replace(/^###\s+(.*$)/gm, '<h4 class="text-base font-bold my-2">$1</h4>');
  body = body.replace(/^##\s+(.*$)/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');
  body = body.replace(/^#\s+(.*$)/gm, '<h2 class="text-xl font-black my-3">$1</h2>');

  // Handle list formatting
  const lineArray = body.split('\n');
  const finalProcessed: string[] = [];
  let inList = false;
  let listType = 'ul';

  const numberedRe = /^\s*\d+[\.\)]\s/;
  const bulletRe = /^\s*[-•*]\s/;

  for (const l of lineArray) {
    const trimmed = l.trim();
    if (numberedRe.test(trimmed) || bulletRe.test(trimmed)) {
      const isNum = numberedRe.test(trimmed);
      const tag = isNum ? 'ol' : 'ul';
      if (!inList || listType !== tag) {
        if (inList) finalProcessed.push(`</${listType}>`);
        finalProcessed.push(`<${tag} style="margin:0.5em 0 0.5em 1.5em; padding:0;">`);
        inList = true;
        listType = tag;
      }
      const itemContent = trimmed.replace(/^\s*(?:\d+[\.\)]|[-•*])\s*/, '');
      finalProcessed.push(`<li style="margin:2px 0;">${itemContent}</li>`);
    } else {
      if (inList) {
        finalProcessed.push(`</${listType}>`);
        inList = false;
      }
      finalProcessed.push(l);
    }
  }
  if (inList) finalProcessed.push(`</${listType}>`);

  return finalProcessed.join('\n').replace(/\n/g, '<br>');
};

/**
 * Auto-detect multi-line derivation blocks in text segments that contain equations/macros on multiple lines,
 * and auto-wrap them in \begin{aligned} ... \end{aligned} display math.
 */
const autoWrapMultiLineDerivations = (text: string): string => {
  if (!text || !text.includes('\n')) return text;

  const lines = text.split(/\r?\n/);
  const resultLines: string[] = [];
  let mathBuffer: string[] = [];

  const isMathLine = (l: string): boolean => {
    const trimmed = l.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('\\begin{') || trimmed.startsWith('\\[') || trimmed.startsWith('$$')) return false;

    // Starts with a math operator or leading LaTeX command (with or without backslash)
    const startsWithMathOp =
      /^[=\+\-\\\u0026]\s*/.test(trimmed) ||
      /^\\(Rightarrow|Leftarrow|rightarrow|leftarrow|frac|int|sum|prod|lim|vec|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|psi|omega|Delta|Omega)\b/i.test(trimmed) ||
      // Bare OCR patterns: lines starting with "=frac...", "=fracfrac...", etc.
      /^=\s*frac/.test(trimmed) ||
      /^frac/.test(trimmed);

    // Contains ANY LaTeX macro (all Greek letters + common commands)
    const hasMathSymbols =
      (trimmed.match(/\\(frac|sqrt|Rightarrow|Leftarrow|rightarrow|leftarrow|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|int|oint|sum|prod|lim|vec|hat|bar|tilde|partial|nabla|hbar|infty|cdot|times|div|pm|mp)/g) || []).length >= 1 ||
      // Bare OCR macros still present as words (preprocessTeXMacros hasn't run on this segment yet)
      /\bfracfrac\b|\bfrac[A-Za-z\\]|\blimits\b|\bvec[a-z]\b/.test(trimmed);

    // Has = sign AND any LaTeX command (not just \\frac)
    const hasEqAndTeX = /[=]\s*\\[a-zA-Z]|\\[a-zA-Z].*=|=.*\\[a-zA-Z]/i.test(trimmed) ||
      /[=]\s*frac[A-Za-z\\{(]|=\s*\\frac/.test(trimmed);

    return startsWithMathOp || (hasMathSymbols && hasEqAndTeX);
  };

  const flushMathBuffer = () => {
    if (mathBuffer.length === 0) return;
    if (mathBuffer.length >= 2) {
      const cleanedBuffer = mathBuffer.map(line => {
        let l = line.trim();
        if (!l.startsWith('&') && (l.startsWith('=') || l.startsWith('\\Rightarrow') || l.startsWith('+') || l.startsWith('-'))) {
          l = '& ' + l;
        }
        return l;
      });
      resultLines.push('$$\n\\begin{aligned}\n' + cleanedBuffer.join(' \\\\\n') + '\n\\end{aligned}\n$$');
    } else {
      // Single math line — wrap in $$ display block so it renders via KaTeX
      // instead of falling through to processSingleTextLine as unwrapped text
      const singleLine = mathBuffer[0].trim();
      resultLines.push(`$$${singleLine}$$`);
    }
    mathBuffer = [];
  };

  for (const line of lines) {
    if (isMathLine(line)) {
      mathBuffer.push(line);
    } else {
      if (mathBuffer.length > 0) flushMathBuffer();
      resultLines.push(line);
    }
  }
  if (mathBuffer.length > 0) flushMathBuffer();

  return resultLines.join('\n');
};

const RENDER_CACHE = new Map<string, string>();
const MAX_CACHE_SIZE = 5000;

/** Decode HTML entities in a string (used before HTML-tag stashing) */
const decodeHTMLEntities = (str: string): string => {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
};

/**
 * Regex matching HTML tags we want to preserve as raw HTML (not escape through processSingleTextLine).
 * EXCLUDED from stashing (handled by cleanQuestionText instead):
 *   <p>, <br> — cleanQuestionText converts these to \n separators
 *   <sub>, <sup> — cleanQuestionText converts these to _{} and ^{} TeX notation
 * INCLUDED (must survive as raw HTML in the final rendered output):
 *   <img> — question/explanation diagrams
 *   <table>, <thead>, <tbody>, <tr>, <td>, <th> — structured comparison tables
 *   <b>, <i>, <strong>, <em> — inline emphasis (appears in explanation text)
 *   <ul>, <ol>, <li> — bulleted/numbered lists in explanations
 *   <span>, <h1>-<h6> — generic inlines and headers in explanation HTML
 */
const PRESERVE_HTML_RE = /<(?:img|table|thead|tbody|tr|td|th|b|i|strong|em|ul|ol|li|span|h[1-6])\b[^>]*\/?>|<\/(?:table|thead|tbody|tr|td|th|b|i|strong|em|ul|ol|li|span|h[1-6])>/gi;

export const renderMathInText = (rawText: string, inlineOnly = false): string => {
  if (!rawText) return '';

  const cacheKey = `${inlineOnly ? 'inline:' : 'full:'}${rawText}`;
  if (RENDER_CACHE.has(cacheKey)) {
    return RENDER_CACHE.get(cacheKey)!;
  }

  // ── Step 0: Pre-decode HTML entities BEFORE stashing ─────────────────────
  let rawDecoded = decodeHTMLEntities(String(rawText));

  // ── Step 1: Stash ALL preserved HTML blocks before any text processing ────
  const htmlBlocks: string[] = [];
  const addHtmlBlock = (htmlStr: string): string => {
    const idx = htmlBlocks.length;
    htmlBlocks.push(htmlStr);
    return `%%%HTMLBLOCK${idx}%%%`;
  };

  // Stash complete multi-line HTML table blocks first (greedy, captures whole table)
  let textToProcess = rawDecoded.replace(
    /<table\b[^>]*>[\s\S]*?<\/table>/gi,
    (match) => addHtmlBlock(match)
  );

  // Stash remaining individual preserved HTML tags (img, b, i, strong, em, ul, ol, li, span, h1-h6)
  textToProcess = textToProcess.replace(PRESERVE_HTML_RE, (match) => addHtmlBlock(match));

  let text = cleanQuestionText(textToProcess);
  if (!text) return '';

  text = autoWrapMultiLineDerivations(text);

  const katexBlocks: string[] = [];
  const addKaTeXBlock = (html: string): string => {
    const idx = katexBlocks.length;
    katexBlocks.push(html);
    return `%%%KATEXBLOCK${idx}%%%`;
  };

  const segments = splitIntoSegments(text);
  const parts: string[] = [];

  for (const seg of segments) {
    if (seg.type === 'display') {
      const html = renderKaTeX(seg.content, !inlineOnly);
      parts.push(addKaTeXBlock(html));
    } else if (seg.type === 'inline') {
      const html = renderKaTeX(seg.content, false);
      parts.push(addKaTeXBlock(html));
    } else {
      if (seg.content.includes('\n')) {
        const rendered = seg.content
          .split(/\r?\n/)
          .map(line => processSingleTextLine(line, inlineOnly, addKaTeXBlock))
          .join('\n');
        parts.push(rendered);
      } else {
        const rendered = processSingleTextLine(seg.content, inlineOnly, addKaTeXBlock);
        parts.push(rendered);
      }
    }
  }

  const combinedText = parts.join('');
  let finalHtml = renderMarkdownAndTables(combinedText);

  // Re-insert protected KaTeX blocks into the final HTML
  finalHtml = finalHtml.replace(/%%%KATEXBLOCK(\d+)%%%/g, (_, idxStr) => {
    const idx = parseInt(idxStr, 10);
    return katexBlocks[idx] || '';
  });

  // Re-insert protected HTML blocks (img, table, sub, sup, b, i, etc.) into the final HTML
  finalHtml = finalHtml.replace(/%%%HTMLBLOCK(\d+)%%%/g, (_, idxStr) => {
    const idx = parseInt(idxStr, 10);
    return htmlBlocks[idx] || '';
  });

  if (RENDER_CACHE.size > MAX_CACHE_SIZE) {
    const firstKey = RENDER_CACHE.keys().next().value;
    if (firstKey) RENDER_CACHE.delete(firstKey);
  }
  RENDER_CACHE.set(cacheKey, finalHtml);

  return finalHtml;
};

const MathText: FC<MathTextProps> = ({
  children,
  text,
  className = '',
  inlineOnly = false,
}: MathTextProps) => {
  const contentToRender =
    children !== undefined ? children : text !== undefined ? text : '';

  const htmlContent = React.useMemo(() => {
    return renderMathInText(contentToRender, inlineOnly);
  }, [contentToRender, inlineOnly]);

  return (
    <span
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathText;
