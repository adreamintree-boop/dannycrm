/**
 * Converts plain text (with newlines) to properly formatted HTML for WYSIWYG editors.
 * 
 * Features:
 * - Escapes HTML special characters to prevent injection
 * - Converts double newlines (\n\n) to paragraph breaks (<p>)
 * - Converts single newlines (\n) to line breaks (<br>)
 * - Converts bullet lines (starting with "- " or "• ") to <ul><li> lists
 * - Converts numbered lines (starting with "1. ", "2. ", etc.) to <ol><li> lists
 */

/**
 * Escapes HTML special characters to prevent XSS and ensure proper rendering
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Checks if a line is a bullet list item
 */
function isBulletLine(line: string): boolean {
  return /^[-•]\s+/.test(line.trim());
}

/**
 * Checks if a line is a numbered list item
 */
function isNumberedLine(line: string): boolean {
  return /^\d+[.)]\s+/.test(line.trim());
}

/**
 * Extracts the content from a bullet line
 */
function extractBulletContent(line: string): string {
  return line.trim().replace(/^[-•]\s+/, '');
}

/**
 * Extracts the content from a numbered line
 */
function extractNumberedContent(line: string): string {
  return line.trim().replace(/^\d+[.)]\s+/, '');
}

/**
 * Processes a block of consecutive bullet lines into an HTML unordered list
 */
function processBulletList(lines: string[]): string {
  const items = lines
    .map(line => `<li>${escapeHtml(extractBulletContent(line))}</li>`)
    .join('');
  return `<ul>${items}</ul>`;
}

/**
 * Processes a block of consecutive numbered lines into an HTML ordered list
 */
function processNumberedList(lines: string[]): string {
  const items = lines
    .map(line => `<li>${escapeHtml(extractNumberedContent(line))}</li>`)
    .join('');
  return `<ol>${items}</ol>`;
}

/**
 * Processes a regular paragraph (non-list content)
 */
function processParagraph(text: string): string {
  // Split by single newlines and join with <br>
  const lines = text.split('\n');
  const content = lines
    .map(line => escapeHtml(line))
    .join('<br>');
  return `<p>${content}</p>`;
}

/**
 * Main converter function: converts plain text to email-ready HTML
 * 
 * @param text - The plain text content from AI or user input
 * @returns HTML string suitable for WYSIWYG editors like TipTap
 */
export function convertPlainTextToEmailHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by double newlines (or more) to get paragraphs
  const blocks = normalizedText.split(/\n{2,}/);
  
  const htmlParts: string[] = [];
  
  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;
    
    // Split block into lines
    const lines = trimmedBlock.split('\n');
    
    // Check if this block is a list
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      if (isBulletLine(line)) {
        // Collect consecutive bullet lines
        const bulletLines: string[] = [];
        while (i < lines.length && isBulletLine(lines[i])) {
          bulletLines.push(lines[i]);
          i++;
        }
        htmlParts.push(processBulletList(bulletLines));
      } else if (isNumberedLine(line)) {
        // Collect consecutive numbered lines
        const numberedLines: string[] = [];
        while (i < lines.length && isNumberedLine(lines[i])) {
          numberedLines.push(lines[i]);
          i++;
        }
        htmlParts.push(processNumberedList(numberedLines));
      } else {
        // Collect consecutive non-list lines as a paragraph
        const paragraphLines: string[] = [];
        while (i < lines.length && !isBulletLine(lines[i]) && !isNumberedLine(lines[i])) {
          paragraphLines.push(lines[i]);
          i++;
        }
        if (paragraphLines.length > 0) {
          htmlParts.push(processParagraph(paragraphLines.join('\n')));
        }
      }
    }
  }
  
  return htmlParts.join('');
}

/**
 * Converts HTML back to plain text (for storage/API purposes)
 * This is a simple implementation - may need enhancement for complex HTML
 */
export function convertHtmlToPlainText(html: string): string {
  if (!html) return '';
  
  return html
    // Replace <br> with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace closing </p>, </li>, </div> with newlines
    .replace(/<\/(p|li|div)>/gi, '\n')
    // Replace </ul> and </ol> with extra newline
    .replace(/<\/(ul|ol)>/gi, '\n')
    // Replace <li> with bullet for unordered lists context
    .replace(/<li>/gi, '- ')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
