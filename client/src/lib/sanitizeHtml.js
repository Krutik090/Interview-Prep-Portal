import DOMPurify from 'dompurify';

// Defense-in-depth: the server already sanitizes admin-authored rich text
// (sanitize-html, allowlisted tags) before storing it, but any content
// rendered via dangerouslySetInnerHTML gets sanitized again here in case a
// future write path forgets to, or the allowlist has a gap.
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'h3', 'h4', 'blockquote', 'code'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}
