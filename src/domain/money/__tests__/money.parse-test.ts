import { applyKeypadKey, inputToMinor, minorToInput, type KeypadKey } from '../money.parse';

const type = (keys: KeypadKey[], exponent = 2) =>
  keys.reduce((input, key) => applyKeypadKey(input, key, exponent), '');

describe('applyKeypadKey', () => {
  it('builds an amount with decimals', () => {
    expect(type(['1', '2', 'decimal', '5'])).toBe('12.5');
  });

  it('limits fraction digits to the currency exponent', () => {
    expect(type(['1', 'decimal', '2', '3', '4'])).toBe('1.23');
    expect(type(['1', 'decimal', '2', '3', '4'], 3)).toBe('1.234');
  });

  it('ignores the decimal key for zero-exponent currencies and repeated decimals', () => {
    expect(type(['5', 'decimal', '0'], 0)).toBe('50');
    expect(type(['5', 'decimal', 'decimal', '1'])).toBe('5.1');
  });

  it('starts a leading decimal with 0 and drops leading zeros', () => {
    expect(type(['decimal', '5'])).toBe('0.5');
    expect(type(['0', '0', '7'])).toBe('7');
  });

  it('backspaces and caps integer length', () => {
    expect(type(['1', '2', 'backspace'])).toBe('1');
    expect(type(Array<KeypadKey>(12).fill('9'))).toBe('99999999');
  });
});

describe('inputToMinor / minorToInput', () => {
  it('converts both ways', () => {
    expect(inputToMinor('12.5', 2)).toBe(1250);
    expect(inputToMinor('12.', 2)).toBe(1200);
    expect(inputToMinor('', 2)).toBe(0);
    expect(inputToMinor('1.234', 3)).toBe(1234);
    expect(inputToMinor('500', 0)).toBe(500);
    expect(minorToInput(1250, 2)).toBe('12.5');
    expect(minorToInput(1205, 2)).toBe('12.05');
    expect(minorToInput(1200, 2)).toBe('12');
    expect(minorToInput(0, 2)).toBe('');
    expect(minorToInput(500, 0)).toBe('500');
  });
});
