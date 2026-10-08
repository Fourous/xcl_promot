import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { CaptchaService } from '@/common/captcha.service';
import { hashPassword, verifyPassword } from '@/common/password.util';
import { signAdminToken, AdminTokenPayload } from '@/common/token.util';

interface LoginBody {
  account: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}

/** 管理员登录服务 */
@Injectable()
export class AdminService {
  // 登录失败锁定：账号 -> { count, lockedUntil }
  private loginFailures = new Map<string, { count: number; lockedUntil: number }>();

  constructor(private readonly captchaService: CaptchaService) {}

  captcha() {
    return this.captchaService.generate();
  }

  async login(body: any) {
    const { account, password, captchaId, captchaCode } = body || ({} as LoginBody);
    if (!account || !password || !captchaId || !captchaCode) {
      throw new BadRequestException('参数不完整');
    }

    // 1. 校验图形验证码
    if (!this.captchaService.verify(captchaId, captchaCode)) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 2. 锁定检查
    const fail = this.loginFailures.get(account);
    if (fail && fail.lockedUntil > Date.now()) {
      throw new BadRequestException('账号已锁定，请 15 分钟后再试');
    }

    const client = getSupabaseClient();
    await this.ensureDefaultAdmin(client);

    // 3. 校验账号密码
    const { data: admin } = await client
      .from('admins')
      .select('*')
      .eq('account', account)
      .maybeSingle();

    if (!admin || admin.status !== 'active' || !verifyPassword(password, admin.password_hash)) {
      const now = Date.now();
      const record = this.loginFailures.get(account) || { count: 0, lockedUntil: 0 };
      record.count += 1;
      if (record.count >= 5) {
        record.lockedUntil = now + 15 * 60 * 1000;
        record.count = 0;
      }
      this.loginFailures.set(account, record);
      throw new BadRequestException('账号或密码错误');
    }

    // 登录成功，清除失败记录
    this.loginFailures.delete(account);
    await client
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);
    await client.from('audit_logs').insert({
      admin_id: admin.id,
      admin_name: admin.name,
      action: 'login',
      target: 'admin',
      params_summary: '登录成功',
    });

    const token = signAdminToken(admin.id, admin.account, admin.role);
    return {
      token,
      admin: { id: admin.id, account: admin.account, name: admin.name, role: admin.role },
    };
  }

  async profile(admin: AdminTokenPayload) {
    const client = getSupabaseClient();
    const { data } = await client
      .from('admins')
      .select('id,account,name,role,status,last_login_at')
      .eq('id', admin.adminId)
      .maybeSingle();
    if (!data) throw new BadRequestException('管理员不存在');
    return data;
  }

  /** 首次登录时初始化默认管理员（admin / admin123） */
  private async ensureDefaultAdmin(client: any) {
    const { count } = await client.from('admins').select('*', { count: 'exact', head: true });
    if ((count || 0) === 0) {
      await client.from('admins').insert({
        account: 'admin',
        password_hash: hashPassword('admin123'),
        name: '超级管理员',
        role: 'super_admin',
        status: 'active',
      });
    }
  }
}
