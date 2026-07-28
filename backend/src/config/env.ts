import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

/**
 * Valores de desenvolvimento — existem só para o app subir sem configuração na
 * máquina de quem programa. Em produção são recusados: um segredo que está
 * neste repositório é público, e com ele dá para forjar sessões e decifrar as
 * senhas dos portais dos clientes.
 */
const DEV_JWT_SECRET = 'dev-secret-nao-usar-em-producao';
const DEV_ENCRYPTION_KEY = 'Y29udGFiaWxpcy1kZXYta2V5LTMyLWJ5dGVzLWFhYWE=';

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  }
  return valor;
}

/**
 * Em produção exige a variável; fora dela cai no padrão de desenvolvimento.
 * Também recusa o padrão de desenvolvimento definido explicitamente em produção
 * — copiar o `.env.example` para o servidor é o engano mais provável.
 */
function segredo(nome: string, padraoDev: string): string {
  const valor = process.env[nome];
  if (!isProd) return valor || padraoDev;

  if (!valor) {
    throw new Error(
      `Variável de ambiente obrigatória ausente em produção: ${nome}. ` +
        `Gere um valor com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  if (valor === padraoDev) {
    throw new Error(
      `${nome} está com o valor de exemplo do repositório — é público. Gere um valor próprio.`,
    );
  }
  return valor;
}

const corsOrigin = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean);

// Em produção o frontend e a API vivem no mesmo domínio (deploy único no
// Vercel), então CORS_ORIGIN só é necessário se algo externo consumir a API.

export const env = {
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: obrigatoria('DATABASE_URL'),
  jwtSecret: segredo('JWT_SECRET', DEV_JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  credentialsEncryptionKey: segredo('CREDENTIALS_ENCRYPTION_KEY', DEV_ENCRYPTION_KEY),
  /**
   * Origens liberadas no CORS. Vazio = só mesma origem (requisições sem header
   * `Origin`), que é o caso do deploy único.
   */
  corsOrigin,
  isProd,
};
