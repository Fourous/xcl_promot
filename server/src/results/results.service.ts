import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 结果统计服务：票数聚合、得票率、排名与当选标识 */
@Injectable()
export class ResultsService {
  async rank(activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    const { data: config } = await client.from('vote_config').select('*').eq('id', aid).single();
    if (!config) throw new BadRequestException('投票规则未配置');

    // 结果可见性（递进逻辑）：投票结束禁止查看，到公示时间或开启实时公示才可见
    const now = new Date();
    const published =
      config.realtime_public ||
      (config.result_publish_time && new Date(config.result_publish_time) <= now);
    if (!published) {
      return { published: false, winners: config.winner_count, list: [], votedCount: 0, totalVotes: 0 };
    }

    // 选票明细
    const { data: voteRows } = await client.from('votes').select('candidate_id').eq('activity_id', aid);
    const voteCount: Record<string, number> = {};
    for (const v of voteRows || []) {
      voteCount[v.candidate_id] = (voteCount[v.candidate_id] || 0) + 1;
    }

    // 候选人（仅统计启用中的）
    const { data: candidates } = await client.from('candidates').select('*').eq('activity_id', aid).eq('status', 'active');

    // 已投票人数
    const { count: votedCount } = await client
      .from('voters')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', aid)
      .eq('has_voted', true);

    const totalVotes = (voteRows || []).length;

    const list = (candidates || []).map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      position: c.position,
      votes: voteCount[c.id] || 0,
      rate: totalVotes > 0 ? (voteCount[c.id] || 0) / totalVotes : 0,
    }));

    // 排序：票数降序；同票按编号（或策略）
    list.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return String(a.code).localeCompare(String(b.code));
    });

    const winnerCount = config.winner_count || 9;
    const ranked = list.map((item: any, i: number) => ({
      ...item,
      rank: i + 1,
      isWinner: i < winnerCount,
    }));

    return { published: true, winners: winnerCount, votedCount: votedCount || 0, totalVotes, list: ranked };
  }
}
