/**
 * MathText — Complete Rewrite (Session 59)
 *
 * Rendering pipeline:
 *   1. decodeHTMLEntities  — HTML entities → Unicode
 *   2. stashHTML           — preserve <img>, <table>, <b> etc.
 *   3. cleanQuestionText   — full preprocessing (Unicode→TeX, OCR→TeX, syntax)
 *   4. wrapMathLines       — detect math lines, wrap in $$\begin{aligned}...$$
 *   5. splitIntoSegments   — split on $$, $, \[, \(, \begin{...}
 *   6. renderSegments      — KaTeX for math, HTML-safe for text
 *   7. renderMarkdown      — tables, bold, headers, lists
 *   8. restoreHTML         — re-insert stashed HTML blocks
 */
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

// =============================================================================
// Segment Splitter — splits text on $$, $, \[, \(, \begin{env}
// =============================================================================
export const splitIntoSegments = (text: string): Segment[] => {
  const input = stripOrphanLeadingChars(text);
  const segments: Segment[] = [];
  let i = 0;
  const len = input.length;
  let textStart = 0;

  const pushText = (end: number) => {
    const t = input.substring(textStart, end);
    if (t) segments.push({ type: 'text', content: t });
  };

  while (i < len) {
    // \begin{env} ... \end{env}
    if (input.startsWith('\\begin{', i)) {
      const closeStart = input.indexOf('\\end{', i + 7);
      if (closeStart !== -1) {
        const closeBrace = input.indexOf('}', closeStart + 5);
        if (closeBrace !== -1) {
          pushText(i);
          segments.push({ type: 'display', content: input.substring(i, closeBrace + 1) });
          i = closeBrace + 1;
          textStart = i;
          continue;
        }
      }
    }

    // $$ ... $$
    if (input.startsWith('$$', i)) {
      const close = input.indexOf('$$', i + 2);
      if (close === -1) { i++; continue; }
      pushText(i);
      const mathContent = input.substring(i + 2, close);
      i = close + 2;
      segments.push({ type: 'display', content: mathContent });
      textStart = i;
      continue;
    }

    // \[ ... \]
    if (input.startsWith('\\[', i)) {
      const closePos = input.indexOf('\\]', i + 2);
      pushText(i);
      if (closePos === -1) {
        segments.push({ type: 'display', content: input.substring(i + 2) });
        i = len; textStart = i;
      } else {
        segments.push({ type: 'display', content: input.substring(i + 2, closePos) });
        i = closePos + 2; textStart = i;
      }
      continue;
    }

    // \( ... \)
    if (input.startsWith('\\(', i)) {
      const closePos = input.indexOf('\\)', i + 2);
      pushText(i);
      if (closePos === -1) {
        segments.push({ type: 'inline', content: input.substring(i + 2) });
        i = len; textStart = i;
      } else {
        segments.push({ type: 'inline', content: input.substring(i + 2, closePos) });
        i = closePos + 2; textStart = i;
      }
      continue;
    }

    // $ ... $ (not $$)
    if (input[i] === '$' && !input.startsWith('$$', i)) {
      let j = i + 1;
      while (j < len && !(input[j] === '$' && input[j - 1] !== '\\')) j++;
      if (j < len) {
        pushText(i);
        segments.push({ type: 'inline', content: input.substring(i + 1, j) });
        i = j + 1; textStart = i;
        continue;
      }
    }

    i++;
  }
  pushText(len);
  return segments;
};

