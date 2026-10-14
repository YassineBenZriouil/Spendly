import { autoBackupName, autoBackupsToDelete, isAutoBackupDue } from '../autoBackup';

describe('auto-backup', () => {
  it('is due the first time and once a week after that', () => {
    const now = new Date(2026, 9, 14, 3);
    expect(isAutoBackupDue(undefined, now)).toBe(true);
    expect(isAutoBackupDue(new Date(2026, 9, 10, 3).toISOString(), now)).toBe(false);
    expect(isAutoBackupDue(new Date(2026, 9, 7, 3).toISOString(), now)).toBe(true);
    // A background run an hour early still counts
    expect(isAutoBackupDue(new Date(2026, 9, 7, 3, 59).toISOString(), now)).toBe(true);
    expect(isAutoBackupDue('not a date', now)).toBe(true);
  });

  it('names files by local date', () => {
    expect(autoBackupName(new Date(2026, 0, 5, 23, 59))).toBe('spendly-auto-2026-01-05.json');
  });

  it('keeps the newest 4 and never touches other files', () => {
    const names = [
      'spendly-auto-2026-09-16.json',
      'spendly-auto-2026-10-14.json',
      'spendly-backup-2026-01-01.json',
      'spendly-auto-2026-09-23.json',
      'spendly-auto-2026-10-07.json',
      'spendly-auto-2026-09-30.json',
      'notes.txt',
    ];
    expect(autoBackupsToDelete(names)).toEqual(['spendly-auto-2026-09-16.json']);
    expect(autoBackupsToDelete(names.slice(0, 3))).toEqual([]);
  });
});
