import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Signs a data bundle with RSA-SHA256 private key
 */
export function signBundle(data: object): string {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(JSON.stringify(data));
  sign.end();
  return sign.sign(env.RSA_PRIVATE_KEY, 'base64');
}

/**
 * Verifies a bundle signature with RSA public key
 */
export function verifyBundleSignature(data: object, signature: string): boolean {
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(JSON.stringify(data));
    verify.end();
    return verify.verify(env.RSA_PUBLIC_KEY, signature, 'base64');
  } catch {
    return false;
  }
}

/**
 * Get the RSA public key in PEM format
 */
export function getPublicKey(): string {
  return env.RSA_PUBLIC_KEY;
}
