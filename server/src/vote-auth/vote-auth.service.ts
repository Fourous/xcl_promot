import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, verifyPassword } from '@/common/password.util';
import { signVoterToken, verifyVoterToken } from '@/common/token.util';

/** 投票端账号密码登录与改密服务（账号 = 工号，全局账号体系） */
@Injectable()
export class VoteAuthService {
  /**
   * 账号密码登录。
   * 账号为工号；首次登录（password_hash 为空）初始密码 = 工号，需强制改密。
   */
  async login(account: string, password: string) {
    const client = getSupabaseClient();
    const emp = String(account || '').trim();
    const pwd = String(password || '').trim();
    if (!emp) throw new BadRequestException('请输入工号');
    if (!pwd) throw new BadRequestException('请输入密码');

    const { data: acc } = await client
      .from('voter_accounts')
      .select('*')
      .eq('employee_no', emp)
      .maybeSingle();

    if (!acc) throw new BadRequestException('没有该账号，请联系管理员确认');

    let needChangePassword = false;
    if (!acc.password_hash) {
      // 首次登录：初始密码 = 工号
      if (pwd !== emp) throw new BadRequestException('密码错误，如需重置请联系管理员');
      needChangePassword = true;
    } else {
      if (!verifyPassword(pwd, acc.password_hash)) throw new BadRequestException('密码错误，如需重置请联系管理员');
    }

    const token = signVoterToken(acc.employee_no, acc.name);
    return {
      token,
      employeeNo: acc.employee_no,
      name: acc.name,
      department: acc.department || null,
      needChangePassword,
    };
  }

  /** 修改密码（首次登录强制；后续可自行修改） */
  async changePassword(token: string, oldPassword: string, newPassword: string) {
    const payload = verifyVoterToken(token);
    if (!payload) throw new BadRequestException('登录已过期，请重新登录');

    const client = getSupabaseClient();
    const oldPwd = String(oldPassword || '').trim();
    const newPwd = String(newPassword || '').trim();
    if (!newPwd || newPwd.length < 4) throw new BadRequestException('新密码至少 4 位');

    const { data: acc } = await client
      .from('voter_accounts')
      .select('*')
      .eq('employee_no', payload.employeeNo)
      .maybeSingle();
    if (!acc) throw new BadRequestException('账号不存在');

    // 首次改密时原密码 = 工号；后续校验真实原密码
    if (!acc.password_hash) {
      if (oldPwd !== payload.employeeNo) throw new BadRequestException('原密码错误');
    } else {
      if (!verifyPassword(oldPwd, acc.password_hash)) throw new BadRequestException('原密码错误');
    }

    const { error } = await client
      .from('voter_accounts')
      .update({ password_hash: hashPassword(newPwd), updated_at: new Date().toISOString() })
      .eq('id', acc.id);
    if (error) throw new BadRequestException(`修改失败: ${error.message}`);

    return { changed: true };
  }
}
