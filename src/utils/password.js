import bcrypt from 'bcrypt';

const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, rounds);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
