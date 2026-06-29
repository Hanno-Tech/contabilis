import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Cifra de credenciais sensíveis (RNF-02) com AES-256-GCM.
 * Formato armazenado: base64(iv).base64(authTag).base64(ciphertext)
 */
const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = Buffer.from(env.credentialsEncryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY deve ter 32 bytes (base64). ' +
        'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  return key;
}

export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const parts = payload.split('.');
  if (parts.length !== 3) return null;
  const [ivB64, tagB64, dataB64] = parts;
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}
