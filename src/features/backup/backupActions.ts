import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createBackup, parseBackup, type Backup, type BackupParseResult } from '@/domain/backup/backup';
import { restoreBackup, type RestoreResult } from '@/domain/backup/backup.repository';
import { categoryRepository } from '@/domain/category/category.repository';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { getDatabase } from '@/storage/database/connection';
import { t } from '@/i18n';
import { getPreferences, sanitizePreferences, updatePreferences } from '@/storage/preferences/preferences';

/** Writes a backup of everything and hands it to the share sheet (Files, AirDrop, email…). Returns the expense count. */
export async function shareBackup(): Promise<number> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  const [expenses, categories] = await Promise.all([expenseRepository.search({}), categoryRepository.list()]);
  const backup = createBackup({ expenses, categories, preferences: getPreferences() });
  // Cache directory: the system may clear it later; the kept copy is wherever the user saves it
  const file = new File(Paths.cache, `spendly-backup-${backup.createdAt.slice(0, 10)}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: t('data.backUp.shareTitle') });
  return expenses.length;
}

/** Lets the user pick a backup file and checks all of it. `null` if they cancelled. */
export async function pickBackup(): Promise<BackupParseResult | null> {
  // Any type: file managers label JSON inconsistently; parseBackup rejects anything that isn't a backup
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (picked.canceled) return null;
  return parseBackup(await new File(picked.assets[0].uri).text());
}

/** Adds the backup's data (nothing here is overwritten) and its settings, then refreshes every screen. */
export async function applyBackup(backup: Backup): Promise<RestoreResult> {
  const result = await restoreBackup(await getDatabase(), backup);
  updatePreferences(sanitizePreferences(backup.preferences));
  expenseRepository.notifyChanged();
  categoryRepository.notifyChanged();
  return result;
}
