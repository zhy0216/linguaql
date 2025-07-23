import { layer, RectangleMarker } from '@codemirror/view';

/**
 * SQL Statement highlighting extension using layers for better line wrapping compatibility
 */
export const sqlStatementHighlight = [
  // Layer for background highlighting
  layer({
    above: false, // Draw behind text
    markers(view) {
      const markers: RectangleMarker[] = [];
      const { state } = view;
      const { selection, doc } = state;

      if (!selection || !doc.length) {
        return markers;
      }

      const cursorPos = selection.main.head;
      const text = doc.toString();
      const currentStatement = getCurrentLineStatement(text, cursorPos);

      if (!currentStatement.trim()) {
        return markers;
      }

      // Find the statement boundaries in the text
      const statementIndex = text.indexOf(currentStatement);
      if (statementIndex === -1) {
        return markers;
      }

      const startPos = statementIndex;
      const endPos = statementIndex + currentStatement.length;

      try {
        const startCoords = view.coordsAtPos(startPos);
        const endCoords = view.coordsAtPos(endPos);
        console.log(
          '#### startCoords, endCoords, startPos, endPos',
          startCoords,
          endCoords,
          startPos,
          endPos
        );
        if (startCoords && endCoords) {
          // Create a rectangle marker that spans the statement
          markers.push(
            new RectangleMarker(
              'cm-sql-statement-highlight-bg',
              0,
              startCoords.top - 22,
              view.contentDOM.offsetWidth + 40,
              endCoords.bottom - startCoords.top + 20
            )
          );
        }
      } catch (e) {
        // Ignore coordinate calculation errors
      }

      return markers;
    },
    update(update) {
      // Update when selection changes
      return update.selectionSet || update.docChanged;
    },
  }),
];

/**
 * Get the current SQL statement based on cursor position
 * Finds statement boundaries using semicolons as delimiters
 */
export const getCurrentSqlStatement = (text: string, cursorPos: number): string => {
  // Find the current SQL statement boundaries
  let statementStart = 0;
  let statementEnd = text.length;

  // Find the previous semicolon (statement start)
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === ';') {
      statementStart = i + 1;
      break;
    }
  }

  // Find the next semicolon (statement end)
  for (let i = cursorPos; i < text.length; i++) {
    if (text[i] === ';') {
      statementEnd = i;
      break;
    }
  }

  // Extract and trim the statement
  return text.slice(statementStart, statementEnd).trim();
};

/**
 * Get SQL statement from current line (search forward then backward)
 * More line-aware approach for statement detection
 */
export const getCurrentLineStatement = (text: string, cursorPos: number): string => {
  const lines = text.split('\n');
  let currentPos = 0;
  let currentLineIndex = 0;

  // Find which line the cursor is on
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    if (currentPos + lineLength > cursorPos) {
      currentLineIndex = i;
      break;
    }
    currentPos += lineLength;
  }

  const currentLine = lines[currentLineIndex];
  if (!currentLine.trim()) {
    return ''; // Empty line
  }

  // Special handling: if cursor is after semicolon and rest of line is empty
  const cursorPosInLine = cursorPos - currentPos;
  if (
    cursorPosInLine > 0 &&
    currentLine[cursorPosInLine - 1] === ';' &&
    currentLine.slice(cursorPosInLine).trim() === ''
  ) {
    // Use the previous statement instead
    return getCurrentSqlStatement(text, cursorPos - 1);
  }

  // Start from current line and search forward for semicolon
  let statementEnd = text.length;
  let searchPos = currentPos; // Start of current line in full text

  for (let i = currentLineIndex; i < lines.length; i++) {
    const line = lines[i];
    const semicolonIndex = line.indexOf(';');

    if (semicolonIndex !== -1) {
      // Found semicolon, calculate position in full text
      statementEnd = searchPos + semicolonIndex;
      break;
    }

    searchPos += line.length + 1; // +1 for newline
  }

  // Search backward from current line for statement start
  let statementStart = 0;
  searchPos = currentPos; // Start of current line

  for (let i = currentLineIndex - 1; i >= 0; i--) {
    const line = lines[i];
    searchPos -= line.length + 1; // Move to start of previous line

    const semicolonIndex = line.lastIndexOf(';');
    if (semicolonIndex !== -1) {
      // Found semicolon, statement starts after it
      statementStart = searchPos + semicolonIndex + 1;
      break;
    }
  }

  // Extract and trim the statement
  return text.slice(statementStart, statementEnd).trim();
};
