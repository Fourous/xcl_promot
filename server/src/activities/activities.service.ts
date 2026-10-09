import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyVoterToken } from '@/common/token.util';

/** 活动（vote_config 多行）管理服务：多活动隔离的核心 */
@Injectable()
export class ActivitiesService {
  /** 活动列表 */
  async list() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('vote_config')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw new BadRequestException(`查询失败: ${error.message}`);
    return data || [];
  }

  /** 当前活动：优先取进行中且在时间窗口内的活动，其次取最新一条 */
  async current() {
    const client = getSupabaseClient();
    const { data: all } = await client.from('vote_config').select('*').order('id', { ascending: true });
    if (!all?.length) return null;
    const now = Date.now();
    const ongoing = all.find(
      (a: any) =>
        a.status === 'ongoing' &&
        (!a.start_time || new Date(a.start_time).getTime() <= now) &&
        (!a.end_time || new Date(a.end_time).getTime() >= now),
    );
    return ongoing || all.find((a: any) => a.status === 'ongoing') || all[all.length - 1];
  }

  /** 投票端活动列表（含当前账号投票权标记） */
  async mine(token?: string) {
    const client = getSupabaseClient();
    const { data: all } = await client
      .from('vote_config')
      .select('*')
      .in('status', ['upcoming', 'ongoing', 'ended'])
      .order('id', { ascending: true });

    const payload = token ? verifyVoterToken(token) : null;
    const employeeNo = payload?.employeeNo || '';

    const result: any[] = [];
    for (const a of all || []) {
      let hasVoteRight = false;
      if (employeeNo) {
        const { data: voter } = await client
          .from('voters')
          .select('id')
          .eq('activity_id', a.id)
          .eq('employee_no', employeeNo)
          .maybeSingle();
        hasVoteRight = !!voter;
      }
      result.push({ ...a, hasVoteRight });
    }
    return result;
  }

  /** 新建活动（复制模板配置，候选人与清单由管理员后续导入/配置） */
  async create(body: Record<string, any>) {
    const client = getSupabaseClient();
    const name = String(body?.activity_name || '').trim();
    if (!name) throw new BadRequestException('活动名称不能为空');

    const { data, error } = await client
      .from('vote_config')
      .insert({
        activity_name: name,
        main_title: body.main_title || name,
        subtitle: body.subtitle || '',
        organizer: body.organizer || '',
        description: body.description || '',
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        min_picks: Number(body.min_picks) || 1,
        max_picks: Number(body.max_picks) || 9,
        candidate_pool_size: Number(body.candidate_pool_size) || 90,
        winner_count: Number(body.winner_count) || 9,
        allow_duplicate: false,
        allow_modify: false,
        anonymous: false,
        realtime_public: false,
        result_publish_time: body.result_publish_time || null,
        candidate_sort: 'code',
        page_size: 20,
        enable_department_filter: true,
        device_vote_limit: 1,
        ip_vote_limit: 50,
        tie_strategy: 'code_asc',
        status: body.status || 'draft',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`新建失败: ${error.message}`);
    return data;
  }

  /** 归档活动 */
  async archive(id: number) {
    const client = getSupabaseClient();
    const { error } = await client
      .from('vote_config')
      .update({ status: 'archived' })
      .eq('id', id);
    if (error) throw new BadRequestException(`归档失败: ${error.message}`);
    return { archived: true, id };
  }

  /** 重置活动投票数据：清空投票明细与提交记录，重置投票人状态 */
  async resetVotes(id: number) {
    const client = getSupabaseClient();
    const { data: voters } = await client.from('voters').select('id').eq('activity_id', id);
    const voterIds = (voters || []).map((v: any) => v.id);
    if (voterIds.length) {
      await client.from('votes').delete().in('voter_id', voterIds);
      await client.from('vote_submissions').delete().in('voter_id', voterIds);
    }
    await client.from('voters').update({ has_voted: false, voted_at: null }).eq('activity_id', id);
    return { reset: true, id };
  }

  /** 切换活动状态（未开始/进行中/已结束） */
  async updateStatus(id: number, status: string) {
    const client = getSupabaseClient();
    const allowed = ['draft', 'upcoming', 'ongoing', 'ended', 'archived'];
    if (!allowed.includes(status)) throw new BadRequestException('非法活动状态');
    const { error } = await client
      .from('vote_config')
      .update({ status })
      .eq('id', id);
    if (error) throw new BadRequestException(`更新失败: ${error.message}`);
    return { id, status };
  }
}
