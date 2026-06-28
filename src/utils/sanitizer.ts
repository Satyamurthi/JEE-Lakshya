/**
 * Question & Math Sanitizer Utility
 * Cleans up raw text, decodes HTML entities, strips internal tags like [JEE Hard #123],
 * and fixes KaTeX formatting errors.
 */

export const cleanQuestionText = (text: string): string => {
  if (!text) return '';

  let cleaned = text;

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

  // 4. Clean up KaTeX formatting issues (e.g. {\rho _{oil}} formatting)
  cleaned = cleaned.replace(/\{\s*\\rho\s*_\{([^}]+)\}\s*\}/g, '\\rho_{$1}');

  return cleaned.trim();
};
