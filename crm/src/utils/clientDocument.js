export const clientDocumentDigits = (value) => String(value || '').replace(/\D/g, '');

export const normalizeClientDocumentInput = (value) => clientDocumentDigits(value).slice(0, 14);

export const isCompleteClientDocument = (value) => {
  const length = clientDocumentDigits(value).length;
  return length === 11 || length === 14;
};
