/**
 * JWT secret resolution.
 * Production must never fall back to the known default secret.
 */

const INSECURE_DEFAULT = 'default-secret';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret === INSECURE_DEFAULT) {
      throw new Error(
        'JWT_SECRET must be set to a strong non-default value when NODE_ENV=production'
      );
    }
    return secret;
  }

  if (!secret) {
    console.warn(
      '[auth] JWT_SECRET is not set; using insecure default (non-production only)'
    );
    return INSECURE_DEFAULT;
  }

  return secret;
}

/** Call once at process startup so misconfigured production fails closed. */
export function assertJwtConfiguredForRuntime(): void {
  getJwtSecret();
}
