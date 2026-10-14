const mockDisk = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => mockDisk.get(key) ?? null,
    setItemSync: (key: string, value: string) => mockDisk.set(key, value),
    removeItemSync: (key: string) => mockDisk.delete(key),
  },
}));

/** A fresh copy of the module: what the app sees on a new launch. */
function launch(): typeof import('../preferences') {
  let preferences!: typeof import('../preferences');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.isolateModules needs a synchronous require
    preferences = require('../preferences');
  });
  return preferences;
}

beforeEach(() => mockDisk.clear());

describe('theme style migration', () => {
  it('starts a fresh install on Black & White, following the system', () => {
    expect(launch().getPreferences()).toMatchObject({ themeStyle: 'mono', theme: 'system' });
  });

  it('keeps existing users on Color with their light/dark choice', () => {
    mockDisk.set('preferences', JSON.stringify({ theme: 'dark' }));
    expect(launch().getPreferences()).toMatchObject({ themeStyle: 'color', theme: 'dark' });
    mockDisk.set('preferences', JSON.stringify({ onboardingSeen: true }));
    expect(launch().getPreferences()).toMatchObject({ themeStyle: 'color', theme: 'system' });
  });

  it('decides once: a new user stays on Black & White after other settings are saved', () => {
    launch().getPreferences();
    launch().updatePreferences({ onboardingSeen: true });
    expect(launch().getPreferences().themeStyle).toBe('mono');
  });

  it('respects a stored choice and ignores invalid values', () => {
    mockDisk.set('preferences', JSON.stringify({ themeStyle: 'mono', theme: 'light', accent: 'teal' }));
    expect(launch().getPreferences()).toMatchObject({ themeStyle: 'mono', theme: 'light', accent: 'teal' });
    mockDisk.set('preferences', JSON.stringify({ themeStyle: 'neon', accent: 'gold' }));
    expect(launch().getPreferences()).toMatchObject({ themeStyle: 'mono', accent: 'lime' });
  });
});
