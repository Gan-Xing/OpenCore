import {
  combineValidationResults,
  createValidationIssue,
  createValidationResult,
  findDuplicateValues,
  isNonEmptyString,
  isRecord,
} from './index';

describe('@opencore/shared validation helpers', () => {
  it('combines validation issues without hiding failures', () => {
    const result = combineValidationResults([
      createValidationResult(),
      createValidationResult([
        createValidationIssue('field', 'Field is required.'),
      ]),
    ]);

    expect(result).toEqual({
      valid: false,
      issues: [{ path: 'field', message: 'Field is required.' }],
    });
  });

  it('provides small runtime type guards', () => {
    expect(isRecord({ ok: true })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isNonEmptyString('core:user:read')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('finds duplicate values deterministically', () => {
    expect(findDuplicateValues(['b', 'a', 'b', 'c', 'a'])).toEqual(['a', 'b']);
  });
});
