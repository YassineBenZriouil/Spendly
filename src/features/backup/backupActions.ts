import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createBackup, parseBackup, type Backup, type BackupParseResult } from '@/domain/backup/backup';
import { restoreBackup, type RestoreResult } from '@/domain/backup/backup.repository';
import { categoryRepository } from '@/domain/category/category.repository';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { recurrenceRepository } from '@/domain/recurrence/recurrence.repository';
import { lockStore } from '@/features/lock/state/lockStore';
import { getDatabase } from '@/storage/database/connection';
import { t } from '@/i18n';
import { getPreferences, restorablePreferences, updatePreferences } from '@/storage/preferences/preferences';
import { photoBytes, readPhotoBase64, writePhotoBase64 } from '@/storage/photos/photoFiles';

/** Everything, as the backup file's text (manual and automatic backups are the same file). */
export async function buildBackup(): Promise<{ backup: Backup; text: string }> {
  const [expenses, categories, repeats] = await Promise.all([
    expenseRepository.search({}),
    categoryRepository.list(),
    recurrenceRepository.all(),
  ]);
  // Photos ride inside the file (format 4); the whole file is built in memory, see `backupPhotoBytes`
  const photos = await Promise.all(
    photoNamesOf(expenses).map(async (name) => ({ name, data: await readPhotoBase64(name) })),
  );
  const backup = createBackup({ expenses, categories, preferences: getPreferences(), ...repeats, photos });
  return { backup, text: JSON.stringify(backup) };
}

/** Hands a backup file to the share sheet (Files, AirDrop, email…). */
export async function shareBackupFile(file: File) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await lockStore.withoutLock(() =>
    Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: t('data.backUp.shareTitle') }),
  );
}

/** Writes a backup of everything and hands it to the share sheet. Returns the expense count. */
export async function shareBackup(): Promise<number> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  const { backup, text } = await buildBackup();
  // Cache directory: the system may clear it later; the kept copy is wherever the user saves it
  const file = new File(Paths.cache, `spendly-backup-${backup.createdAt.slice(0, 10)}.json`);
  file.create({ overwrite: true });
  file.write(text);
  await shareBackupFile(file);
  return backup.expenses.length;
}

const photoNamesOf = (expenses: { photo?: string }[]) => expenses.flatMap((expense) => (expense.photo ? [expense.photo] : []));

/** Size of the photos a backup would carry, in bytes, so a large file can be announced before it is made. */
export async function backupPhotoBytes(): Promise<number> {
  return photoBytes(photoNamesOf(await expenseRepository.search({})));
}

/** Lets the user pick a backup file and checks all of it. `null` if they cancelled. */
export async function pickBackup(): Promise<BackupParseResult | null> {
  // Any type: file managers label JSON inconsistently; parseBackup rejects anything that isn't a backup
  const picked = await lockStore.withoutLock(() =>
    DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false }),
  );
  if (picked.canceled) return null;
  return parseBackup(await new File(picked.assets[0].uri).text());
}

/** Adds the backup's data (nothing here is overwritten) and its settings, then refreshes every screen. */
export async function applyBackup(backup: Backup): Promise<RestoreResult> {
  // Photos first (already checked by parseBackup): if the database step then fails, the files are only orphans,
  // removed by the next launch's cleanup; an expense never points to a photo that isn't there
  for (const photo of backup.photos) writePhotoBase64(photo.name, photo.data);
  const result = await restoreBackup(await getDatabase(), backup);
  updatePreferences(restorablePreferences(backup.preferences));
  expenseRepository.notifyChanged();
  categoryRepository.notifyChanged();
  recurrenceRepository.notifyChanged();
  return result;
}
