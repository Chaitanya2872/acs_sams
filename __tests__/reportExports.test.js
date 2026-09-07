const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const JSZip = require('jszip');
const { validationResult } = require('express-validator');
const { quantificationValidation } = require('../src/utils/screenValidators');
const { normalizeQuantificationEntry } = require('../src/utils/quantifications');
const { User } = require('../src/models/schemas');

// Exercise the actual renderer without starting the HTTP server or database.
const filename = path.resolve(__dirname, '../src/routes/reports.js');
const localRequire = createRequire(filename);
const sandbox = {
  require: name => name === '../config/cloudinary' ? {} : localRequire(name),
  module: { exports: {} }, process, Buffer, console, __dirname: path.dirname(filename),
  setTimeout, clearTimeout, URL
};
vm.runInNewContext(fs.readFileSync(filename, 'utf8') + `
  module.exports = { prepareStructureReport, sendWordDocument, collectQuantifications, renderQuantificationHtml, groupQuantificationsBySection };
`, sandbox, { filename });
const reports = sandbox.module.exports;

const emptyEntry = { entry_id: 'q1', category: 'Beams', nos: null, length: null, breadth: null, height: null, quantity: null, repair_methodology: '' };
const structure = {
  structural_identity: { structural_identity_number: 'TEST-REPORT' },
  geometric_details: { floors: [{ floor_id: 'f1', floor_number: 1,
    quantifications: { structural: [emptyEntry], non_structural: [] }, flats: [] }] }
};

test('blank and null measurements pass API validation; negatives still fail', async () => {
  for (const value of [null, '', '  ', '\u2014', 0, '2.5']) {
    const req = { body: { structural: [{ nos: value, length: value }], non_structural: [{ breadth: value, height: value }] } };
    for (const validator of quantificationValidation) await validator.run(req);
    expect(validationResult(req).array()).toEqual([]);
  }
  const req = { body: { structural: [{ length: -1 }] } };
  for (const validator of quantificationValidation) await validator.run(req);
  expect(validationResult(req).isEmpty()).toBe(false);
});

test('missing measurements survive normalization while zero remains a number', () => {
  const empty = normalizeQuantificationEntry(emptyEntry);
  for (const key of ['nos', 'length', 'breadth', 'height', 'quantity']) expect(empty[key]).toBeNull();
  expect(normalizeQuantificationEntry({ nos: 0 }).quantity).toBe(0);
  expect(normalizeQuantificationEntry({ length: 2, breadth: 3 }).quantity).toBe(6);
});

test('floor and flat schemas preserve missing measurements and accept explicit nulls', () => {
  const floorSchema = User.schema.path('structures').schema.path('geometric_details.floors').schema;
  for (const scope of [floorSchema, floorSchema.path('flats').schema]) {
    for (const section of ['structural', 'non_structural']) {
      const Entry = scope.path(`quantifications.${section}`).casterConstructor;
      for (const input of [{ entry_id: 'missing' }, emptyEntry]) {
        const entry = new Entry(input);
        expect(entry.validateSync()).toBeUndefined();
        for (const key of ['nos', 'length', 'breadth', 'height', 'quantity']) expect(entry[key]).toBeNull();
      }
    }
  }
});

test('report preserves rows with no repair method and prints missing values as em dashes', () => {
  const rows = reports.collectQuantifications(structure);
  expect(rows).toHaveLength(1);
  expect(rows[0].nos).toBeNull();
  expect(rows[0].quantity).toBeNull();
  const html = reports.renderQuantificationHtml(reports.groupQuantificationsBySection(rows));
  expect(html).toContain('\u2014');
  expect(html).not.toContain('>null<');
  expect(html).not.toContain('>undefined<');
});

test('Word response is a native DOCX with body tables, images, links and a page footer', async () => {
  const prepared = await reports.prepareStructureReport({ structure, user: {} }, '');
  prepared.inspectionImages.push({ location: 'Test location', observation: 'Photo caption',
    asset: { fileName: 'pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') } });
  prepared.fileAttachments.push({ location: 'Floor 1', context: 'Test', name: 'Attachment.pdf', source: 'https://example.com/attachment.pdf' });
  const headers = {};
  let buffer;
  await reports.sendWordDocument({ setHeader: (name, value) => { headers[name] = value; }, send: data => { buffer = data; } }, [prepared, prepared], 'test.docx');
  expect(headers['Content-Type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  expect(headers['Content-Disposition']).toContain('.docx');
  expect(buffer.subarray(0, 2).toString()).toBe('PK');
  const zip = await JSZip.loadAsync(buffer);
  const document = await zip.file('word/document.xml').async('string');
  expect(document).toContain('QUANTIFICATION');
  expect(document).toContain('TEST-REPORT');
  expect(document.match(/TEST-REPORT/g)).toHaveLength(2);
  expect(document).toMatch(/w:type="page"/);
  expect(document).toContain('\u2014');
  expect(document).toContain('<w:tbl');
  expect(document).toContain('<w:drawing');
  expect(document).toContain('footerReference');
  expect(document).not.toContain('altChunk');
  expect(document).not.toContain('Content-Transfer-Encoding');
  expect(Object.keys(zip.files).some(name => name.startsWith('word/media/') && !zip.files[name].dir)).toBe(true);
  const footerName = Object.keys(zip.files).find(name => /^word\/footer\d+\.xml$/.test(name));
  expect(await zip.file(footerName).async('string')).toContain('PAGE');
  expect(await zip.file('word/_rels/document.xml.rels').async('string')).toContain('https://example.com/attachment.pdf');
}, 30000);
