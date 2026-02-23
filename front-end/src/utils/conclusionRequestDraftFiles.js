export const toDraftFileInfo = (filePath, fileType) => {
  if (!filePath) return null;
  const fileName = String(filePath).split('/').pop();
  if (!fileName) return null;
  return {
    fileType,
    fileName,
    canPreview: fileType !== 'additional',
  };
};

export const emptyDraftFiles = {
  thesis: null,
  summary: null,
  additional: null,
};

export const emptyDraftFilesToRemove = {
  thesis: false,
  summary: false,
  additional: false,
};
