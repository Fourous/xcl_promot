import { createHmac, randomBytes } from 'crypto';

// 管理端令牌签名密钥：优先从环境变量读取，否则随机生成（重启后旧 token 失效，需重新登录）
const SECRET = process.env.COZE_ADMIN_SECRET || randomBytes(32).toString('hex');
const TOKEN_TTL = 2 * 60 * 60 * 1000; // 2 小时有效期

export interface AdminTokenPayload {
  adminId: string;
  account: string;
  role: string;
  exp: number;
}

function base64urlEncode(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

/** 签发管理员令牌 */
export function signAdminToken(adminId: string, account: string, role: string): string {
  const payload: AdminTokenPayload = {
    adminId,
    account,
    role,
    exp: Date.now() + TOKEN_TTL,
  };
  const body = base64urlEncode(payload);
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** 校验管理员令牌，失败返回 null */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as AdminTokenPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// 投票人令牌签名密钥与有效期（7 天）
const VOTER_SECRET = process.env.COZE_VOTER_SECRET || randomBytes(32).toString('hex');
const VOTER_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

export interface VoterTokenPayload {
  employeeNo: string;
  name: string;
  exp: number;
}

/** 签发投票人令牌 */
export function signVoterToken(employeeNo: string, name: string): string {
  const payload: VoterTokenPayload = { employeeNo, name, exp: Date.now() + VOTER_TOKEN_TTL };
  const body = base64urlEncode(payload);
  const sig = createHmac('sha256', VOTER_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** 校验投票人令牌，失败返回 null */
export function verifyVoterToken(token: string): VoterTokenPayload | null {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', VOTER_SECRET).update(body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as VoterTokenPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
