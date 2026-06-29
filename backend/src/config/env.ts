import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', 'dev-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  credentialsEncryptionKey: required(
    'CREDENTIALS_ENCRYPTION_KEY',
    'Y29udGFiaWxpcy1kZXYta2V5LTMyLWJ5dGVzLWFhYWE=',
  ),
  // Aceita uma ou várias origens separadas por vírgula (alias + localhost).
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://contabilis.local,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProd: process.env.NODE_ENV === 'production',
};
