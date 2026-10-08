import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 数据看板、投票记录、结果导出 */
@Injectable()
export class StatsService {
  /** 数据看板：核心指标 + 实时排名前9 + 趋势 + 部门参与度 */
  async dashboard(activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;

    const [{ count: totalCandidates }, { count: votedCount }, { count: totalVotes }, { data: config }] =
      await Promise.all([
        client.from('candidates').select('*', { count: 'exact', head: true }).eq('activity_id', aid),
        client.from('voters').select('*', { count: 'exact', head: true }).eq('activity_id', aid).eq('has_voted', true),
        client.from('votes').select('*', { count: 'exact', head: true }).eq('activity_id', aid),
        client.from('vote_config').select('*').eq('id', aid).maybeSingle(),
      ]);

    // 排名（全部候选人按票数降序）
    const [{ data: votes }, { data: candidates }] = await Promise.all([
      client.from('votes').select('candidate_id').eq('activity_id', aid),
      client.from('candidates').select('*').eq('activity_id', aid),
    ]);
    const voteMap = new Map<string, number>();
    for (const v of votes || []) {
      voteMap.set(v.candidate_id, (voteMap.get(v.candidate_id) || 0) + 1);
    }
    const total = votes?.length || 0;
    const ranking = (candidates || [])
      .map((c) => ({ ...c, votes: voteMap.get(c.id) || 0 }))
      .sort((a, b) => b.votes - a.votes || String(a.code).localeCompare(String(b.code)))
      .map((r, i) => ({
        rank: i + 1,
        id: r.id,
        code: r.code,
        name: r.name,
        department: r.department,
        votes: r.votes,
        rate: total ? Number(((r.votes / total) * 100).toFixed(1)) : 0,
      }));

    const top9 = ranking.slice(0, 9);

    // 投票趋势（按天）
    const { data: submissions } = await client.from('vote_submissions').select('submitted_at').eq('activity_id', aid);
    const trendMap = new Map<string, number>();
    for (const s of submissions || []) {
      const day = String(s.submitted_at || '').slice(0, 10);
      if (day) trendMap.set(day, (trendMap.get(day) || 0) + 1);
    }
    const trend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 部门参与度（已投票人按部门）
    const { data: voters } = await client.from('voters').select('department').eq('activity_id', aid).eq('has_voted', true);
    const deptMap = new Map<string, number>();
    for (const v of voters || []) {
      const d = v.department || '未知部门';
      deptMap.set(d, (deptMap.get(d) || 0) + 1);
    }
    const departmentStats = Array.from(deptMap.entries()).map(([department, count]) => ({ department, count }));

    return {
      totalCandidates: totalCandidates || 0,
      votedCount: votedCount || 0,
      voteRate: totalCandidates ? Number((((votedCount || 0) / totalCandidates) * 100).toFixed(1)) : 0,
      totalVotes: totalVotes || 0,
      remainingSeconds: config?.end_time
        ? Math.max(0, Math.floor((new Date(config.end_time).getTime() - Date.now()) / 1000))
        : 0,
      status: config?.status || 'ongoing',
      top9,
      trend,
      departmentStats,
    };
  }

  /** 投票记录查询（多条件筛选） */
  async records(query: Record<string, any>) {
    const client = getSupabaseClient();
    const aid = Number(query.activityId) || 1;
    let builder = client.from('votes').select(
      'id, candidate_id, voter_id, created_at, candidates(code,name,department), voters(name,employee_no,department)',
    ).eq('activity_id', aid);

    if (query.department) {
      const { data: cands } = await client.from('candidates').select('id').eq('activity_id', aid).eq('department', query.department);
      const ids = (cands || []).map((c) => c.id);
      if (ids.length) builder = builder.in('candidate_id', ids);
      else builder = builder.eq('candidate_id', '__none__');
    }
    if (query.candidateId) builder = builder.eq('candidate_id', query.candidateId);
    if (query.startTime) builder = builder.gte('created_at', query.startTime);
    if (query.endTime) builder = builder.lte('created_at', query.endTime);

    const { data, error } = await builder.order('created_at', { ascending: false }).limit(500);
    if (error) throw new BadRequestException(`查询失败: ${error.message}`);
    return data || [];
  }

  /** 完整排名（管理端，不受公示限制） */
  async ranking(activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    const [{ data: config }, { data: votes }, { data: candidates }, { count: votedCount }] = await Promise.all([
      client.from('vote_config').select('*').eq('id', aid).maybeSingle(),
      client.from('votes').select('candidate_id').eq('activity_id', aid),
      client.from('candidates').select('*').eq('activity_id', aid),
      client.from('voters').select('*', { count: 'exact', head: true }).eq('activity_id', aid).eq('has_voted', true),
    ]);
    const winnerCount = config?.winner_count || 9;
    const voteMap = new Map<string, number>();
    for (const v of votes || []) voteMap.set(v.candidate_id, (voteMap.get(v.candidate_id) || 0) + 1);
    const total = votes?.length || 0;

    const list = (candidates || [])
      .map((c) => ({ ...c, votes: voteMap.get(c.id) || 0 }))
      .sort((a, b) => b.votes - a.votes || String(a.code).localeCompare(String(b.code)))
      .map((r, i) => ({
        rank: i + 1,
        id: r.id,
        code: r.code,
        name: r.name,
        department: r.department,
        position: r.position,
        votes: r.votes,
        rate: total ? Number((r.votes / total).toFixed(4)) : 0,
        isWinner: i < winnerCount,
      }));

    return {
      activityName: config?.activity_name || '',
      winners: winnerCount,
      votedCount: votedCount || 0,
      totalVotes: total,
      list,
    };
  }

  /** 导出评选结果表 */
  async exportResult(activityId = 1): Promise<Buffer> {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    const [{ data: config }, { data: votes }, { data: candidates }] = await Promise.all([
      client.from('vote_config').select('*').eq('id', aid).maybeSingle(),
      client.from('votes').select('candidate_id').eq('activity_id', aid),
      client.from('candidates').select('*').eq('activity_id', aid),
    ]);
    const winnerCount = config?.winner_count || 9;
    const voteMap = new Map<string, number>();
    for (const v of votes || []) voteMap.set(v.candidate_id, (voteMap.get(v.candidate_id) || 0) + 1);
    const total = votes?.length || 0;

    const ranking = (candidates || [])
      .map((c) => ({ ...c, votes: voteMap.get(c.id) || 0 }))
      .sort((a, b) => b.votes - a.votes || String(a.code).localeCompare(String(b.code)))
      .map((r, i) => ({
        rank: i + 1,
        code: r.code,
        name: r.name,
        department: r.department,
        votes: r.votes,
        rate: total ? Number(((r.votes / total) * 100).toFixed(1)) : 0,
        elected: i < winnerCount ? '是' : '否',
      }));

    const header = ['排名', '编号', '姓名', '部门', '票数', '得票率(%)', '是否当选'];
    const rows = ranking.map((r) => [r.rank, r.code, r.name, r.department, r.votes, r.rate, r.elected]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '评选结果');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
