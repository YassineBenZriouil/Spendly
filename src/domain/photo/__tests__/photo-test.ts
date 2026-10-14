import { isJpegBase64, isPhotoName, ORPHAN_MIN_AGE_MS, orphanPhotos, photoNameFor } from '../photo';

// The first bytes of a real JPEG (SOI + APP0 marker), base64
const JPEG = btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49));
const PNG = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00));

describe('photo names', () => {
  it('accepts only names the app makes', () => {
    expect(isPhotoName(photoNameFor('mgq1x2-a1b2c3d4e5'))).toBe(true);
    for (const bad of ['../spendly.db', 'a/b.jpg', 'photo.png', '.jpg', 'x.jpg', '', 42, undefined]) {
      expect(isPhotoName(bad)).toBe(false);
    }
  });
});

describe('isJpegBase64', () => {
  it('accepts JPEG data and rejects anything else', () => {
    expect(isJpegBase64(JPEG)).toBe(true);
    expect(isJpegBase64(PNG)).toBe(false);
    expect(isJpegBase64('not base64!')).toBe(false);
    expect(isJpegBase64(JPEG.slice(0, -1))).toBe(false);
    expect(isJpegBase64('')).toBe(false);
    expect(isJpegBase64(null)).toBe(false);
  });
});

describe('orphanPhotos', () => {
  const now = Date.UTC(2026, 9, 14);
  const old = now - ORPHAN_MIN_AGE_MS;
  const name = (id: string) => photoNameFor(`a1-${id}`);

  it('removes only old photos nothing refers to', () => {
    const files = [
      { name: name('kept'), modifiedAt: old },
      { name: name('orphan'), modifiedAt: old },
      { name: name('fresh'), modifiedAt: now - 1000 },
      { name: name('unknownage'), modifiedAt: null },
      { name: 'notes.txt', modifiedAt: old },
    ];
    expect(orphanPhotos(files, new Set([name('kept')]), now)).toEqual([name('orphan')]);
  });
});
