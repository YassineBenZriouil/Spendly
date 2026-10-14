let damaged = false;
const listeners = new Set<() => void>();

/**
 * Set when the launch integrity check fails. The file is left exactly as it is (nothing is repaired or replaced), and
 * the app tells the user and offers a restore from backup.
 */
export const databaseHealth = {
  isDamaged: () => damaged,
  markDamaged() {
    damaged = true;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
