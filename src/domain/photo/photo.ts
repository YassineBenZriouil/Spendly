/**
 * Receipt photos: JPEG files in the app's document directory; an expense stores only the file name. Names are made
 * here and checked everywhere they come in from outside (backups, drafts), so a name can never point elsewhere.
 */
const PHOTO_NAME = /^[a-z0-9]+-[a-z0-9]+\.jpg$/;

export const isPhotoName = (value: unknown): value is string => typeof value === 'string' && PHOTO_NAME.test(value);

/** A new file name from a record id (`createId()`). */
export const photoNameFor = (id: string) => `${id}.jpg`;

/** Photos are resized so their longest side is at most this, and saved as JPEG at this quality. */
export const PHOTO_MAX_SIDE = 2000;
export const PHOTO_QUALITY = 0.7;

/**
 * A file this new is never removed as an orphan: it may belong to a photo just taken whose draft or expense isn't
 * written yet.
 */
export const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

export type StoredPhotoFile = { name: string; modifiedAt: number | null };

/**
 * Files in the photo directory that nothing refers to any more (no expense, live or deleted, no draft, no Undo) and
 * that are old enough to be safe to remove. Anything that isn't a photo name is left alone.
 */
export function orphanPhotos(files: StoredPhotoFile[], referenced: ReadonlySet<string>, now: number): string[] {
  return files
    .filter(({ name, modifiedAt }) => isPhotoName(name) && !referenced.has(name) && modifiedAt !== null && now - modifiedAt >= ORPHAN_MIN_AGE_MS)
    .map(({ name }) => name);
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** True when `data` is base64 that decodes to a JPEG (checks the encoding and the JPEG start marker). */
export function isJpegBase64(data: unknown): data is string {
  if (typeof data !== 'string' || data.length < 8 || data.length % 4 !== 0 || !BASE64.test(data)) return false;
  try {
    const start = atob(data.slice(0, 8));
    return start.charCodeAt(0) === 0xff && start.charCodeAt(1) === 0xd8 && start.charCodeAt(2) === 0xff;
  } catch {
    return false;
  }
}
