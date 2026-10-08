import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * 密码加密与校验工具
 * 使用 Node 内置 scrypt 算法，不硬编码任何密钥，salt 随机生成并拼接存储
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}
