export const thesisStatusOrder = [
  'ongoing',
  'cancel_requested',
  'cancel_approved',
  'conclusion_requested',
  'conclusion_approved',
  'almalaurea',
  'compiled_questionnaire',
  'final_exam',
  'final_thesis',
  'done',
];

export const normalizeTopic = topic => String(topic || '').replace(/(?:\r?\n){2,}/g, '\n');

export const getFileNameFromPath = path => {
  if (!path) return '';
  const chunks = String(path).split('/');
  return chunks[chunks.length - 1] || '';
};

export const hasReachedConclusionRequest = thesisStatus => {
  const currentStatusIndex = thesisStatusOrder.indexOf(thesisStatus);
  const conclusionRequestedIndex = thesisStatusOrder.indexOf('conclusion_requested');
  return currentStatusIndex >= conclusionRequestedIndex;
};
