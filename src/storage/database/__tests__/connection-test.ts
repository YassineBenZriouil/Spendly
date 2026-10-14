const mockOpenDatabaseAsync = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...args: unknown[]) => mockOpenDatabaseAsync(...args) }));
jest.mock('../migrations', () => ({ migrate: jest.fn(async () => {}) }));

const healthy = async () => [{ quick_check: 'ok' }];
const fakeDb = { execAsync: jest.fn(async () => {}), getAllAsync: jest.fn(healthy), runAsync: jest.fn(async () => ({ changes: 0 })) };

/** A new copy of the module, so each test starts with no cached connection. */
function freshConnection() {
  let connection!: typeof import('../connection');
  let health!: typeof import('../health');
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules needs a synchronous require */
    connection = require('../connection');
    health = require('../health');
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  return { ...connection, databaseHealth: health.databaseHealth };
}

describe('getDatabase', () => {
  beforeEach(() => mockOpenDatabaseAsync.mockReset());

  it('opens once and shares the connection', async () => {
    mockOpenDatabaseAsync.mockResolvedValue(fakeDb);
    const { getDatabase } = freshConnection();
    const [a, b] = await Promise.all([getDatabase(), getDatabase()]);
    expect(a).toBe(b);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it('reports a damaged database but still opens it, untouched by any repair', async () => {
    fakeDb.getAllAsync.mockImplementationOnce(async () => [{ quick_check: '*** in database main ***' }]);
    mockOpenDatabaseAsync.mockResolvedValue(fakeDb);
    const { getDatabase, databaseHealth } = freshConnection();
    expect(databaseHealth.isDamaged()).toBe(false);
    await expect(getDatabase()).resolves.toBe(fakeDb);
    expect(databaseHealth.isDamaged()).toBe(true);
  });

  it('still opens when the purge of old deleted expenses fails', async () => {
    fakeDb.runAsync.mockRejectedValueOnce(new Error('disk I/O error'));
    mockOpenDatabaseAsync.mockResolvedValue(fakeDb);
    const { getDatabase, databaseHealth } = freshConnection();
    await expect(getDatabase()).resolves.toBe(fakeDb);
    expect(databaseHealth.isDamaged()).toBe(false);
  });

  it('retries on the next call after a failed open instead of caching the failure', async () => {
    mockOpenDatabaseAsync.mockRejectedValueOnce(new Error('disk I/O error')).mockResolvedValue(fakeDb);
    const { getDatabase } = freshConnection();
    await expect(getDatabase()).rejects.toThrow('disk I/O error');
    await expect(getDatabase()).resolves.toBe(fakeDb);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
  });
});
