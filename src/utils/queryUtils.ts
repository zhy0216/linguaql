import { StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';

/**
 * SQL Statement highlighting extension for CodeMirror
 * Highlights the current SQL statement based on cursor position
 */
export const sqlStatementHighlight = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(_, tr) {
    if (!tr.selection || !tr.state.doc.length) {
      return Decoration.none;
    }

    let cursorPos = tr.selection.main.head;
    const doc = tr.state.doc;
    const text = doc.toString();

    // Special handling: if cursor is after semicolon and rest of line is empty
    if (cursorPos > 0 && text[cursorPos - 1] === ';') {
      const currentLine = doc.lineAt(cursorPos);
      const cursorPosInLine = cursorPos - currentLine.from;

      if (currentLine.text.slice(cursorPosInLine).trim() === '') {
        // Move cursor position back to highlight the previous statement
        cursorPos = cursorPos - 1;
      }
    }

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

    // Skip whitespace at the beginning
    while (statementStart < statementEnd && /\s/.test(text[statementStart])) {
      statementStart++;
    }

    // Skip whitespace at the end
    while (statementEnd > statementStart && /\s/.test(text[statementEnd - 1])) {
      statementEnd--;
    }

    // Only highlight if there's actual content
    if (statementStart < statementEnd && text.slice(statementStart, statementEnd).trim()) {
      const decorations = [];

      // Get all lines that are part of this statement
      const startLine = doc.lineAt(statementStart);
      const endLine = doc.lineAt(statementEnd);

      // Add line decorations for each line in the statement
      for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
        const line = doc.line(lineNum);
        const decoration = Decoration.line({
          class: 'cm-sql-statement-highlight',
        }).range(line.from);
        decorations.push(decoration);
      }

      return Decoration.set(decorations);
    }

    return Decoration.none;
  },
  provide: f => EditorView.decorations.from(f),
});

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
