import { expenseRepository } from '@/domain/expense/expense.repository';
import { orphanPhotos } from '@/domain/photo/photo';
import { loadDraft } from '@/features/quick-add/state/draftStorage';
import { undoStore } from '@/features/undo/state/undoStore';
import { deletePhoto, storedPhotos } from '@/storage/photos/photoFiles';

/**
 * Removes photo files nothing refers to any more: replaced or removed photos, photos of expenses the 30-day purge
 * removed, abandoned drafts. A photo is kept while any expense (deleted ones too), the Quick Add draft or the Undo
 * slot still refers to it, and new files are never touched. Runs once per launch, after the database purge.
 */
export async function cleanUpPhotos(now = Date.now()) {
  const referenced = new Set(await expenseRepository.photoNames());
  const draftPhoto = loadDraft()?.details?.photo;
  if (draftPhoto) referenced.add(draftPhoto);
  const undoPhoto = undoStore.get(now)?.expense.photo;
  if (undoPhoto) referenced.add(undoPhoto);
  for (const name of orphanPhotos(storedPhotos(), referenced, now)) deletePhoto(name);
}
