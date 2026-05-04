const { chromium } = require('playwright');
const { marked } = require('marked');

const pdfTimeoutMs = 15000;

const htmlTypes = new Set(['text/html', 'application/vnd.code-html']);
const documentTypes = new Set(['document', 'text/markdown', 'text/md', 'text/plain']);

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const sanitizeHtml = (html = '') =>
  String(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /\s(?:src|href)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
      '',
    )
    .replace(
      /\s(?:src|href)\s*=\s*("https?:\/\/[^"]*"|'https?:\/\/[^']*'|https?:\/\/[^\s>]+)/gi,
      '',
    );

const documentCss = `
  :root { color-scheme: light; }
  body {
    margin: 0;
    color: #111827;
    background: #ffffff;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.55;
  }
  .lph-pdf-page {
    max-width: 820px;
    margin: 0 auto;
    padding: 48px 56px;
  }
  h1, h2, h3 { color: #0f172a; line-height: 1.18; margin: 1.4em 0 0.55em; }
  h1 { font-size: 32px; margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
  h2 { font-size: 22px; }
  h3 { font-size: 17px; }
  p { margin: 0 0 12px; }
  ul, ol { padding-left: 22px; margin: 0 0 16px; }
  li { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }
  th, td { border: 1px solid #d1d5db; padding: 9px 10px; vertical-align: top; }
  th { background: #f3f4f6; color: #111827; font-weight: 700; }
  blockquote { margin: 16px 0; padding: 10px 14px; border-left: 4px solid #94a3b8; background: #f8fafc; }
  code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.92em; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
  pre { overflow: hidden; white-space: pre-wrap; background: #111827; color: #f9fafb; padding: 14px; border-radius: 8px; }
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0; }
`;

const wrapHtmlDocument = (body, title = 'Artifact') => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${documentCss}</style>
  </head>
  <body>
    <main class="lph-pdf-page">${body}</main>
  </body>
</html>`;

const artifactToHtml = (artifact) => {
  const content = artifact?.contentText ?? '';
  if (!content.trim()) {
    throw new Error('Artifact content is required');
  }

  if (htmlTypes.has(artifact.type)) {
    return sanitizeHtml(content);
  }

  if (documentTypes.has(artifact.type)) {
    const markdownHtml =
      artifact.type === 'text/plain' ? `<pre>${escapeHtml(content)}</pre>` : marked.parse(content);
    return wrapHtmlDocument(sanitizeHtml(markdownHtml), artifact.title);
  }

  throw new Error('Unsupported artifact type for PDF export');
};

const safePdfFilename = (title = 'artifact') => {
  const safe = String(title)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return `${safe || 'artifact'}.pdf`;
};

const renderArtifactPdf = async (artifact) => {
  const html = artifactToHtml(artifact);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false });
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('data:') || url.startsWith('about:')) {
        return route.continue();
      }
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(pdfTimeoutMs);
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: pdfTimeoutMs,
    });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        right: '16mm',
        bottom: '18mm',
        left: '16mm',
      },
      timeout: pdfTimeoutMs,
    });
  } finally {
    await browser.close();
  }
};

module.exports = {
  renderArtifactPdf,
  safePdfFilename,
};
