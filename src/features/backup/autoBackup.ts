import * as BackgroundTask from 'expo-background-task';
import { Directory, File, Paths } from 'expo-file-system';
import * as TaskManager from 'expo-task-manager';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { autoBackupName, autoBackupsToDelete, isAutoBackupDue, isAutoBackupName } from '@/domain/backup/autoBackup';
import { t } from '@/i18n';
import { writeFailureMessage } from '@/storage/database/errors';
import { getPreferences, updatePreferences } from '@/storage/preferences/preferences';

import { buildBackup, shareBackupFile } from './backupActions';

const TASK = 'spendly-auto-backup';
/** How often the system is asked to wake the app to check (it decides when; the backup itself is weekly). */
const CHECK_EVERY_MINUTES = 12 * 60;

/**
 * Auto-backups live in the app's own documents folder: never shown in the Files app (where the database next to
 * them could be moved by mistake), included in the phone's own backup (iCloud / computer on iOS, Android Auto Backup).
 */
function backupFolder() {
  const folder = new Directory(Paths.document, 'backups');
  folder.create({ idempotent: true, intermediates: true });
  return folder;
}

const autoBackupFiles = () =>
  backupFolder()
    .list()
    .filter((entry): entry is File => entry instanceof File && isAutoBackupName(entry.name));

let running = false;

/** Writes this week's backup if auto-backup is on and one is due; keeps the newest 4. Failures are shown in Settings. */
export async function runAutoBackupIfDue(now = new Date()): Promise<void> {
  const { autoBackup, autoBackupStatus } = getPreferences();
  if (running || !autoBackup || !isAutoBackupDue(autoBackupStatus?.lastAt, now)) return;
  running = true;
  try {
    const { text } = await buildBackup();
    const file = new File(backupFolder(), autoBackupName(now));
    file.create({ overwrite: true });
    file.write(text);
    for (const name of autoBackupsToDelete(autoBackupFiles().map((entry) => entry.name))) new File(backupFolder(), name).delete();
    updatePreferences({ autoBackupStatus: { lastAt: now.toISOString() } });
  } catch (error) {
    // The last good backup stays listed; the failure is shown next to it
    updatePreferences({
      autoBackupStatus: { ...autoBackupStatus, failedAt: now.toISOString(), error: writeFailureMessage(error, t('data.autoBackup.failed')) },
    });
  } finally {
    running = false;
  }
}

/** Defined at app start (`index.js`), so the system can run it with the app closed. */
export function defineAutoBackupTask() {
  TaskManager.defineTask(TASK, async () => {
    await runAutoBackupIfDue();
    return BackgroundTask.BackgroundTaskResult.Success;
  });
}

/** Settings switch: on schedules the background check and backs up now if due; off stops it (files are kept). */
export async function setAutoBackup(on: boolean) {
  updatePreferences({ autoBackup: on });
  if (on) {
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: CHECK_EVERY_MINUTES }).catch(() => {
      // Background runs unavailable: launches and returns to the app still back up when due
    });
    await runAutoBackupIfDue();
  } else {
    await BackgroundTask.unregisterTaskAsync(TASK).catch(() => {
      // Not registered
    });
  }
}

/** The newest auto-backup file, if any. */
export const latestAutoBackup = (): File | null =>
  autoBackupFiles().sort((a, b) => b.name.localeCompare(a.name))[0] ?? null;

export async function shareLatestAutoBackup() {
  const file = latestAutoBackup();
  if (file) await shareBackupFile(file);
}

/** Root layout: backs up when due at launch and on each return, for when the system hasn't run the background task. */
export function useAutoBackupCheck() {
  useEffect(() => {
    runAutoBackupIfDue();
    const appState = AppState.addEventListener('change', (status) => status === 'active' && runAutoBackupIfDue());
    return () => appState.remove();
  }, []);
}
