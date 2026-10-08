import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 投票端身份识别服务 */
@Injectable()
export class VoteAuthService {
  /**
   * 微信登录：根据 code 生成稳定 openid，查询是否已绑定投票人。
   * 演示环境用 code 直接生成（真实环境需调用微信 code2session 换取 openid）。
   * 未绑定时返回 verified=false，前端引导进入工号校验页。
   */
  async login(code: string, activityId = 1) {
    const openid = `demo_${String(code).trim()}`;
    const aid = Number(activityId) || 1;
    const client = getSupabaseClient();

    const { data: existing } = await client
      .from('voters')
      .select('*')
      .eq('activity_id', aid)
      .eq('openid', openid)
      .maybeSingle();

    if (existing) {
      return {
        openid,
        verified: true,
        hasVoted: existing.has_voted,
        name: existing.name,
        employeeNo: existing.employee_no,
        department: existing.department,
      };
    }

    return {
      openid,
      verified: false,
      hasVoted: false,
      name: null,
      employeeNo: null,
      department: null,
    };
  }

  /**
   * 工号/姓名校验：校验投票人是否在预置清单中，并绑定 openid。
   * 只有清单内（工号 + 姓名匹配）且未绑定的投票人才能通过。
   */
  async verify(openid: string, employeeNo: string, name: string, activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    const emp = String(employeeNo || '').trim();
    const nm = String(name || '').trim();
    if (!emp) throw new BadRequestException('请输入工号');
    if (!nm) throw new BadRequestException('请输入姓名');

    const { data: roster } = await client
      .from('voters')
      .select('*')
      .eq('activity_id', aid)
      .eq('employee_no', emp)
      .maybeSingle();

    if (!roster) throw new BadRequestException('工号不在投票名单中，请联系管理员');
    if (roster.name !== nm) throw new BadRequestException('姓名与工号不匹配，请核对后重试');
    if (roster.openid && roster.openid !== openid) {
      throw new BadRequestException('该工号已被绑定，请勿重复投票');
    }

    const { data, error } = await client
      .from('voters')
      .update({ openid })
      .eq('id', roster.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new BadRequestException('该工号已被绑定，请勿重复投票');
      throw new BadRequestException(`校验失败: ${error.message}`);
    }

    return {
      openid,
      verified: true,
      name: data.name,
      employeeNo: data.employee_no,
      hasVoted: data.has_voted,
    };
  }
}
