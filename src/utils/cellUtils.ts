/**
 * Utility functions for processing table cell data
 */

/**
 * Convert cell value to string representation
 * Handles objects, arrays, null, undefined, and primitive types
 * @param cell - The cell value to format
 * @param formatNice - Whether to format JSON with indentation (default: false)
 */
export function formatCellValue(cell: any, formatNice: boolean = false): string {
  if (cell === null || cell === undefined) {
    return '';
  }

  // Handle objects and arrays by JSON stringifying them
  if (typeof cell === 'object') {
    try {
      return formatNice ? JSON.stringify(cell, null, 2) : JSON.stringify(cell);
    } catch (error) {
      // Fallback for objects that can't be stringified (e.g., circular references)
      return String(cell);
    }
  }

  // Handle primitive types
  return String(cell);
}

/**
 * Truncate text if it exceeds the maximum length
 */
export function truncateText(
  text: string,
  maxLength: number = 200
): {
  truncated: string;
  isTruncated: boolean;
} {
  if (text.length <= maxLength) {
    return { truncated: text, isTruncated: false };
  }

  return {
    truncated: text.substring(0, maxLength) + '...',
    isTruncated: true,
  };
}
