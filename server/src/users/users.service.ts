import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 用户池（voter_accounts）管理服务：全局账号，工号唯一 */
@Injectable()
export class UsersService {
  /** 用户列表（分页 + 工号/姓名搜索） */
  async list(keyword?: string, page = 1, pageSize = 20) {
    const client = getSupabaseClient();
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;

    let builder = client.from('voter_accounts').select('*', { count: 'exact' });
    if (keyword) {
      const kw = String(keyword).trim();
      builder = builder.or(`employee_no.ilike.%${kw}%,name.ilike.%${kw}%`);
    }

    const from = (p - 1) * ps;
    const to = from + ps - 1;
    const { data, error, count } = await builder
      .order('employee_no', { ascending: true })
      .range(from, to);

    if (error) throw new BadRequestException(`用户查询失败: ${error.message}`);
    return { list: data || [], total: count || 0, page: p, pageSize: ps };
  }

  /** 重置密码：清空 password_hash，恢复默认密码（工号），登录后需重新改密 */
  async resetPassword(employeeNo: string) {
    const client = getSupabaseClient();
    const emp = String(employeeNo || '').trim();
    if (!emp) throw new BadRequestException('缺少工号');

    const { data: acc } = await client
      .from('voter_accounts')
      .select('id')
      .eq('employee_no', emp)
      .maybeSingle();
    if (!acc) throw new BadRequestException('该工号不在用户池中');

    const { error } = await client
      .from('voter_accounts')
      .update({ password_hash: null, updated_at: new Date().toISOString() })
      .eq('id', acc.id);
    if (error) throw new BadRequestException(`重置失败: ${error.message}`);

    return { reset: true, employeeNo: emp };
  }
}
