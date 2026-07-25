import React, { FC } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cleanQuestionText, preprocessTeXMacros } from '../utils/sanitizer';

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
  const segments: Segment[] = [];
  let i = 0;
  const len = text.length;
  let textStart = 0;

  const pushText = (end: number) => {
    const t = text.substring(textStart, end);
    if (t) segments.push({ type: 'text', content: t });
  };

  while (i < len) {
    // ---- Bare Environment Math: \begin{env} ... \end{env} ----
    if (text.startsWith('\\begin{', i)) {
      const closeEnvStart = text.indexOf('\\end{', i + 7);
      if (closeEnvStart !== -1) {
        const closeBrace = text.indexOf('}', closeEnvStart + 5);
        if (closeBrace !== -1) {
          pushText(i);
          const envEnd = closeBrace + 1;
          const mathContent = text.substring(i, envEnd);
          segments.push({ type: 'display', content: mathContent });
          i = envEnd;
          textStart = i;
          continue;
        }
      }
    }

    // ---- Display math: $$ ... $$ ----
    if (text.startsWith('$$', i)) {
      const close$$ = text.indexOf('$$', i + 2);
      if (close$$ === -1) {
        i++;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      let depth = 0;
      while (i < len) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { if (depth > 0) depth--; }
        else if (text.startsWith('$$', i) && depth === 0) break;
        i++;
      }
      const mathContent = text.substring(mathStart, i);
      if (i < len) i += 2;
      segments.push({ type: 'display', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Display math: \[ ... \] ----
    if (text.startsWith('\\[', i)) {
      const closePos = text.indexOf('\\]', i + 2);
      if (closePos === -1) {
        pushText(i);
        i += 2;
        const mathContent = text.substring(i);
        segments.push({ type: 'display', content: mathContent });
        i = len;
        textStart = i;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      while (i < len && !text.startsWith('\\]', i)) i++;
      const mathContent = text.substring(mathStart, i);
      if (i < len) i += 2;
      segments.push({ type: 'display', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Inline math: \( ... \) ----
    if (text.startsWith('\\(', i)) {
      const closePos = text.indexOf('\\)', i + 2);
      if (closePos === -1) {
        pushText(i);
        i += 2;
        const mathContent = text.substring(i);
        segments.push({ type: 'inline', content: mathContent });
        i = len;
        textStart = i;
        continue;
      }
      pushText(i);
      i += 2;
      const mathStart = i;
      while (i < len && !text.startsWith('\\)', i)) i++;
      const mathContent = text.substring(mathStart, i);
      if (i < len) i += 2;
      segments.push({ type: 'inline', content: mathContent });
      textStart = i;
      continue;
    }

    // ---- Inline math: $...$ (single dollar, not $$) ----
    if (text[i] === '$' && !text.startsWith('$$', i)) {
      const closeDollar = text.indexOf('$', i + 1);
      if (closeDollar === -1) {
        i++;
        continue;
      }
      pushText(i);
      i += 1;
      const mathStart = i;
      let depth = 0;
      while (i < len) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { if (depth > 0) depth--; }
        else if (text[i] === '$' && depth === 0) break;
        i++;
      }
      const mathContent = text.substring(mathStart, i);
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

/** Fix common corruption patterns before KaTeX rendering */
const fixCorruptedTeX = (tex: string): string => {
  let t = tex;

  // Corrupted command names (PDF extraction artifacts)
  t = t.replace(/\\azin\b/g, '\\sin');
  t = t.replace(/\\asin\b/g, '\\sin');
  t = t.replace(/\\acos\b/g, '\\cos');
  t = t.replace(/\\atan\b/g, '\\tan');
  t = t.replace(/\\acot\b/g, '\\cot');
  t = t.replace(/\\tg\b/g, '\\tan');
  t = t.replace(/\\ctg\b/g, '\\cot');

  // Unit dots and greek letter corruptions
  t = t.replace(/\\(mu|micro|nano|pico|femto|milli|kilo|mega|giga)\s*\.\s*([A-Za-z]+)\.?(?=\s|$|\\|\$)/gi, '\\$1\\text{$2}');
  t = t.replace(/\\(mu|micro)\s*([NCFHzmVAKgJWsT]|mol|rad|cd)\b(?!\s*\{)/g, '\\mu\\text{$2}');
  t = t.replace(/\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)\s*\.(?=\s|$|\\|\$)/g, '\\$1 ');
  t = t.replace(/(\\times|\\cdot)\s*10(?!\^)/g, '$1 10^');
  t = t.replace(/=\s*\\times/g, '= \\times');

  // Superscript/subscript spaces
  t = t.replace(/\^\{\s*(-?\s*\d+)\s*\}/g, (_, n) => `^{${n.replace(/\s+/g, '')}}`);
  t = t.replace(/(\^)(-\d+)(?!\})/g, '$1{$2}');
  t = t.replace(/\^(\d{2,})/g, '^{$1}');

  // Trig functions with space before ^
  t = t.replace(/\\(sin|cos|tan|cot|sec|csc|log|ln|exp)\s+\^/g, '\\$1^');

  // Mismatched \left / \right
  const leftBracket = (t.match(/\\left\[/g) || []).length;
  const rightBracket = (t.match(/\\right\]/g) || []).length;
  if (leftBracket > rightBracket) {
    let replaced = 0;
    const needed = leftBracket - rightBracket;
    t = t.replace(/\\right[.)](?!\])/g, (m) => {
      if (replaced < needed) { replaced++; return '\\right]'; }
      return m;
    });
  }
  const leftParen = (t.match(/\\left\(/g) || []).length;
  const rightParen = (t.match(/\\right\)/g) || []).length;
  if (leftParen > rightParen) {
    let replaced = 0;
    const needed = leftParen - rightParen;
    t = t.replace(/\\right[.\]](?!\))/g, (m) => {
      if (replaced < needed) { replaced++; return '\\right)'; }
      return m;
    });
  }

  // Bare times
  t = t.replace(/(?<!\\)times(?=[A-Za-z0-9\s\\\[\(\{\_])/gi, '\\times ');
  t = t.replace(/\btimes\b(?!\\)/gi, '\\times ');

  // Fix double backslashes before TeX commands: \\times -> \times, \\frac -> \frac, \\Rightarrow -> \Rightarrow
  t = t.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Fix unclosed opening braces before minus/fraction: { - \frac -> - \frac, { - \ -> - \
  t = t.replace(/\{\s*-\s*\\frac/g, ' -\\frac');
  t = t.replace(/\{\s*-\s*/g, ' - ');
  t = t.replace(/^\{\s*/g, '');

  // Fix orphan multi-braces at start of line: {{{{\Rightarrow -> \Rightarrow, {{{a_I -> a_I
  t = t.replace(/^\{{1,6}}\s*/gm, '');
  t = t.replace(/\{{2,}\s*\\?/g, '\\');

  // Fix bare \frac v 1 -> \frac{v}{1}
  t = t.replace(/(?<!\\)frac\s+([a-zA-Z0-9])\s+([a-zA-Z0-9])/g, '\\frac{$1}{$2}');
  t = t.replace(/\\frac\s+([a-zA-Z0-9])\s+([a-zA-Z0-9])/g, '\\frac{$1}{$2}');

  // Fix missing \frac before differential pairs: {dv}{dt} -> \frac{dv}{dt}
  t = t.replace(/(?<!\\frac)\{([a-zA-Z0-9_\^\s]+)\}\s*\{([a-zA-Z0-9_\^\s]+)\}/g, (match, g1, g2) => {
    if (g1.startsWith('d') || g2.startsWith('d') || g2 === 'dt' || g2 === 'dx' || g2 === 'dy' || g2 === 'dz') {
      return `\\frac{${g1}}{${g2}}`;
    }
    return match;
  });

  // Fix OCR variable corruptions: {1v} -> {v}, {1u} -> {u}, {1a_i} -> {a_i}
  t = t.replace(/\{1\s*([a-zA-Z][a-zA-Z0-9_]*)\}/g, '{$1}');
  t = t.replace(/\{1\s*([a-zA-Z][a-zA-Z0-9_]*)/g, '{$1');
  t = t.replace(/\\frac\s*\{\s*1\s*\}\s*\{\s*1([a-zA-Z])\s*\}/g, '\\frac{1}{$1}');
  t = t.replace(/\\frac\s*\{\s*2\s*\}\s*\{\s*1([a-zA-Z])\s*\}/g, '\\frac{2}{$1}');

  // Fix closing brace corruptions: ^2}{v_I} -> ^2 v_I
  t = t.replace(/\}\}\s*([a-zA-Z0-9_\^]+)/g, '} $1');
  t = t.replace(/\}\s*\{\s*([a-zA-Z0-9_]+)\s*\}/g, '} $1');

  // Double Frac / OCR artifacts
  t = t.replace(/(?<!\\)fracfrac/gi, '\\frac{\\frac');
  t = t.replace(/\\frac\s*\{\s*([^}]+)\s*\}\s*\{\s*--\s*\}/g, '-\\frac{$1}{1}');
  t = t.replace(/\^\s*\\frac\s*\{\s*(\d+)\s*\}\s*\{\s*1\s*\}/g, '^{$1}');
  t = t.replace(/\^\s*\\frac\s*\{\s*([a-zA-Z0-9+\-]+)\s*\}\s*\{\s*1\s*\}/g, '^{$1}');

  // Clean trailing orphan \left or \right
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
      const sanitizedResult = result
        .replace(/katex-error/g, 'katex-rendered')
        .replace(/color:\s*#cc0000/g, 'color:inherit')
        .replace(/border:[^;"]+/g, 'border:none');

      try {
        const textOnly = katex.renderToString(`\\text{${cleaned.replace(/[\$\\]/g, '').replace(/[\{\}]/g, ' ')}}`, {
          displayMode: false,
          throwOnError: false
        });
        if (!textOnly.includes('katex-error')) return textOnly;
      } catch (e) {}

      return sanitizedResult;
    }

    return result;
  } catch (e) {
    console.warn('KaTeX render error:', e, 'Content:', mathContent);
    const readableText = mathContent
      .replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '($1/$2)')
      .replace(/\\Rightarrow/g, '⇒')
      .replace(/\\rightarrow/g, '→')
      .replace(/\\cdot/g, '·')
      .replace(/\\times/g, '×')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\theta/g, 'θ')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<span class="katex-fallback" style="font-family:serif;font-style:italic;">${readableText}</span>`;
  }
};

/** Detect if a plain text segment still contains bare TeX macros */
const BARE_TEX_RE =
  /\\(left|right|matrix|cases|begin|end|frac|sqrt|vec|hat|bar|tilde|dot|ddot|widehat|widetilde|overline|underline|overbrace|underbrace|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|over|ne|le|ge|to|infty|sum|prod|int|oint|lim|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|log|ln|exp|det|cdot|times|div|pm|mp|partial|nabla|hbar|ell|forall|exists|in|notin|subset|supset|cup|cap|emptyset|angle|parallel|perp|propto|sim|approx|equiv|cong|neq|leq|geq|ll|gg|subset|supset|subseteq|supseteq|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|uparrow|downarrow|text|mathrm|mathbf|mathit|mathcal|mathbb|operatorname|underset|overset|stackrel|limits|nolimits|displaystyle|textstyle|scriptstyle|scriptscriptstyle|raisebox|rule|hspace|vspace|mbox|quad|qquad|,|;|!|:|\\\\)/i;

/** Extract a full bare TeX expression token starting at position i in text */
const parseBareTeXTokenAt = (text: string, startIdx: number): { token: string; endIdx: number } | null => {
  let i = startIdx;
  const len = text.length;
  if (text[i] !== '\\') return null;

  let cmd = '\\';
  i++;
  while (i < len && /[a-zA-Z]/.test(text[i])) {
    cmd += text[i];
    i++;
  }

  // Handle \left ... \right
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

  // Handle \begin{env} ... \end{env}
  if (cmd === '\\begin') {
    const endEnv = text.indexOf('\\end{', i);
    if (endEnv !== -1) {
      const closeBrace = text.indexOf('}', endEnv + 5);
      if (closeBrace !== -1) {
        return { token: text.substring(startIdx, closeBrace + 1), endIdx: closeBrace + 1 };
      }
    }
  }

  // Consume arguments { ... } or [ ... ] or subscripts/superscripts _... ^...
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
const processSingleTextLine = (text: string, inlineOnly: boolean): string => {
  if (!BARE_TEX_RE.test(text)) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const trimmed = text.trim();
  const hasCases = trimmed.includes('\\begin{') || trimmed.includes('\\left\\{') || trimmed.includes('\\[');
  const hasNewlines = trimmed.includes('\\\\');
  const startsWithMacro = /^[\{\s\-+]*\\(frac|sqrt|matrix|cases|begin|int|sum|prod|lim|vec|hat|overline|Rightarrow|Leftarrow)\b/i.test(trimmed);
  const startsWithWord = /^[A-Za-z]{3,}\s/.test(trimmed.replace(/^\{\{+/, ''));
  const containsEqOrTeX = /[=\+\-]\s*\\frac|\\frac.*\\frac|\\Rightarrow|\\int|\\sum|\^\\frac|\{.*\\frac|\\frac.*=|=.*\\frac|\{+\\Rightarrow/i.test(trimmed);
  const hasMultipleMacros = (trimmed.match(/\\(frac|sqrt|Rightarrow|alpha|beta|gamma|theta|int|sum|vec|_|\^)/g) || []).length >= 1;

  const isLikelyFullFormula = (hasCases || hasNewlines || (hasMultipleMacros && containsEqOrTeX) || (startsWithMacro && !startsWithWord)) && trimmed.length > 3;

  if (isLikelyFullFormula) {
    const displayMode = !inlineOnly && (hasCases || hasNewlines || trimmed.length > 30);
    return renderKaTeX(trimmed, displayMode);
  }

  // Scan text for bare TeX tokens using balanced-brace parser
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    if (text[i] === '\\') {
      const parsed = parseBareTeXTokenAt(text, i);
      if (parsed && parsed.token.length > 1) {
        result += renderKaTeX(parsed.token, false);
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

/** Process plain-text segment line-by-line */
const processTextSegment = (text: string, inlineOnly: boolean): string => {
  if (text.includes('\n')) {
    return text.split(/\r?\n/).map(line => processSingleTextLine(line, inlineOnly)).join('\n');
  }
  return processSingleTextLine(text, inlineOnly);
};

/** Format newlines & lists in plain text portions */
const formatTextContent = (html: string): string => {
  const lines = html.split(/\n|\r\n?/);
  if (lines.length <= 1) return html;

  const numberedRe = /^\s*\d+[\.\)]\s/;
  const bulletRe = /^\s*[-•*]\s/;
  const hasNumbered = lines.some(l => numberedRe.test(l));
  const hasBullet = lines.some(l => bulletRe.test(l));

  if (hasNumbered || hasBullet) {
    let out = '';
    let inList = false;
    const listTag = hasNumbered ? 'ol' : 'ul';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) { out += `</${listTag}>`; inList = false; }
        continue;
      }
      if (numberedRe.test(trimmed) || bulletRe.test(trimmed)) {
        if (!inList) { out += `<${listTag} style="margin:0.5em 0 0.5em 1.5em; padding:0;">`; inList = true; }
        const content = trimmed.replace(/^\s*(?:\d+[\.\)]|[-•*])\s*/, '');
        out += `<li style="margin:2px 0;">${content}</li>`;
      } else {
        if (inList) { out += `</${listTag}>`; inList = false; }
        out += line + '<br>';
      }
    }
    if (inList) out += `</${listTag}>`;
    return out;
  }

  return lines.join('<br>');
};

export const renderMathInText = (rawText: string, inlineOnly = false): string => {
  if (!rawText) return '';

  const text = cleanQuestionText(String(rawText));
  if (!text) return '';

  const segments = splitIntoSegments(text);
  const parts: string[] = [];

  for (const seg of segments) {
    if (seg.type === 'display') {
      const html = renderKaTeX(seg.content, !inlineOnly);
      parts.push(html);
    } else if (seg.type === 'inline') {
      const html = renderKaTeX(seg.content, false);
      parts.push(html);
    } else {
      const rendered = processTextSegment(seg.content, inlineOnly);
      parts.push(rendered);
    }
  }

  const joined = parts.join('');
  return formatTextContent(joined);
};

const MathText: FC<MathTextProps> = ({
  children,
  text,
  className = '',
  inlineOnly = false,
}: MathTextProps) => {
  const contentToRender =
    children !== undefined ? children : text !== undefined ? text : '';
  const htmlContent = renderMathInText(contentToRender, inlineOnly);

  return (
    <span
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathText;
