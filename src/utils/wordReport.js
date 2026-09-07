const HTMLtoDOCX = require('@turbodocx/html-to-docx');
const juice = require('juice');

// Generate native WordprocessingML, including a real repeating footer. MHTML
// disguised as .doc is displayed as encoded source by some tablet viewers.
const createWordDocument = async (html) => {
  const cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<div class="page-border"><\/div>/g, '');
  // Use explicit breaks between structures; 'page-break-after: auto' is
  // interpreted as a break by HTML-to-DOCX converters as well.
  const inlined = juice(cleanHtml, { removeStyleTags: true })
    .replace(/<\/section>\s*<section/g, '</section><div class="page-break"></div><section')
    .replace(/<section([^>]*)>/g, (_, attributes) =>
      `<div${attributes.replace(/page-break-after\s*:[^;"]+;?/g, '')}>`)
    .replace(/<\/section>/g, '</div>')
    // The converter preserves HTML entities in href values and then XML-escapes
    // them again. Restore query separators so Word receives '&name=', not '&amp;name='.
    .replace(/\bhref="([^"]*)"/g, (_, href) => `href="${href.replace(/&amp;/g, '&')}"`);
  const result = await HTMLtoDOCX(inlined, null, {
    title: 'SAMS Structure Report',
    creator: 'SAMS',
    font: 'Times New Roman',
    fontSize: 22,
    pageSize: { width: 11906, height: 16838 },
    margins: { top: 1474, bottom: 1474, left: 794, right: 794, footer: 680 },
    footer: true,
    pageNumber: true,
    skipFirstHeaderFooter: false,
    table: { row: { cantSplit: true } }
  }, '<p style="text-align:center;font-size:9pt">Page </p>');
  return Buffer.isBuffer(result) ? result : Buffer.from(await result.arrayBuffer());
};

module.exports = { createWordDocument };
