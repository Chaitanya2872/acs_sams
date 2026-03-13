const {
  generatePaginationMeta,
  sanitizeString,
  validatePasswordStrength,
  generateHash
} = require('../src/utils/helpers');

describe('helpers', () => {
  test('generatePaginationMeta returns the expected pagination shape', () => {
    expect(generatePaginationMeta(3, 10, 95)).toEqual({
      currentPage: 3,
      totalPages: 10,
      totalItems: 95,
      itemsPerPage: 10,
      hasNextPage: true,
      hasPrevPage: true,
      nextPage: 4,
      prevPage: 2
    });
  });

  test('sanitizeString trims input and strips angle brackets', () => {
    expect(sanitizeString('  <beam report>  ')).toBe('beam report');
    expect(sanitizeString(null)).toBe('');
  });

  test('validatePasswordStrength reports strong passwords as valid', () => {
    expect(validatePasswordStrength('SafePass9!')).toEqual({
      isValid: true,
      errors: [],
      strength: 'Strong'
    });
  });

  test('generateHash returns deterministic hashes for the same input', () => {
    expect(generateHash('acs-sams')).toBe(generateHash('acs-sams'));
    expect(generateHash('acs-sams')).toHaveLength(32);
  });
});
