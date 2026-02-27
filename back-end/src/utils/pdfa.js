const fs = require('node:fs/promises');
const { httpError } = require('./httpError');

// Heuristic only: checks XMP pdfaid identification (NOT a full PDF/A validation)
const looksLikePdfAByXmp = pdfBuffer => {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 5) return false;
  if (pdfBuffer.subarray(0, 5).toString('latin1') !== '%PDF-') return false;

  const content = pdfBuffer.toString('latin1');
  const hasPdfAIdentification = /pdfaid:part\s*>\s*[123]\s*</i.test(content);
  const hasConformance = /pdfaid:conformance\s*>\s*[ABU]\s*</i.test(content);

  return hasPdfAIdentification && hasConformance;
};

const readAndCheckPdfAHeuristic = async file => {
  if (!file?.path) throw httpError(400, 'Missing uploaded file');
  const buf = await fs.readFile(file.path);
  if (!looksLikePdfAByXmp(buf)) {
    throw httpError(400, 'Thesis file must include PDF/A identification metadata');
  }
  return buf;
};

const writeValidatedPdf = async ({ file, destinationPath, safeUnlink }) => {
  try {
    const buf = await readAndCheckPdfAHeuristic(file);
    await fs.writeFile(destinationPath, buf);
  } finally {
    if (typeof safeUnlink === 'function') await safeUnlink(file?.path);
  }
};

module.exports = {
  looksLikePdfAByXmp,
  readAndCheckPdfAHeuristic,
  writeValidatedPdf,
};
