/**
 * MathText.tsx (Compatibility Bridge)
 * ---------------------------------------------------------------------------
 * Re-exports the unified MathRenderer component and helpers to preserve
 * backward-compatibility and prevent build breaks.
 * ---------------------------------------------------------------------------
 */

import MathRenderer, { renderMathInText as mrRender } from './MathRenderer';

export const renderMathInText = mrRender;
export default MathRenderer;
