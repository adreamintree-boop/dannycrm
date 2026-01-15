import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content for safe email display
 * Only allows safe tags and attributes to prevent XSS
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'a', 'ul', 'ol', 'li', 'blockquote', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'hr'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
      'style', 'class', 'colspan', 'rowspan'
    ],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Converts plain text to displayable HTML (fallback when body_html is missing)
 * Handles line breaks and basic paragraph formatting
 */
export function plainTextToDisplayHtml(text: string): string {
  if (!text) return '';
  
  // Escape HTML entities first
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  
  // Split by double newlines for paragraphs
  const paragraphs = escaped.split(/\n{2,}/);
  
  // Convert single newlines to <br> within paragraphs
  const htmlParagraphs = paragraphs
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`);
  
  return htmlParagraphs.join('');
}

/**
 * Strips HTML tags and returns plain text
 * Useful for generating body_text from body_html
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Get text content
  const text = temp.textContent || temp.innerText || '';
  
  // Clean up excessive whitespace
  return text.replace(/\s+/g, ' ').trim();
}
