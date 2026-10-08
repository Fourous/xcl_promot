import { Injectable } from '@nestjs/common';
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
  /** 获取投票规则配置（单行，id 固定为 1） */
  async get() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('vote_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw new Error(`配置查询失败: ${error.message}`);
    return (data as VoteConfig) || null;
  }
}
