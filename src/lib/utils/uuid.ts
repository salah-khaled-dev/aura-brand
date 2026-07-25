/**
 * UUID generation — never use Date.now() or Math.random() as entity IDs.
 * Uses Web Crypto API (available in all browsers and Node 14.17+).
 * Next.js 15 (Node 18+) guarantees availability.
 */

export function generateId(): string {
  return crypto.randomUUID();
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validates a string is a well-formed UUID (v1-v5). Used to guard values headed into `uuid`-typed RPC params. */
export function isUUID(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Generate a human-readable document number.
 * e.g. orderNumber("ORD", 5) → "ORD-00042" when sequence = 42
 */
export function generateDocumentNumber(prefix: string, sequence: number, pad = 5): string {
  return `${prefix}${String(sequence).padStart(pad, '0')}`;
}

/**
 * Generate a random alphanumeric code (for coupons, gift cards, etc.)
 * e.g. generateCode(4, 4) → "AURA-X3K9-P2QZ-7FNR"
 */
export function generateCode(prefix: string, segments = 3, segmentLength = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O or 1/I to avoid confusion
  const segmentParts = Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  );
  return prefix ? `${prefix}-${segmentParts.join('-')}` : segmentParts.join('-');
}
