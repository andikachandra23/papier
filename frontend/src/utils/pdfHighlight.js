/**
 * Utilities for PDF text highlighting
 * Handles position serialization, highlight rendering, and selection capture
 */

/**
 * Normalize highlight positions relative to page dimensions
 * @param {DOMRect} rect - Bounding rect of selection relative to page container
 * @param {number} pageWidth - Current rendered page width
 * @param {number} pageHeight - Current rendered page height
 * @returns {Object} Normalized position (0-1 range)
 */
export function normalizeRect(rect, containerRect, pageWidth, pageHeight) {
  return {
    x: (rect.left - containerRect.left) / pageWidth,
    y: (rect.top - containerRect.top) / pageHeight,
    width: rect.width / pageWidth,
    height: rect.height / pageHeight,
  };
}

/**
 * Convert normalized position back to pixel coordinates
 * @param {Object} pos - Normalized position {x, y, width, height}
 * @param {number} pageWidth - Current rendered page width
 * @param {number} pageHeight - Current rendered page height
 * @returns {Object} Pixel position {left, top, width, height}
 */
export function denormalizeRect(pos, pageWidth, pageHeight) {
  return {
    left: pos.x * pageWidth,
    top: pos.y * pageHeight,
    width: pos.width * pageWidth,
    height: pos.height * pageHeight,
  };
}

/**
 * Capture text selection from a PDF page and return highlight data
 * @param {HTMLElement} pageContainer - The page container element
 * @param {number} pageNumber - Current page number
 * @returns {Object|null} Highlight data or null if no selection
 */
export function captureSelection(pageContainer, pageNumber) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    return null;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();
  if (!rects.length) return null;

  const containerRect = pageContainer.getBoundingClientRect();
  // Find the PDF canvas to get actual page dimensions
  const canvas = pageContainer.querySelector('canvas');
  if (!canvas) return null;

  const pageWidth = canvas.width;
  const pageHeight = canvas.height;
  const displayWidth = canvas.offsetWidth;
  const displayHeight = canvas.offsetHeight;

  // Collect all text line rectangles (a selection can span multiple lines)
  const positions = [];
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    // Skip zero-width rects
    if (rect.width === 0 && rect.height === 0) continue;

    const normalized = normalizeRect(rect, containerRect, displayWidth, displayHeight);
    positions.push(normalized);
  }

  if (positions.length === 0) return null;

  return {
    page: pageNumber,
    positions,
    text: selectedText,
    pageWidth,
    pageHeight,
  };
}

/**
 * Serialize positions array to JSON string for database storage
 */
export function serializePositions(positions) {
  return JSON.stringify(positions);
}

/**
 * Deserialize positions from JSON string
 */
export function deserializePositions(positionString) {
  try {
    return JSON.parse(positionString);
  } catch {
    return [];
  }
}

/**
 * Highlight color presets
 */
export const HIGHLIGHT_COLORS = [
  { name: 'Kuning', value: '#FFEB3B', bg: 'rgba(255, 235, 59, 0.35)' },
  { name: 'Hijau', value: '#66BB6A', bg: 'rgba(102, 187, 106, 0.35)' },
  { name: 'Biru', value: '#42A5F5', bg: 'rgba(66, 165, 245, 0.35)' },
  { name: 'Merah', value: '#EF5350', bg: 'rgba(239, 83, 80, 0.35)' },
  { name: 'Ungu', value: '#AB47BC', bg: 'rgba(171, 71, 188, 0.35)' },
];

/**
 * Get the CSS background color for a highlight color value
 */
export function getHighlightBg(colorValue) {
  const found = HIGHLIGHT_COLORS.find(c => c.value === colorValue);
  if (found) return found.bg;
  // Fallback: create semi-transparent version
  return colorValue + '59'; // append alpha hex
}

/**
 * Normalize text for fuzzy matching: lowercase, collapse whitespace, trim
 */
