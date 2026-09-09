import sanitizeHtml from 'sanitize-html';

// Applied to any admin-authored rich text that later renders back to
// students (grooming articles, material content) — sanitize once at write
// time so stored content is safe regardless of how many times it's rendered.
export function sanitizeRichText(html) {
  if (typeof html !== 'string') return html;
  return sanitizeHtml(html, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'h3', 'h4', 'blockquote', 'code'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
