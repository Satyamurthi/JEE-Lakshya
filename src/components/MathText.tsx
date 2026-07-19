import { FC } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cleanQuestionText, preprocessTeXMacros } from '../utils/sanitizer';

interface MathTextProps {
  children?: string;
  text?: string;
  className?: string;
  inlineOnly?: boolean;
}

export const renderMathInText = (rawText: string, inlineOnly = false): string => {
  if (!rawText) return '';
  
  // Clean and sanitize text first
  let text = cleanQuestionText(String(rawText));

  if (inlineOnly) {
    // Demote display math to inline
    text = text.replace(/\$\$/g, '$');
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, '\\($1\\)');
  }

  // 0. Standardize LaTeX delimiters \[ ... \] and \( ... \)
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$$$');
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$1$');

  // 1. Check if the ENTIRE text is a bare LaTeX formula without $ delimiters (e.g. \left\{ ... \right. or \begin{cases} ... \end{cases})
  const hasDelimiters = text.includes('$') || text.includes('\\(') || text.includes('\\[');
  const containsTeXMacro = /\\(left|right|matrix|cases|begin|end|frac|sqrt|vec|hat|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|Omega|over|ne|le|ge|to|infty|sum|prod|int|lim|sin|cos|tan|log|ln|cdot|times|pm|mp|partial|nabla)/i.test(text);

  if (!hasDelimiters && containsTeXMacro) {
    // Auto-wrap bare math formulas in display math $$...$$ if multi-line or contains cases/matrices, otherwise $...$
    if (text.includes('\\begin{') || text.includes('\\left\\{') || text.includes('\\\\') || text.length > 50) {
      text = `$$${text}$$`;
    } else {
      text = `$${text}$`;
    }
  }

  // 2. Process segments split by existing $...$ or $$...$$
  const segments = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
  const processedSegments = segments.map((part, idx) => {
    // odd indices are already delimited math blocks ($...$ or $$...$$)
    if (idx % 2 === 1) return part;
    
    // even indices are non-delimited text; auto-wrap isolated bare TeX expressions
    let p = part;
    if (/\\(left|right|matrix|cases|begin|end|frac|sqrt|vec|hat|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|Omega|over|ne|le|ge|to|infty|sum|prod|int|lim|sin|cos|tan|log|ln|cdot|times|pm|mp|partial|nabla)/i.test(p)) {
      p = p.replace(/(\\left[\s\S]*?\\right\.?|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}|\\frac\{[^}]+\}\{[^}]+\}|\\sqrt\{[^}]+\}|\\vec\{[^}]+\}|\\hat\{[^}]+\})/g, '$$$$1$$$$');
      p = p.replace(/(\\alpha|\\beta|\\gamma|\\delta|\\theta|\\lambda|\\mu|\\pi|\\sigma|\\omega|\\Delta|\\Omega|\\ne|\\le|\\ge|\\to|\\infty|\\cdot|\\times|\\pm|\\mp)(\_\{[^}]+\}|\^\{[^}]+\}|\_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?/g, '$$1$');
    }
    return p;
  });

  const fullText = processedSegments.join('');

  // 3. Render $$ ... $$ (Display mode)
  let processed = fullText.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
    try {
      const cleanedMath = preprocessTeXMacros(math.trim());
      return katex.renderToString(cleanedMath, { displayMode: true, throwOnError: false });
    } catch (e) {
      console.error("KaTeX display error:", e);
      return match;
    }
  });
  
  // 4. Render $ ... $ (Inline mode)
  processed = processed.replace(/\$([^\$]+?)\$/g, (match, math) => {
    try {
      const cleanedMath = preprocessTeXMacros(math.trim());
      return katex.renderToString(cleanedMath, { displayMode: false, throwOnError: false });
    } catch (e) {
      console.error("KaTeX inline error:", e);
      return match;
    }
  });
  
  return processed;
};

const MathText: FC<MathTextProps> = ({ children, text, className = '', inlineOnly = false }) => {
  const contentToRender = children !== undefined ? children : (text !== undefined ? text : '');
  const htmlContent = renderMathInText(contentToRender, inlineOnly);

  return (
    <span 
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathText;
