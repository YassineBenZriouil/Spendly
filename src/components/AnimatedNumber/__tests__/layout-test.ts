import { getMoneyPattern } from '@/domain/money/money.pattern';

import { charFromRight, digitValue, foldPosition, numberPart, rollTarget, widthOfRightmost } from '../layout';

const usd = getMoneyPattern('USD', 'en-US');
const metrics = { digit: 10, separator: 4 };

describe('AnimatedNumber layout', () => {
  it('splits off the currency and reads characters from the right', () => {
    expect(numberPart('$1,234.50', usd)).toBe('1,234.50');
    expect(charFromRight('1,234.50', 0)).toBe('0');
    expect(charFromRight('1,234.50', 2)).toBe('.');
    expect(charFromRight('1,234.50', 8)).toBe('');
  });

  it('reads localized digits', () => {
    const arabic = getMoneyPattern('EGP', 'ar-EG');
    expect(digitValue(arabic.digits[7], arabic)).toBe(7);
    expect(digitValue(',', usd)).toBe(-1);
    expect(digitValue('', usd)).toBe(-1);
  });

  it('lays slots out from the right with fixed digit and separator widths', () => {
    // "1,234.50": 0, 5 (digits), "." (separator), 4, 3, 2 (digits)
    expect(widthOfRightmost('1,234.50', 0, usd, metrics)).toBe(0);
    expect(widthOfRightmost('1,234.50', 3, usd, metrics)).toBe(24);
    expect(widthOfRightmost('1,234.50', 8, usd, metrics)).toBe(6 * 10 + 2 * 4);
    // A longer number never moves the existing right-hand slots
    expect(widthOfRightmost('12,234.50', 5, usd, metrics)).toBe(widthOfRightmost('2,234.50', 5, usd, metrics));
  });

  it('rolls single-step carries in the direction of the change', () => {
    expect(rollTarget(9, 0, true)).toBe(10);
    expect(rollTarget(0, 9, false)).toBe(-1);
    expect(rollTarget(3, 4, true)).toBe(4);
    expect(rollTarget(9, 0, false)).toBe(0);
    expect(rollTarget(2, 7, true)).toBe(7);
  });

  it('folds positions back to the same glyph in the middle of the column', () => {
    expect(foldPosition(10)).toBe(0);
    expect(foldPosition(-1)).toBe(9);
    expect(foldPosition(9.6)).toBeCloseTo(-0.4);
    expect(foldPosition(4)).toBe(4);
  });
});