// =============================================================================
// KaTeX renderer — comprehensive normalization before rendering
// =============================================================================
const normalizeForKaTeX = (mathContent: string): string => {
  let t = mathContent.trim();

  // Apply full OCR preprocessing again (in case content arrived raw)
  t = preprocessTeXMacros(t);

  // Fix corrupted \left/\right
  t = t.replace(/\\eft\b/g, '\\left');
  t = t.replace(/\\ight\b/g, '\\right');

  // Fix times as bare word
  t = t.replace(/(?<!\\)times(?=[A-Za-z0-9\s\\\[({_])/gi, '\\times ');
  t = t.replace(/\btimes\b(?!\\)/gi, '\\times ');

  // Fix double-escaped backslash before commands
  t = t.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Fix {- \frac → -\frac
  t = t.replace(/\{\s*-\s*\\frac/g, ' -\\frac');
  t = t.replace(/\{\s*-\s*/g, ' - ');
  t = t.replace(/^\{\s*/g, '');

  // Collapse orphan leading braces
  t = t.replace(/^\{{2,}\s*/gm, '');
  t = t.replace(/\{{3,}\s*\\?/g, '\\');

  // fracfrac last resort
  t = t.replace(/(?<!\\)fracfrac/gi, '\\frac{\\frac');

  // Remove trailing \right / \left with nothing after
  t = t.replace(/\\right\s*$/g, '');
  t = t.replace(/\\left\s*$/g, '');

  return t;
};

const KATEX_MACROS = {
  '\\degree': '^{\\circ}',
  '\\Celsius': '^{\\circ}\\text{C}',
  '\\eps': '\\varepsilon',
  '\\d': '\\mathrm{d}',
  '\\therefore': '\\Rightarrow ',
  '\\because': '\\Leftarrow ',
};

const renderKaTeX = (mathContent: string, displayMode: boolean): string => {
  const normalized = normalizeForKaTeX(mathContent);
  try {
    const result = katex.renderToString(normalized, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      macros: KATEX_MACROS,
    });
    if (result.includes('katex-error')) {
      return `<span class="katex-fallback font-serif italic">${normalized
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
    }
    return result;
  } catch {
    return `<span class="katex-fallback font-serif italic">${normalized
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
  }
};

// =============================================================================
// Math Line Detection — determines if a text line should be wrapped in $$
// =============================================================================
const isMathLine = (line: string): boolean => {
  const t = line.trim();
  if (!t) return false;
  // Don't re-wrap already-wrapped math
  if (t.startsWith('\\begin{') || t.startsWith('\\[') || t.startsWith('$$')) return false;

  // Lines starting with math operators or leading TeX commands (with backslash)
  if (/^[=+\-\\&]\s*/.test(t)) return true;
  if (/^\\(Rightarrow|Leftarrow|rightarrow|leftarrow|frac|int|sum|prod|lim|vec|hat|bar|tilde|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|psi|omega|Delta|Omega|Sigma|Gamma|Lambda|Pi)\b/i.test(t)) return true;

  // Lines starting with bare OCR patterns (=frac..., fracfrac, frac...)
  if (/^=\s*frac/.test(t) || /^frac[a-zA-Z\s{]/.test(t) || /^fracfrac/.test(t)) return true;

  // Contains LaTeX macros (\\frac, \\Delta, etc.)
  const hasLatexCmd = /\\(frac|sqrt|int|sum|prod|lim|vec|hat|bar|tilde|partial|nabla|hbar|ell|infty|cdot|times|div|pm|mp|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|left|right|limits|Rightarrow|Leftarrow|rightarrow|leftarrow)/g;
  const macroMatches = (t.match(hasLatexCmd) || []).length;

  // Contains bare OCR macros (not yet converted — still possible in some paths)
  const hasBareOCR = /\bfracfrac\b|\bfrac[a-zA-Z\\]|\blimits\b|\bvec[a-z]\b/.test(t);

  // Has = or operator AND at least one LaTeX command or bare OCR macro
  const hasEqAndTeX =
    /[=<>].*\\[a-zA-Z]|\\[a-zA-Z].*[=<>]/.test(t) ||
    /[=]\s*\\frac|=\s*frac[a-zA-Z\\{(]/.test(t);

  // Short equations: n=7, x=10^{-3}, v=4/3
  const isShortEq = /^[a-zA-Z_]\s*[=<>]\s*[-+]?[0-9a-zA-Z\^\{\}\\.]+$/.test(
    t.replace(/\s+/g, ' ')
  );

  return (
    (macroMatches >= 1 && hasEqAndTeX) ||
    (macroMatches >= 2) ||
    (hasBareOCR && hasEqAndTeX) ||
    isShortEq
  );
};

// =============================================================================
// Auto-wrap multi-line derivation blocks in \begin{aligned}...\end{aligned}
// =============================================================================
const wrapMathLines = (text: string): string => {
  if (!text) return text;
  const lines = text.split(/\r?\n/);
  const resultLines: string[] = [];
  let mathBuffer: string[] = [];

  const flushMathBuffer = () => {
    if (mathBuffer.length === 0) return;
    if (mathBuffer.length >= 2) {
      const aligned = mathBuffer.map(line => {
        let l = line.trim();
        // Prefix each step with & for alignment
        if (!l.startsWith('&') &&
            (l.startsWith('=') || l.startsWith('\\Rightarrow') ||
             l.startsWith('+') || l.startsWith('-'))) {
          l = '& ' + l;
        }
        return l;
      });
      resultLines.push('$$\n\\begin{aligned}\n' + aligned.join(' \\\\\n') + '\n\\end{aligned}\n$$');
    } else {
      // Single math line — wrap in display block
      resultLines.push(`$$${mathBuffer[0].trim()}$$`);
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

// =============================================================================
// Bare TeX detection regex — used to decide if a text segment needs rendering
// =============================================================================
const BARE_TEX_RE =
  /\\(left|right|matrix|cases|begin|end|frac|sqrt|vec|hat|bar|tilde|dot|ddot|widehat|underbrace|overbrace|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|over|ne|le|ge|to|infty|sum|prod|int|oint|lim|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|log|ln|exp|det|cdot|times|div|pm|mp|partial|nabla|hbar|ell|forall|exists|in|notin|subset|supset|cup|cap|emptyset|angle|parallel|perp|propto|sim|approx|equiv|cong|neq|leq|geq|ll|gg|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|uparrow|downarrow|text|mathrm|mathbf|mathit|mathcal|mathbb|operatorname|underset|overset|stackrel|limits|nolimits|displaystyle|textstyle|scriptstyle|raisebox|rule|hspace|vspace|mbox|quad|qquad)/i;

// =============================================================================
// Process a single text line that may contain bare TeX macros
// =============================================================================
const processSingleTextLine = (
  line: string,
  inlineOnly: boolean,
  addKaTeXBlock: (html: string) => string
): string => {
  const trimmed = line.trim();

  // No TeX at all — safe HTML escape
  if (!BARE_TEX_RE.test(line)) {
    return line
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Heuristics: should the whole line be rendered as a formula?
  const hasCases = trimmed.includes('\\begin{') || trimmed.includes('\\left\\{') || trimmed.includes('\\[');
  const hasNewlines = trimmed.includes('\\\\');
  const startsWithMacro = /^[(\{[\s\-+]*\\(frac|sqrt|matrix|cases|begin|int|sum|prod|lim|vec|hat|overline|Rightarrow|Leftarrow)\b/i.test(trimmed);
  const startsWithWord = /^[A-Za-z]{3,}\s/.test(trimmed.replace(/^\{{2,}/, ''));
  const macroCount = (trimmed.match(/\\[a-zA-Z]+/g) || []).length;
  const containsEqAndTeX = /[=+\-]\s*\\frac|\\frac.*\\frac|\\Rightarrow|\\int|\\sum|\^\s*\\frac|=.*\\[a-zA-Z]/i.test(trimmed);
  const hasBareExponent = /\^\s*[{\-]?\s*[a-zA-Z0-9]|_\s*\{/.test(trimmed);
  const isShortEquation = /^[a-zA-Z_]\s*[=<>]\s*[-+]?[0-9a-zA-Z\^\{\}\\.]+$/.test(trimmed.replace(/\s+/g, ' '));
  const isDerivationStep = /^[=+\-]\s*.*\\[a-zA-Z]/.test(trimmed) || /^\\[a-zA-Z].*=/.test(trimmed);

  const isLikelyFullFormula = (
    hasCases || hasNewlines ||
    (macroCount >= 2 && containsEqAndTeX) ||
    (startsWithMacro && !startsWithWord) ||
    (hasBareExponent && BARE_TEX_RE.test(trimmed)) ||
    isShortEquation || isDerivationStep
  ) && trimmed.length > 2;

  if (isLikelyFullFormula) {
    const displayMode = !inlineOnly && (hasCases || hasNewlines || trimmed.length > 30);
    return addKaTeXBlock(renderKaTeX(trimmed, displayMode));
  }

  // Inline rendering — parse token by token, render each \command separately
  let result = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '\\') {
      // Try to parse a TeX token starting here
      let j = i + 1;
      // Single-char escapes
      if (j < line.length && /[%${}&_#~,;:!]/.test(line[j])) {
        result += addKaTeXBlock(renderKaTeX(line.substring(i, j + 1), false));
        i = j + 1;
        continue;
      }
      // Command name
      while (j < line.length && /[a-zA-Z]/.test(line[j])) j++;
      if (j > i + 1) {
        // Collect arguments (braces and superscripts/subscripts)
        while (j < line.length) {
          while (j < line.length && /[ \t]/.test(line[j])) j++;
          if (j < line.length && (line[j] === '{' || line[j] === '[')) {
            const open = line[j], close = open === '{' ? '}' : ']';
            let depth = 1; j++;
            while (j < line.length && depth > 0) {
              if (line[j] === open) depth++;
              else if (line[j] === close) depth--;
              j++;
            }
          } else if (j < line.length && (line[j] === '_' || line[j] === '^')) {
            j++;
            if (j < line.length && line[j] === '{') {
              let depth = 1; j++;
              while (j < line.length && depth > 0) {
                if (line[j] === '{') depth++;
                else if (line[j] === '}') depth--;
                j++;
              }
            } else if (j < line.length) j++;
          } else break;
        }
        result += addKaTeXBlock(renderKaTeX(line.substring(i, j), false));
        i = j;
        continue;
      }
    }
    const c = line[i];
    if (c === '&') result += '&amp;';
    else if (c === '<') result += '&lt;';
    else if (c === '>') result += '&gt;';
    else result += c;
    i++;
  }
  return result;
};

// =============================================================================
// Markdown & table renderer
// =============================================================================
const renderMarkdownAndTables = (text: string): string => {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  let inTable = false;
  let tableBuffer: string[] = [];
  const outLines: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length < 2) { outLines.push(...tableBuffer); tableBuffer = []; inTable = false; return; }
    let html = '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-slate-300 rounded-lg text-sm my-2">';
    let isHeader = true;
    for (const row of tableBuffer) {
      if (row.replace(/[\s|:-]/g, '').length === 0) continue;
      const cells = row.split('|').map(c => c.trim())
        .filter((c, i, a) => !(i === 0 && c === '') && !(i === a.length - 1 && c === ''));
      if (!cells.length) continue;
      if (isHeader) {
        html += '<thead class="bg-slate-100 font-bold"><tr>' +
          cells.map(c => `<th class="border border-slate-300 p-2.5 text-left">${c}</th>`).join('') +
          '</tr></thead><tbody>';
        isHeader = false;
      } else {
        html += '<tr>' +
          cells.map(c => `<td class="border border-slate-300 p-2.5">${c}</td>`).join('') +
          '</tr>';
      }
    }
    if (!isHeader) html += '</tbody>';
    html += '</table></div>';
    outLines.push(html);
    tableBuffer = []; inTable = false;
  };

  for (const line of lines) {
    if (line.trim().startsWith('|') && line.includes('|')) {
      inTable = true; tableBuffer.push(line.trim());
    } else {
      if (inTable) flushTable();
      outLines.push(line);
    }
  }
  if (inTable) flushTable();

  let body = outLines.join('\n');
  body = body.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  body = body.replace(/^###\s+(.*$)/gm, '<h4 class="text-base font-bold my-2">$1</h4>');
  body = body.replace(/^##\s+(.*$)/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');
  body = body.replace(/^#\s+(.*$)/gm, '<h2 class="text-xl font-black my-3">$1</h2>');

  // Lists
  const lineArray = body.split('\n');
  const finalProcessed: string[] = [];
  let inList = false, listType = 'ul';
  const numberedRe = /^\s*\d+[.)]\s/;
  const bulletRe = /^\s*[-•*]\s/;
  for (const l of lineArray) {
    const t = l.trim();
    if (numberedRe.test(t) || bulletRe.test(t)) {
      const isNum = numberedRe.test(t);
      const tag = isNum ? 'ol' : 'ul';
      if (!inList || listType !== tag) {
        if (inList) finalProcessed.push(`</${listType}>`);
        finalProcessed.push(`<${tag} style="margin:0.5em 0 0.5em 1.5em; padding:0;">`);
        inList = true; listType = tag;
      }
      finalProcessed.push(`<li style="margin:2px 0;">${t.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, '')}</li>`);
    } else {
      if (inList) { finalProcessed.push(`</${listType}>`); inList = false; }
      finalProcessed.push(l);
    }
  }
  if (inList) finalProcessed.push(`</${listType}>`);
  return finalProcessed.join('\n').replace(/\n/g, '<br>');
};

// =============================================================================
// HTML entity decoder (used before stashing HTML tags)
// =============================================================================
const decodeHTMLEntities = (str: string): string =>
  str
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

// Tags to preserve as raw HTML (not escaped)
const PRESERVE_HTML_RE =
  /<(?:img|table|thead|tbody|tr|td|th|b|i|strong|em|ul|ol|li|span|h[1-6])\b[^>]*\/?>|<\/(?:table|thead|tbody|tr|td|th|b|i|strong|em|ul|ol|li|span|h[1-6])>/gi;

// =============================================================================
// Render cache
// =============================================================================
const RENDER_CACHE = new Map<string, string>();
const MAX_CACHE_SIZE = 5000;

// =============================================================================
// Main rendering entry point
// =============================================================================
export const renderMathInText = (rawText: string, inlineOnly = false): string => {
  if (!rawText) return '';

  const cacheKey = `${inlineOnly ? 'i:' : 'f:'}${rawText}`;
  if (RENDER_CACHE.has(cacheKey)) return RENDER_CACHE.get(cacheKey)!;

  // Step 1: Decode HTML entities
  let rawDecoded = decodeHTMLEntities(String(rawText));

  // Step 2: Stash HTML blocks (tables first, then inline tags)
  const htmlBlocks: string[] = [];
  const addHtmlBlock = (html: string): string => {
    htmlBlocks.push(html);
    return `%%%HTMLBLOCK${htmlBlocks.length - 1}%%%`;
  };
  let textToProcess = rawDecoded.replace(
    /<table\b[^>]*>[\s\S]*?<\/table>/gi, m => addHtmlBlock(m)
  );
  textToProcess = textToProcess.replace(PRESERVE_HTML_RE, m => addHtmlBlock(m));

  // Step 3: Full text cleaning (HTML strip + Unicode→TeX + OCR→TeX + syntax)
  let text = cleanQuestionText(textToProcess);
  if (!text) return '';

  // Step 4: Detect and wrap multi-line math blocks
  text = wrapMathLines(text);

  // Step 5–6: Split into segments and render
  const katexBlocks: string[] = [];
  const addKaTeXBlock = (html: string): string => {
    katexBlocks.push(html);
    return `%%%KATEXBLOCK${katexBlocks.length - 1}%%%`;
  };

  const segments = splitIntoSegments(text);
  const parts: string[] = [];

  for (const seg of segments) {
    if (seg.type === 'display') {
      parts.push(addKaTeXBlock(renderKaTeX(seg.content, !inlineOnly)));
    } else if (seg.type === 'inline') {
      parts.push(addKaTeXBlock(renderKaTeX(seg.content, false)));
    } else {
      // Text segment — process line by line for inline TeX
      const rendered = seg.content.split(/\r?\n/)
        .map(line => processSingleTextLine(line, inlineOnly, addKaTeXBlock))
        .join('\n');
      parts.push(rendered);
    }
  }

  // Step 7: Render markdown and tables
  let finalHtml = renderMarkdownAndTables(parts.join(''));

  // Step 8: Restore stashed KaTeX and HTML blocks
  finalHtml = finalHtml.replace(/%%%KATEXBLOCK(\d+)%%%/g, (_, i) => katexBlocks[+i] || '');
  finalHtml = finalHtml.replace(/%%%HTMLBLOCK(\d+)%%%/g, (_, i) => htmlBlocks[+i] || '');

  // Cache
  if (RENDER_CACHE.size > MAX_CACHE_SIZE) {
    const firstKey = RENDER_CACHE.keys().next().value;
    if (firstKey) RENDER_CACHE.delete(firstKey);
  }
  RENDER_CACHE.set(cacheKey, finalHtml);
  return finalHtml;
};

// =============================================================================
// React component
// =============================================================================
const MathText: FC<MathTextProps> = ({ children, text, className = '', inlineOnly = false }) => {
  const content = children !== undefined ? children : text !== undefined ? text : '';
  const htmlContent = React.useMemo(
    () => renderMathInText(content, inlineOnly),
    [content, inlineOnly]
  );
  return (
    <span
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathText;
