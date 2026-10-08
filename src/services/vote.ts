import { Network } from '@/network';
import { getActivityId } from '@/utils/activity';

/** 候选人 */
export interface Candidate {
  id: string;
  code: string;
  name: string;
  department: string;
  position: string | null;
  avatar_url: string | null;
  intro: string | null;
  sort_weight: number;
  status: string;
}

/** 投票活动配置 */
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

/** 统一响应包裹 */
interface ApiResponse<T> {
  status: string;
  data: T;
}

/** 候选人分页结果 */
export interface CandidatePage {
  list: Candidate[];
  total: number;
  page: number;
  pageSize: number;
}

/** 获取活动列表 */
export async function fetchActivities(): Promise<VoteConfig[]> {
  const res = await Network.request({ url: '/api/activities' });
  console.log('[API] GET /api/activities ->', res.data);
  return (res.data as ApiResponse<VoteConfig[]>).data;
}

/** 获取当前活动（投票端入口） */
export async function fetchCurrentActivity(): Promise<VoteConfig | null> {
  const res = await Network.request({ url: '/api/activities/current' });
  console.log('[API] GET /api/activities/current ->', res.data);
  return (res.data as ApiResponse<VoteConfig | null>).data;
}

/** 获取活动配置 */
export async function fetchConfig(activityId?: number): Promise<VoteConfig> {
  const aid = activityId ?? getActivityId();
  const res = await Network.request({ url: '/api/config', data: { activityId: aid } });
  console.log('[API] GET /api/config ->', res.data);
  return (res.data as ApiResponse<VoteConfig>).data;
}

/** 获取候选人分页列表 */
export async function fetchCandidates(params: {
  page?: number;
  pageSize?: number;
  department?: string;
  keyword?: string;
  status?: string;
  activityId?: number;
}): Promise<CandidatePage> {
  const res = await Network.request({
    url: '/api/candidates',
    method: 'GET',
    data: { ...params, activityId: params.activityId ?? getActivityId() },
  });
  console.log('[API] GET /api/candidates ->', res.data);
  return (res.data as ApiResponse<CandidatePage>).data;
}

/** 获取部门列表 */
export async function fetchDepartments(activityId?: number): Promise<string[]> {
  const res = await Network.request({
    url: '/api/candidates/departments',
    data: { activityId: activityId ?? getActivityId() },
  });
  console.log('[API] GET /api/candidates/departments ->', res.data);
  return (res.data as ApiResponse<string[]>).data;
}

/** 投票人登录（code -> openid） */
export async function voterLogin(code: string, activityId?: number): Promise<{ openid: string }> {
  const res = await Network.request({
    url: '/api/vote-auth/login',
    method: 'POST',
    data: { code, activityId: activityId ?? getActivityId() },
  });
  console.log('[API] POST /api/vote-auth/login ->', res.data);
  return (res.data as ApiResponse<{ openid: string }>).data;
}

/** 工号/姓名校验 */
export async function verifyVoter(body: {
  openid: string;
  employeeNo?: string;
  name?: string;
  activityId?: number;
}) {
  const res = await Network.request({
    url: '/api/vote-auth/verify',
    method: 'POST',
    data: { ...body, activityId: body.activityId ?? getActivityId() },
  });
  console.log('[API] POST /api/vote-auth/verify ->', res.data);
  return res.data as ApiResponse<any>;
}

/** 提交投票 */
export async function submitVote(body: {
  openid: string;
  candidateIds: string[];
  idempotencyToken: string;
  activityId?: number;
}) {
  const res = await Network.request({
    url: '/api/votes',
    method: 'POST',
    data: { ...body, activityId: body.activityId ?? getActivityId() },
  });
  console.log('[API] POST /api/votes ->', res.data);
  return res.data as ApiResponse<any>;
}

/** 我的投票记录 */
export async function fetchMyVote(openid: string, activityId?: number) {
  const res = await Network.request({
    url: '/api/votes/mine',
    method: 'GET',
    data: { openid, activityId: activityId ?? getActivityId() },
  });
  console.log('[API] GET /api/votes/mine ->', res.data);
  return res.data as ApiResponse<any>;
}

/** 结果排名 */
export async function fetchResults(activityId?: number) {
  const res = await Network.request({
    url: '/api/results',
    data: { activityId: activityId ?? getActivityId() },
  });
  console.log('[API] GET /api/results ->', res.data);
  return res.data as ApiResponse<any>;
}
