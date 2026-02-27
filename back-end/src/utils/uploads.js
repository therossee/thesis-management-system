const fs = require('node:fs/promises');
const path = require('node:path');

const ensureDirExists = async dirPath => {
  await fs.mkdir(dirPath, { recursive: true });
};

// Normalizes path separators to forward slashes for consistent storage/comparison.
const normalizePathSeparators = filePath => String(filePath || '').replace(/\\/g, '/');

const resolveValidDraftFilePath = async (filePath, studentId, baseDir) => {
  if (!filePath) return null;
  if (!baseDir) return null;
  const normalized = normalizePathSeparators(filePath);
  const expectedPrefix = `uploads/thesis_conclusion_draft/${studentId}/`;
  if (!normalized.startsWith(expectedPrefix)) return null;

  const absolutePath = path.join(baseDir, normalized);
  try {
    await fs.access(absolutePath);
    return normalized;
  } catch {
    return null;
  }
};

const moveFile = async (fromPath, toPath) => {
  try {
    await fs.rename(fromPath, toPath);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.copyFile(fromPath, toPath);
    await fs.unlink(fromPath);
  }
};

const safeUnlink = async p => {
  if (!p) return;
  await fs.unlink(p).catch(() => {});
};

const cleanupUploads = async (...files) => {
  await Promise.all(files.map(f => safeUnlink(f?.path)));
};

module.exports = {
  ensureDirExists,
  normalizePathSeparators,
  resolveValidDraftFilePath,
  moveFile,
  safeUnlink,
  cleanupUploads,
};
