import { clientDocumentDigits, isCompleteClientDocument, normalizeClientDocumentInput } from './clientDocument';

test('preserva os 11 dígitos do CPF, inclusive ao colar valor formatado', () => {
  expect(normalizeClientDocumentInput('123.456.789-00')).toBe('12345678900');
  expect(isCompleteClientDocument('12345678900')).toBe(true);
});

test('preserva os 14 dígitos do CNPJ, inclusive ao colar valor formatado', () => {
  expect(normalizeClientDocumentInput('12.345.678/0001-90')).toBe('12345678000190');
  expect(clientDocumentDigits('12.345.678/0001-90')).toBe('12345678000190');
  expect(isCompleteClientDocument('12345678000190')).toBe(true);
});

test('rejeita documentos incompletos e mantém o limite de 14 dígitos na entrada', () => {
  expect(isCompleteClientDocument('')).toBe(false);
  expect(isCompleteClientDocument('1234567890')).toBe(false);
  expect(isCompleteClientDocument('123456789012')).toBe(false);
  expect(isCompleteClientDocument('1234567890123')).toBe(false);
  expect(isCompleteClientDocument('123456789012345')).toBe(false);
  expect(normalizeClientDocumentInput('123456789012345')).toBe('12345678901234');
});
