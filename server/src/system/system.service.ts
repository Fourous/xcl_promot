import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/common/password.util';

/** 系统管理：管理员账号、操作日志、数据重置与归档 */
@Injectable()
export class SystemService {
  /** 管理员列表（不含密码） */
  async listAdmins() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('admins')
      .select('id, account, name, role, status, last_login_at, created_at')
      .order('created_at', { ascending: true });
    if (error) throw new BadRequestException(`查询失败: ${error.message}`);
    return data || [];
  }

  /** 新增管理员 */
  async createAdmin(body: any, operator: any) {
    const { account, password, name, role } = body || {};
    if (!account || !password || !name) throw new BadRequestException('账号、密码、姓名必填');
    const client = getSupabaseClient();
    const { data: exists } = await client.from('admins').select('id').eq('account', account).maybeSingle();
    if (exists) throw new BadRequestException('账号已存在');

    const { data, error } = await client
      .from('admins')
      .insert({
        account,
        name,
        password_hash: hashPassword(password),
        role: role || 'operator',
        status: 'active',
      })
      .select('id, account, name, role, status')
      .single();
    if (error) throw new BadRequestException(`新增失败: ${error.message}`);
    await this.log(client, operator?.adminId, operator?.account, 'create_admin', account, `新增管理员 ${account}`);
    return data;
  }

  /** 更新管理员（角色/状态/重置密码） */
  async updateAdmin(id: string, body: any, operator: any) {
    const client = getSupabaseClient();
    const patch: any = {};
    if (body.role) patch.role = body.role;
    if (body.status) patch.status = body.status;
    if (body.password) patch.password_hash = hashPassword(body.password);
    if (!Object.keys(patch).length) throw new BadRequestException('无可更新字段');

    const { data, error } = await client
      .from('admins')
      .update(patch)
      .eq('id', id)
      .select('id, account, name, role, status')
      .single();
    if (error) throw new BadRequestException(`更新失败: ${error.message}`);
    await this.log(client, operator?.adminId, operator?.account, 'update_admin', data.account, '更新管理员');
    return data;
  }

  /** 删除管理员 */
  async deleteAdmin(id: string, operator: any) {
    const client = getSupabaseClient();
    const { data: target } = await client.from('admins').select('account, role').eq('id', id).maybeSingle();
    if (!target) throw new BadRequestException('管理员不存在');
    if (operator?.adminId === id) throw new BadRequestException('不能删除当前登录账号');
    if (target.role === 'super_admin') {
      const { count } = await client.from('admins').select('*', { count: 'exact', head: true }).eq('role', 'super_admin');
      if ((count || 0) <= 1) throw new BadRequestException('至少保留一名超级管理员');
    }
    const { error } = await client.from('admins').delete().eq('id', id);
    if (error) throw new BadRequestException(`删除失败: ${error.message}`);
    await this.log(client, operator?.adminId, operator?.account, 'delete_admin', target.account, '删除管理员');
    return { deleted: true };
  }

  /** 操作日志查询 */
  async listLogs(_admin: any) {
    const client = getSupabaseClient();
    const { data, error } = await client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw new BadRequestException(`查询失败: ${error.message}`);
    return data || [];
  }

  /** 数据重置 / 活动归档（危险操作） */
  async archive(body: any, operator: any) {
    const client = getSupabaseClient();
    const { type } = body || {};
    if (type === 'reset_votes') {
      const never = '00000000-0000-0000-0000-000000000000';
      await client.from('votes').delete().neq('id', never);
      await client.from('vote_submissions').delete().neq('id', never);
      await client.from('voters').update({ has_voted: false, voted_at: null }).neq('id', never);
      await this.log(client, operator?.adminId, operator?.account, 'reset_votes', 'votes', '重置投票数据');
      return { archived: false, reset: true };
    }
    await client.from('vote_config').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', 1);
    await this.log(client, operator?.adminId, operator?.account, 'archive', 'activity', '活动归档');
    return { archived: true, reset: false };
  }

  private async log(client: any, adminId: string, adminName: string, action: string, target: string, summary: string) {
    await client.from('audit_logs').insert({
      admin_id: adminId || null,
      admin_name: adminName || null,
      action,
      target,
      params_summary: summary,
    });
  }
}
