/** Client-generated record id: time-ordered prefix + random suffix. Unique per device, which is all local storage needs. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
