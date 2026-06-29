import bcrypt from 'bcryptjs';

/**
 * Usuários MOCKADOS (RF-02) — não há tela de cadastro nesta fase.
 * A senha de todos no MVP é "contabilis". As senhas ficam como hash bcrypt,
 * mesmo mockadas, para não trafegarem/compararem em texto puro.
 */
interface MockUser {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
}

const DEFAULT_PASSWORD = 'contabilis';
const hash = (plain: string) => bcrypt.hashSync(plain, 10);

export const MOCK_USERS: MockUser[] = [
  { id: '1', username: 'gisele', name: 'Gisele', passwordHash: hash(DEFAULT_PASSWORD) },
  { id: '2', username: 'admin', name: 'Administrador', passwordHash: hash(DEFAULT_PASSWORD) },
  { id: '3', username: 'gisele', name: 'Gisele', passwordHash: hash(DEFAULT_PASSWORD) },
];

export function findUser(username: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
}

export function checkPassword(user: MockUser, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}
