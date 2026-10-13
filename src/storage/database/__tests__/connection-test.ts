const mockOpenDatabaseAsync = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...args: unknown[]) => mockOpenDatabaseAsync(...args) }));
jest.mock('../migrations', () => ({ migrate: jest.fn(async () => {}) }));

const fakeDb = { execAsync: jest.fn(async () => {}) };

/** A new copy of the module, so each test starts with no cached connection. */
function freshConnection(): typeof import('../connection') {
  let connection!: typeof import('../connection');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.isolateModules needs a synchronous require
    connection = require('../connection');
  });
  return connection;
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

  it('retries on the next call after a failed open instead of caching the failure', async () => {
    mockOpenDatabaseAsync.mockRejectedValueOnce(new Error('disk I/O error')).mockResolvedValue(fakeDb);
    const { getDatabase } = freshConnection();
    await expect(getDatabase()).rejects.toThrow('disk I/O error');
    await expect(getDatabase()).resolves.toBe(fakeDb);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
  });
});
