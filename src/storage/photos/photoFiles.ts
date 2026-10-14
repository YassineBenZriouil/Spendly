import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { isPhotoName, PHOTO_MAX_SIDE, PHOTO_QUALITY, photoNameFor, type StoredPhotoFile } from '@/domain/photo/photo';
import { createId } from '@/utils/ids';

/** Document directory, not the cache: the system never clears it, and the OS device backup includes it. */
function photoDirectory() {
  const directory = new Directory(Paths.document, 'receipts');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

const photoFile = (name: string) => {
  // Names come from the database, drafts and backups: never let one point outside the photo directory
  if (!isPhotoName(name)) throw new Error(`Not a photo name: ${name}`);
  return new File(photoDirectory(), name);
};

export const photoUri = (name: string) => photoFile(name).uri;

/** Resizes a picked or taken image to `PHOTO_MAX_SIDE`, saves it as JPEG in the photo directory, returns its name. */
export async function storePhoto(source: { uri: string; width: number; height: number }): Promise<string> {
  const context = ImageManipulator.manipulate(source.uri);
  if (Math.max(source.width, source.height) > PHOTO_MAX_SIDE) {
    context.resize(source.width >= source.height ? { width: PHOTO_MAX_SIDE } : { height: PHOTO_MAX_SIDE });
  }
  // Always re-encoded, so every stored photo is a JPEG (iPhones take HEIC)
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
  const name = photoNameFor(createId());
  await new File(saved.uri).move(photoFile(name));
  return name;
}

export const readPhotoBase64 = (name: string) => photoFile(name).base64();

/** Writes a photo from a backup. A photo already here keeps its file: names are unique, so it is the same photo. */
export function writePhotoBase64(name: string, data: string) {
  const file = photoFile(name);
  if (file.exists) return;
  file.create();
  file.write(data, { encoding: 'base64' });
}

/** Total size of these photos on disk, in bytes (missing ones count 0). */
export function photoBytes(names: string[]): number {
  return names.reduce((sum, name) => {
    const file = photoFile(name);
    return sum + (file.exists ? (file.size ?? 0) : 0);
  }, 0);
}

export function storedPhotos(): StoredPhotoFile[] {
  return photoDirectory()
    .list()
    .filter((entry): entry is File => entry instanceof File)
    .map((file) => ({ name: file.name, modifiedAt: file.modificationTime ?? null }));
}

export function deletePhoto(name: string) {
  const file = photoFile(name);
  if (file.exists) file.delete();
}
