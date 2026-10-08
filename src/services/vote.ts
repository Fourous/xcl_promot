import { Network } from '@/network';

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

/** 获取活动配置 */
export async function fetchConfig(): Promise<VoteConfig> {
  const res = await Network.request({ url: '/api/config' });
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
}): Promise<CandidatePage> {
  const res = await Network.request({
    url: '/api/candidates',
    method: 'GET',
    data: params,
  });
  console.log('[API] GET /api/candidates ->', res.data);
  return (res.data as ApiResponse<CandidatePage>).data;
}

/** 获取部门列表 */
export async function fetchDepartments(): Promise<string[]> {
  const res = await Network.request({ url: '/api/candidates/departments' });
  console.log('[API] GET /api/candidates/departments ->', res.data);
  return (res.data as ApiResponse<string[]>).data;
}

/** 投票人登录（code -> openid） */
export async function voterLogin(code: string): Promise<{ openid: string }> {
  const res = await Network.request({
    url: '/api/vote-auth/login',
    method: 'POST',
    data: { code },
  });
  console.log('[API] POST /api/vote-auth/login ->', res.data);
  return (res.data as ApiResponse<{ openid: string }>).data;
}

/** 工号/姓名校验（可选） */
export async function verifyVoter(body: {
  openid: string;
  employeeNo?: string;
  name?: string;
}) {
  const res = await Network.request({
    url: '/api/vote-auth/verify',
    method: 'POST',
    data: body,
  });
  console.log('[API] POST /api/vote-auth/verify ->', res.data);
  return res.data as ApiResponse<any>;
}

/** 提交投票 */
export async function submitVote(body: {
  openid: string;
  candidateIds: string[];
  idempotencyToken: string;
}) {
  const res = await Network.request({
    url: '/api/votes',
    method: 'POST',
    data: body,
  });
  console.log('[API] POST /api/votes ->', res.data);
  return res.data as ApiResponse<any>;
}

/** 我的投票记录 */
export async function fetchMyVote(openid: string) {
  const res = await Network.request({
    url: '/api/votes/mine',
    method: 'GET',
    data: { openid },
  });
  console.log('[API] GET /api/votes/mine ->', res.data);
  return res.data as ApiResponse<any>;
}

/** 结果排名 */
export async function fetchResults() {
  const res = await Network.request({ url: '/api/results' });
  console.log('[API] GET /api/results ->', res.data);
  return res.data as ApiResponse<any>;
}
