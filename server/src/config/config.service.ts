import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 投票规则配置 */
export interface VoteConfig {
  id: number;
  activity_name: string;
  main_title: string;
  subtitle: string;
  organizer: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  min_picks: number;
  max_picks: number;
  candidate_pool_size: number;
  winner_count: number;
  allow_duplicate: boolean;
  allow_modify: boolean;
  anonymous: boolean;
  realtime_public: boolean;
  result_publish_time: string | null;
  candidate_sort: string;
  page_size: number;
  enable_department_filter: boolean;
  device_vote_limit: number;
  ip_vote_limit: number;
  tie_strategy: string;
  status: string;
}

@Injectable()
export class ConfigService {
  /** 获取投票规则配置（按活动 id），候选池总数动态计算为已启用候选人数量 */
  async get(activityId = 1) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('vote_config')
      .select('*')
      .eq('id', activityId)
      .maybeSingle();

    if (error) throw new Error(`配置查询失败: ${error.message}`);
    if (!data) return null;

    // 候选池总数 = 当前活动已启用候选人数量（动态计算，不可手动修改）
    const { count } = await client
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activityId)
      .eq('status', 'active');

    return { ...data, candidate_pool_size: count || 0 } as VoteConfig;
  }

  /** 保存投票规则配置（立即生效，保存前完整性校验） */
  async update(activityId: number, body: any) {
    const client = getSupabaseClient();
    // 候选池总数 = 当前活动已启用候选人数量（动态计算）
    const { count: poolSize } = await client
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activityId)
      .eq('status', 'active');
    const pool = poolSize || 0;

    if (body.min_picks != null && body.max_picks != null && body.min_picks > body.max_picks) {
      throw new BadRequestException('最少可选人数不能大于最多可选人数');
    }
    if (body.min_picks != null && body.min_picks > pool) {
      throw new BadRequestException(`最少可选人数不能超过候选池总数（当前 ${pool} 人）`);
    }
    if (body.max_picks != null && body.max_picks > pool) {
      throw new BadRequestException(`最多可选人数不能超过候选池总数（当前 ${pool} 人）`);
    }
    if (body.winner_count != null && body.winner_count > pool) {
      throw new BadRequestException(`最终当选名额不能超过候选池总数（当前 ${pool} 人）`);
    }
    if (body.start_time && body.end_time && new Date(body.start_time) >= new Date(body.end_time)) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const { data, error } = await client
      .from('vote_config')
      .update({
        activity_name: body.activity_name,
        main_title: body.main_title,
        subtitle: body.subtitle,
        organizer: body.organizer,
        description: body.description,
        start_time: body.start_time,
        end_time: body.end_time,
        min_picks: body.min_picks,
        max_picks: body.max_picks,
        winner_count: body.winner_count,
        allow_duplicate: body.allow_duplicate,
        allow_modify: body.allow_modify,
        anonymous: body.anonymous,
        realtime_public: body.realtime_public,
        result_publish_time: body.result_publish_time,
        candidate_sort: body.candidate_sort,
        page_size: body.page_size,
        enable_department_filter: body.enable_department_filter,
        device_vote_limit: body.device_vote_limit,
        ip_vote_limit: body.ip_vote_limit,
        tie_strategy: body.tie_strategy,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .select()
      .single();
    if (error) throw new BadRequestException(`配置保存失败: ${error.message}`);
    return data;
  }
}
