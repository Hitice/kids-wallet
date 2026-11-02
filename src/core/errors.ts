/**
 * Error raised by the vault core for any invalid input or refused operation.
 * Messages are written for end users: the UI shows them as they are.
 */
export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultError';
  }
}
