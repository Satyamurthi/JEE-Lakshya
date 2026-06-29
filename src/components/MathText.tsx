import { FC } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cleanQuestionText } from '../utils/sanitizer';

interface MathTextProps {
  children?: string;
  text?: string;
  className?: string;
}

const MathText: FC<MathTextProps> = ({ children, text, className = '' }) => {
  const contentToRender = children !== undefined ? children : (text !== undefined ? text : '');

  const renderMathInText = (rawText: string): string => {
    if (!rawText) return '';
    
    // Clean and sanitize text first
    let text = cleanQuestionText(String(rawText));

    // 0. Standardize LaTeX delimiters
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$$$');
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$1$');

    // 1. Wrap bare LaTeX expressions that are outside $ or $$ in $...$
    const segments = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
    const processedSegments = segments.map((part, idx) => {
      // odd indices in split are math blocks inside $ or $$
      if (idx % 2 === 1) return part;
      
      // even indices are plain text; wrap bare LaTeX constructs
      let p = part;
      // Wrap bare fractions, square roots, vectors, hats, matrices, limits, integrals
      p = p.replace(/(\\frac\{[^}]+\}\{[^}]+\}|\\sqrt\{[^}]+\}|\\vec\{[^}]+\}|\\hat\{[^}]+\}|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})/g, '$$1$');
      // Wrap bare Greek letters or math symbols followed by subscripts/superscripts
      p = p.replace(/(\\alpha|\\beta|\\gamma|\\delta|\\theta|\\lambda|\\mu|\\pi|\\sigma|\\omega|\\Delta|\\Omega)(\_\{[^}]+\}|\^\{[^}]+\}|\_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?/g, '$$1$');
      return p;
    });

    const fullText = processedSegments.join('');

    // 2. Process double dollars: $$ ... $$
    let processed = fullText.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      try {
        const cleanedMath = math.trim();
        return katex.renderToString(cleanedMath, { displayMode: true, throwOnError: false });
      } catch (e) {
        console.error("KaTeX display error:", e);
        return match;
      }
    });
    
    // 3. Process single dollars: $ ... $
    processed = processed.replace(/\$([^\$]+?)\$/g, (match, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch (e) {
        console.error("KaTeX inline error:", e);
        return match;
      }
    });
    
    return processed;
  };

  const htmlContent = renderMathInText(contentToRender);

  return (
    <span 
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathText;
