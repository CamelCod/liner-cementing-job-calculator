/**
 * HTML Sanitization Utility
 * 
 * Provides secure HTML sanitization to prevent XSS attacks.
 * Uses a simple whitelist approach suitable for AI-generated content.
 */

import React from 'react';

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: { [tag: string]: string[] };
  stripUnknownTags?: boolean;
}

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'sup', 'sub', 'code', 'pre'
];

/**
 * Sanitizes HTML content by removing potentially dangerous elements and attributes
 */
export function sanitizeHtml(
  html: string, 
  options: SanitizeOptions = {}
): string {
  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    stripUnknownTags = true
  } = options;

  if (!html || typeof html !== 'string') {
    return '';
  }

  // Basic XSS pattern removal
  let sanitized = html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove on* event handlers
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+on\w+\s*=\s*[^>\s]+/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '')
    .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '')
    // Remove data: URLs (potential vector)
    .replace(/href\s*=\s*["']data:[^"']*["']/gi, '')
    .replace(/src\s*=\s*["']data:[^"']*["']/gi, '')
    // Remove style attributes with expressions
    .replace(/style\s*=\s*["'][^"']*expression\([^"']*\)["']/gi, '')
    // Remove meta refresh redirects
    .replace(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '')
    // Remove embed, object, iframe tags
    .replace(/<(embed|object|iframe|frame|frameset)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(embed|object|iframe|frame|frameset|link|base)[^>]*>/gi, '');

  // Simple tag filtering (basic implementation)
  if (stripUnknownTags) {
    // Remove tags not in allowed list
    sanitized = sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
      const tag = tagName.toLowerCase();
      if (allowedTags.includes(tag)) {
        return match;
      }
      return '';
    });
  }

  return sanitized.trim();
}

/**
 * Sanitizes markdown-formatted text for safe HTML display
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Basic markdown to HTML conversion with sanitization
  let html = markdown
    // Bold formatting
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic formatting  
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')
    // Wrap in paragraphs
    .replace(/^(.+)$/gm, '<p>$1</p>')
    // Clean up multiple paragraph tags
    .replace(/<\/p><p><h/g, '</p><h')
    .replace(/<\/h([1-6])><p>/g, '</h$1><p>');

  return sanitizeHtml(html);
}

/**
 * React component wrapper for safe HTML rendering
 */
export interface SafeHtmlProps {
  html: string;
  className?: string;
  sanitizeOptions?: SanitizeOptions;
  isMarkdown?: boolean;
}

/**
 * Safe HTML renderer that sanitizes content before rendering
 */
export function SafeHtml({ 
  html, 
  className, 
  sanitizeOptions,
  isMarkdown = false 
}: Readonly<SafeHtmlProps>): React.JSX.Element {
  const sanitizedHtml = isMarkdown 
    ? sanitizeMarkdown(html)
    : sanitizeHtml(html, sanitizeOptions);

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

export default SafeHtml;