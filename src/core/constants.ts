/**
 * nLockTime values below this are block heights; values at or above are Unix
 * timestamps (BIP65 / Bitcoin Core LOCKTIME_THRESHOLD).
 */
export const LOCKTIME_THRESHOLD = 500_000_000;

/** nLockTime is a uint32. */
export const MAX_LOCKTIME = 0xffff_ffff;

/**
 * Sequence for the child path: below 0xffffffff so nLockTime is enforced and
 * OP_CHECKLOCKTIMEVERIFY passes; it does not signal BIP125 replaceability.
 */
export const SEQUENCE_LOCKTIME_ENABLED = 0xffff_fffe;

/** Sequence for the parent path: enables nLockTime and signals BIP125 replaceability. */
export const SEQUENCE_RBF = 0xffff_fffd;

/** Conservative dust limit used for every output the app creates (sats). */
export const DUST_LIMIT_SATS = 546n;

/** Fee-rate bounds accepted by the app (sat/vB). */
export const MIN_FEE_RATE = 1;
export const MAX_FEE_RATE = 1000;

/** Age at which the child path opens. */
export const UNLOCK_AGE_YEARS = 18;