function normalizeForMatch(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Find text positions in the PDF.js text layer DOM for a given search string.
 * Uses TreeWalker to traverse text nodes and calculates normalized positions.
 *
 * @param {HTMLElement} pageContainer - The .pdf-page-wrapper element containing the Page
 * @param {string} searchText - The text to search for (from AI)
 * @returns {Array|null} Array of normalized positions {x, y, width, height} or null if not found
 */
export function findTextPositionsInTextLayer(pageContainer, searchText) {
  if (!pageContainer || !searchText) return null;

  const textLayer = pageContainer.querySelector('.react-pdf__Page__textContent');
  if (!textLayer) return null;

  const canvas = pageContainer.querySelector('canvas');
  if (!canvas) return null;

  const displayWidth = canvas.offsetWidth;
  const displayHeight = canvas.offsetHeight;
  const containerRect = pageContainer.getBoundingClientRect();

  // Collect all text spans and their content
  const spans = textLayer.querySelectorAll('span[role="presentation"]');
  if (!spans.length) return null;

  // Build a map of text content to span elements
  // PDF.js splits text into individual spans, so we need to reconstruct
  const normalizedSearch = normalizeForMatch(searchText);

  // Strategy: collect all text from spans, find the substring match,
  // then map back to the span elements to get positions
  let fullText = '';
  const spanMap = []; // { startIdx, endIdx, span }

  for (const span of spans) {
    const spanText = span.textContent || '';
    const startIdx = fullText.length;
    fullText += spanText;
    spanMap.push({ startIdx, endIdx: fullText.length, span });
    // Add space between spans (PDF.js text layer often concatenates without spaces)
    fullText += ' ';
  }

  const normalizedFullText = normalizeForMatch(fullText);

  // Find the search text in the full text (with some tolerance)
  let searchIdx = normalizedFullText.indexOf(normalizedSearch);
  if (searchIdx === -1) {
    // Try without some punctuation differences
    const looseSearch = normalizedSearch.replace(/[.,;:!?()[\]{}'"-]/g, '');
    const looseFull = normalizedFullText.replace(/[.,;:!?()[\]{}'"-]/g, '');
    searchIdx = looseFull.indexOf(looseSearch);
  }

  if (searchIdx === -1) return null;

  // Map the match range back to span elements
  const matchEnd = searchIdx + normalizedSearch.length;
  const matchedSpans = [];

  for (const entry of spanMap) {
    // Check if this span overlaps with the match range
    // Account for the space added between spans
    const adjustedStart = entry.startIdx;
    const adjustedEnd = entry.endIdx;

    if (adjustedEnd > searchIdx && adjustedStart < matchEnd) {
      matchedSpans.push(entry.span);
    }
  }

  if (matchedSpans.length === 0) return null;

  // Calculate bounding rects for matched spans using Range
  // Group consecutive spans into line-level rectangles
  const positions = [];
  let currentLineRects = [];
  let lastBottom = null;

  for (const span of matchedSpans) {
    const spanRect = span.getBoundingClientRect();
    if (spanRect.width === 0 && spanRect.height === 0) continue;

    // Check if this span is on the same line (similar top position)
    if (lastBottom !== null && Math.abs(spanRect.top - lastBottom) > spanRect.height * 0.5) {
      // New line - flush current rects
      if (currentLineRects.length > 0) {
        const merged = mergeRects(currentLineRects, containerRect, displayWidth, displayHeight);
        if (merged) positions.push(merged);
        currentLineRects = [];
      }
    }

    currentLineRects.push(spanRect);
    lastBottom = spanRect.top;
  }

  // Flush remaining rects
  if (currentLineRects.length > 0) {
    const merged = mergeRects(currentLineRects, containerRect, displayWidth, displayHeight);
    if (merged) positions.push(merged);
  }

  return positions.length > 0 ? positions : null;
}

/**
 * Merge an array of DOMRects into a single normalized rect
 */
function mergeRects(rects, containerRect, displayWidth, displayHeight) {
  if (rects.length === 0) return null;

  let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
  for (const r of rects) {
    if (r.left < minLeft) minLeft = r.left;
    if (r.top < minTop) minTop = r.top;
    if (r.right > maxRight) maxRight = r.right;
    if (r.bottom > maxBottom) maxBottom = r.bottom;
  }

  return {
    x: (minLeft - containerRect.left) / displayWidth,
    y: (minTop - containerRect.top) / displayHeight,
    width: (maxRight - minLeft) / displayWidth,
    height: (maxBottom - minTop) / displayHeight,
  };
}

/**
 * Category color mapping for auto-highlights
 */
export const AUTO_HIGHLIGHT_CATEGORY_COLORS = {
  latar_belakang: '#42A5F5',  // blue
  kontribusi: '#66BB6A',       // green
  metodologi: '#FF7043',       // orange
  temuan: '#AB47BC',           // purple
  kesimpulan: '#EF5350',       // red
  background: '#42A5F5',
  contribution: '#66BB6A',
  finding: '#AB47BC',
  conclusion: '#EF5350',
  lainnya: '#FFEB3B',
  other: '#FFEB3B',
};

/**
 * Get highlight color for an auto-highlight category
 */
export function getAutoHighlightColor(category) {
  return AUTO_HIGHLIGHT_CATEGORY_COLORS[category] || '#AB47BC';
}

/**
 * Get a random highlight color from the preset palette
 * @returns {string} A random color value (e.g. '#FFEB3B')
 */
export function getRandomHighlightColor() {
  const idx = Math.floor(Math.random() * HIGHLIGHT_COLORS.length);
  return HIGHLIGHT_COLORS[idx].value;
}
