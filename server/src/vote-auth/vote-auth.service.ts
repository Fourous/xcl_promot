import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 投票端身份识别服务 */
@Injectable()
export class VoteAuthService {
  /**
   * 微信登录：根据 code 生成稳定 openid，查询或创建投票人。
   * 演示环境用 code 直接生成（真实环境需调用微信 code2session 换取 openid）。
   */
  async login(code: string) {
    const openid = `demo_${String(code).trim()}`;
    const client = getSupabaseClient();

    const { data: existing } = await client
      .from('voters')
      .select('*')
      .eq('openid', openid)
      .maybeSingle();

    if (existing) {
      return {
        openid,
        hasVoted: existing.has_voted,
        name: existing.name,
        employeeNo: existing.employee_no,
        department: existing.department,
      };
    }

    const { data: created, error } = await client
      .from('voters')
      .insert({ openid })
      .select()
      .single();
    if (error) throw new BadRequestException(`创建投票人失败: ${error.message}`);

    return {
      openid,
      hasVoted: false,
      name: created.name,
      employeeNo: created.employee_no,
      department: created.department,
    };
  }

  /** 补充/校验工号与姓名 */
  async verify(openid: string, employeeNo: string, name: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('voters')
      .update({ employee_no: employeeNo || null, name: name || null })
      .eq('openid', openid)
      .select()
      .single();
    if (error) throw new BadRequestException(`校验失败: ${error.message}`);
    return { openid, name: data.name, employeeNo: data.employee_no, hasVoted: data.has_voted };
  }
}
