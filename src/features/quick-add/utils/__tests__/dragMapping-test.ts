import { amountFromDrag, dragConfigFor, type DragConfig } from '../dragMapping';

const usd: DragConfig = dragConfigFor('USD');

describe('dragConfigFor', () => {
  it('is currency-aware', () => {
    expect(usd.stepMinor).toBe(100);
    expect(dragConfigFor('JPY').stepMinor).toBe(10);
    expect(dragConfigFor('KWD').stepMinor).toBe(1000);
  });
});

describe('amountFromDrag', () => {
  it('does nothing for tiny movements', () => {
    expect(amountFromDrag(1234, -3, usd)).toBe(1234);
  });

  it('increases when dragging up and decreases when dragging down', () => {
    expect(amountFromDrag(0, -usd.pixelsPerStep, usd)).toBe(100);
    expect(amountFromDrag(1000, usd.pixelsPerStep, usd)).toBe(900);
  });

  it('is fine near the start and fast on long drags', () => {
    const short = amountFromDrag(0, -30, usd);
    const long = amountFromDrag(0, -300, usd);
    expect(short).toBeLessThanOrEqual(700);
    expect(long).toBeGreaterThan(short * 10);
  });

  it('is monotonic', () => {
    let previous = 0;
    for (let y = 0; y >= -600; y -= 5) {
      const amount = amountFromDrag(0, y, usd);
      expect(amount).toBeGreaterThanOrEqual(previous);
      previous = amount;
    }
  });

  it('snaps to the step once the drag moves', () => {
    expect(amountFromDrag(1234, -usd.pixelsPerStep, usd)).toBe(1300);
  });

  it('clamps at zero and the maximum', () => {
    expect(amountFromDrag(500, 2000, usd)).toBe(0);
    expect(amountFromDrag(usd.maxAmountMinor - 100, -2000, usd)).toBe(usd.maxAmountMinor);
  });
});
