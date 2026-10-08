import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyVoterToken } from '@/common/token.util';

interface SubmitBody {
  token: string;
  candidateIds: string[];
  idempotencyToken: string;
  ip?: string;
  deviceFingerprint?: string;
}

/** 投票提交服务：时间窗口、票数区间、候选人状态、幂等、唯一约束全服务端校验 */
@Injectable()
export class VotesService {
  async submit(body: any) {
    const client = getSupabaseClient();
    const { token, candidateIds, idempotencyToken } = body || ({} as SubmitBody);
    if (!token || !candidateIds?.length || !idempotencyToken) {
      throw new BadRequestException('参数不完整');
    }
    const activityId = Number(body.activityId) || 1;

    // 0. 投票人令牌校验（账号密码登录后签发）
    const voterPayload = verifyVoterToken(token);
    if (!voterPayload) throw new BadRequestException('登录已过期，请重新登录');

    // 1. 读取规则配置
    const { data: config } = await client.from('vote_config').select('*').eq('id', activityId).single();
    if (!config) throw new BadRequestException('投票规则未配置');

    // 2. 服务端时间窗口校验
    const now = new Date();
    if (config.start_time && new Date(config.start_time) > now) {
      throw new BadRequestException('活动尚未开始');
    }
    if (config.end_time && new Date(config.end_time) < now) {
      throw new BadRequestException('活动已结束');
    }

    // 3. 票数区间校验
    if (candidateIds.length < config.min_picks || candidateIds.length > config.max_picks) {
      throw new BadRequestException(`请选择 ${config.min_picks}~${config.max_picks} 名候选人`);
    }

    // 4. 重复投同一人校验
    if (!config.allow_duplicate && new Set(candidateIds).size !== candidateIds.length) {
      throw new BadRequestException('不允许重复投给同一候选人');
    }

    // 5. 候选人状态校验
    const { data: candidates } = await client
      .from('candidates')
      .select('id,status')
      .eq('activity_id', activityId)
      .in('id', candidateIds);
    if (!candidates || candidates.length !== candidateIds.length) {
      throw new BadRequestException('存在无效候选人');
    }
    if (candidates.some((c: any) => c.status !== 'active')) {
      throw new BadRequestException('存在已停用或淘汰的候选人');
    }

    // 6. 幂等检查：同一 token 已提交则直接返回成功（网络重试场景）
    const { data: existingSub } = await client
      .from('vote_submissions')
      .select('id')
      .eq('activity_id', activityId)
      .eq('idempotency_token', idempotencyToken)
      .maybeSingle();
    if (existingSub) {
      return { submitted: true, alreadySubmitted: true, picks: candidateIds.length };
    }

    // 7. 投票人校验（按账号工号校验，一人一轮一票）
    const { data: voter } = await client
      .from('voters')
      .select('*')
      .eq('activity_id', activityId)
      .eq('employee_no', voterPayload.employeeNo)
      .maybeSingle();
    if (!voter) throw new BadRequestException('您无此活动的投票权');
    if (voter.has_voted) throw new BadRequestException('您已投过票');

    // 8. 插入提交记录（voter_id、token 均有唯一约束，数据库层兜底并发）
    const { data: submission, error: subErr } = await client
      .from('vote_submissions')
      .insert({
        activity_id: activityId,
        voter_id: voter.id,
        idempotency_token: idempotencyToken,
        ip: body.ip || null,
        device_fingerprint: body.deviceFingerprint || null,
        picks_count: candidateIds.length,
      })
      .select()
      .single();
    if (subErr) {
      if (subErr.code === '23505') throw new BadRequestException('请勿重复提交投票');
      throw new BadRequestException(`提交失败: ${subErr.message}`);
    }

    // 9. 写入选票明细（匿名时 voter_id 置空，仅统计票数）
    const voteRows = candidateIds.map((cid) => ({
      activity_id: activityId,
      submission_id: submission.id,
      voter_id: config.anonymous ? null : voter.id,
      candidate_id: cid,
    }));
    const { error: votesErr } = await client.from('votes').insert(voteRows);
    if (votesErr) {
      await client.from('vote_submissions').delete().eq('id', submission.id);
      throw new BadRequestException(`记录选票失败: ${votesErr.message}`);
    }

    // 10. 更新投票人状态
    const { error: voterErr } = await client
      .from('voters')
      .update({ has_voted: true, voted_at: new Date().toISOString() })
      .eq('id', voter.id);
    if (voterErr) {
      await client.from('votes').delete().eq('submission_id', submission.id);
      await client.from('vote_submissions').delete().eq('id', submission.id);
      throw new BadRequestException(`更新投票状态失败: ${voterErr.message}`);
    }

    return { submitted: true, alreadySubmitted: false, picks: candidateIds.length };
  }

  /** 我的投票记录（匿名模式不返回具体对象） */
  async mine(token: string, activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    const payload = verifyVoterToken(token);
    if (!payload) throw new BadRequestException('登录已过期，请重新登录');
    const { data: config } = await client.from('vote_config').select('anonymous').eq('id', aid).single();
    const { data: voter } = await client
      .from('voters')
      .select('id,has_voted,voted_at')
      .eq('activity_id', aid)
      .eq('employee_no', payload.employeeNo)
      .maybeSingle();

    if (!voter || !voter.has_voted) {
      return { hasVoted: false, votedAt: null, anonymous: !!config?.anonymous, picks: [] };
    }
    if (config?.anonymous) {
      return { hasVoted: true, votedAt: voter.voted_at, anonymous: true, picks: [] };
    }
    const { data: votes } = await client
      .from('votes')
      .select('candidate_id, candidates(code,name,department,position)')
      .eq('activity_id', aid)
      .eq('voter_id', voter.id);
    return { hasVoted: true, votedAt: voter.voted_at, anonymous: false, picks: votes || [] };
  }
}
