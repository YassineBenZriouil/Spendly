import {
  advanceDrag,
  dragConfigFor,
  FAST_SPEED,
  MAX_GAIN,
  PRECISE_SPEED,
  RUBBER_MAX_PT,
  rubberBand,
  speedGain,
  startDrag,
  type DragConfig,
  type DragState,
} from '../dragMapping';

const usd: DragConfig = dragConfigFor('USD');
const N = usd.pixelsPerStep;
const SLOW = 200;

/** A drag made of equal moves (negative dy = up) at a constant speed. */
function drag(fromMinor: number, moves: number[], speed = SLOW, config = usd) {
  let state: DragState = startDrag(fromMinor);
  let edgeHits = 0;
  for (const dy of moves) {
    const update = advanceDrag(state, dy, speed, config);
    state = update.state;
    if (update.hitEdge) edgeHits += 1;
  }
  return { ...state, edgeHits };
}

const repeat = (dy: number, times: number) => Array.from({ length: times }, () => dy);

describe('dragConfigFor', () => {
  it('is currency-aware', () => {
    expect(usd.stepMinor).toBe(100);
    expect(dragConfigFor('JPY').stepMinor).toBe(10);
    expect(dragConfigFor('KWD').stepMinor).toBe(1000);
  });

  it('applies the increment and sensitivity preferences', () => {
    expect(dragConfigFor('USD', { increment: 5 }).stepMinor).toBe(500);
    expect(dragConfigFor('JPY', { increment: 50 }).stepMinor).toBe(500);
    expect(dragConfigFor('USD', { sensitivity: 'precise' }).pixelsPerStep).toBeGreaterThan(
      dragConfigFor('USD', { sensitivity: 'fast' }).pixelsPerStep,
    );
  });
});

describe('advanceDrag', () => {
  it('slow drag: exactly one step per pixelsPerStep, however the travel is split into events', () => {
    expect(drag(0, [-N]).amountMinor).toBe(100);
    expect(drag(0, repeat(-1, N * 7)).amountMinor).toBe(700);
    expect(drag(0, repeat(-N / 3, 3 * 12)).amountMinor).toBe(1200);
    expect(drag(5000, repeat(1, N * 4)).amountMinor).toBe(4600);
  });

  it('is deterministic: the same movement always gives the same amount', () => {
    const moves = [-3, -7, -12, 4, -20, -1, 9];
    expect(drag(1234, moves, 900)).toEqual(drag(1234, moves, 900));
  });

  it('does not change before the first full step of travel', () => {
    expect(drag(1200, [-(N - 0.5)]).amountMinor).toBe(1200);
    expect(drag(1200, repeat(-1, N - 1)).amountMinor).toBe(1200);
  });

  it('only fast movement accelerates, and slowing down returns to single steps immediately', () => {
    expect(speedGain(0)).toBe(1);
    expect(speedGain(PRECISE_SPEED)).toBe(1);
    expect(speedGain(-PRECISE_SPEED)).toBe(1);
    expect(speedGain(FAST_SPEED)).toBe(MAX_GAIN);
    expect(speedGain(FAST_SPEED * 3)).toBe(MAX_GAIN);
    expect(speedGain(1000)).toBeGreaterThan(1);

    // A fast flick, then the same slow travel as on a fresh drag: the slow part adds exactly the same
    const fast = drag(0, [-30], FAST_SPEED);
    expect(fast.amountMinor).toBeGreaterThan(1000);
    let state = startDrag(fast.amountMinor);
    for (const dy of repeat(-1, N * 3)) state = advanceDrag(state, dy, SLOW, usd).state;
    expect(state.amountMinor - fast.amountMinor).toBe(300);
  });

  it('gain grows with speed (monotonic)', () => {
    let previous = 0;
    for (let speed = 0; speed <= FAST_SPEED + 500; speed += 50) {
      expect(speedGain(speed)).toBeGreaterThanOrEqual(previous);
      previous = speedGain(speed);
    }
  });

  it('snaps a typed, off-grid amount to the grid on the first step', () => {
    expect(drag(1237, [-N]).amountMinor).toBe(1300);
    expect(drag(1237, [N]).amountMinor).toBe(1200);
  });

  it('clamps at zero and the maximum, signalling the edge once', () => {
    const down = drag(300, repeat(N, 10));
    expect(down.amountMinor).toBe(0);
    expect(down.edgeHits).toBe(1);

    const top = usd.maxAmountMinor - 200;
    const up = drag(top, repeat(-N, 10));
    expect(up.amountMinor).toBe(usd.maxAmountMinor);
    expect(up.edgeHits).toBe(1);
  });

  it('resists past an edge, and moving back first undoes the pull', () => {
    // At 0, pull down 40 pt more: the amount stays, the pull is remembered
    const pulled = drag(0, repeat(10, 4));
    expect(pulled.amountMinor).toBe(0);
    expect(pulled.overscroll).toBe(-40);

    // Moving back up 40 pt only releases the pull; a further full step increases the amount
    let state: DragState = pulled;
    for (const dy of repeat(-10, 4)) state = advanceDrag(state, dy, SLOW, usd).state;
    expect(state).toMatchObject({ amountMinor: 0, overscroll: 0 });
    state = advanceDrag(state, -N, SLOW, usd).state;
    expect(state.amountMinor).toBe(100);
  });
});

describe('rubberBand', () => {
  it('moves with the pull, stiffens, and never exceeds the limit', () => {
    expect(rubberBand(0)).toBeCloseTo(0);
    expect(rubberBand(30)).toBeLessThan(0); // pulled past the maximum: number moves up
    expect(rubberBand(-30)).toBeGreaterThan(0); // pulled past zero: number moves down
    expect(Math.abs(rubberBand(60))).toBeLessThan(Math.abs(rubberBand(120)));
    expect(Math.abs(rubberBand(120)) - Math.abs(rubberBand(60))).toBeLessThan(Math.abs(rubberBand(60)));
    expect(Math.abs(rubberBand(10_000))).toBeLessThanOrEqual(RUBBER_MAX_PT);
  });
});
