import { Network } from '@/network';
import { getActivityId } from '@/utils/activity';

interface ApiResponse<T> {
  status: string;
  data: T;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** 活动列表 */
export async function fetchActivities() {
  const res = await Network.request({ url: '/api/activities' });
  console.log('[API] GET /api/activities ->', res.data);
  return res.data as ApiResponse<any[]>;
}

/** 新建活动 */
export async function adminCreateActivity(token: string, body: Record<string, any>) {
  const res = await Network.request({
    url: '/api/activities',
    method: 'POST',
    header: authHeader(token),
    data: body,
  });
  return res.data as ApiResponse<any>;
}

/** 归档活动 */
export async function adminArchiveActivity(token: string, id: number) {
  const res = await Network.request({
    url: `/api/activities/${id}/archive`,
    method: 'POST',
    header: authHeader(token),
  });
  return res.data as ApiResponse<any>;
}

/** 更新活动状态 */
export async function adminUpdateActivityStatus(token: string, id: number, status: string) {
  const res = await Network.request({
    url: `/api/activities/${id}/status`,
    method: 'POST',
    header: authHeader(token),
    data: { status },
  });
  return res.data as ApiResponse<any>;
}

/** 获取图形验证码 */
export async function fetchCaptcha() {
  const res = await Network.request({ url: '/api/admin/captcha', method: 'GET' });
  console.log('[API] GET /api/admin/captcha ->', res.data);
  return res.data as ApiResponse<{ captchaId: string; captchaImage: string }>;
}

/** 管理员登录 */
export async function adminLogin(body: {
  account: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}) {
  const res = await Network.request({
    url: '/api/admin/login',
    method: 'POST',
    data: body,
  });
  console.log('[API] POST /api/admin/login ->', res.data);
  return res.data as ApiResponse<any>;
}

/** 当前管理员信息 */
export async function adminProfile(token: string) {
  const res = await Network.request({
    url: '/api/admin/profile',
    method: 'GET',
    header: authHeader(token),
  });
  return res.data as ApiResponse<any>;
}

/** 数据看板 */
export async function fetchDashboard(token: string, activityId?: number) {
  const res = await Network.request({
    url: '/api/stats/dashboard',
    method: 'GET',
    header: authHeader(token),
    data: { activityId: activityId ?? getActivityId() },
  });
  console.log('[API] GET /api/stats/dashboard ->', res.data);
  return res.data as ApiResponse<any>;
}

/** 新增候选人 */
export async function adminCreateCandidate(token: string, body: Record<string, any>) {
  const res = await Network.request({
    url: '/api/candidates',
    method: 'POST',
    header: authHeader(token),
    data: { ...body, activityId: body.activityId ?? getActivityId() },
  });
  return res.data as ApiResponse<any>;
}

/** 编辑候选人 */
export async function adminUpdateCandidate(token: string, id: string, body: Record<string, any>) {
  const res = await Network.request({
    url: `/api/candidates/${id}`,
    method: 'PUT',
    header: authHeader(token),
    data: { ...body, activityId: body.activityId ?? getActivityId() },
  });
  return res.data as ApiResponse<any>;
}

/** 删除候选人 */
export async function adminDeleteCandidate(token: string, id: string) {
  const res = await Network.request({
    url: `/api/candidates/${id}`,
    method: 'DELETE',
    header: authHeader(token),
    data: { activityId: getActivityId() },
  });
  return res.data as ApiResponse<any>;
}

/** 批量操作候选人 */
export async function adminBatchCandidates(token: string, ids: string[], action: string) {
  const res = await Network.request({
    url: '/api/candidates/batch',
    method: 'POST',
    header: authHeader(token),
    data: { ids, action, activityId: getActivityId() },
  });
  return res.data as ApiResponse<any>;
}

/** 保存规则配置 */
export async function adminSaveConfig(token: string, body: Record<string, any>) {
  const res = await Network.request({
    url: '/api/config',
    method: 'PUT',
    header: authHeader(token),
    data: { ...body, activityId: body.activityId ?? getActivityId() },
  });
  return res.data as ApiResponse<any>;
}

/** 投票记录查询 */
export async function adminVoteRecords(token: string, params: Record<string, any>) {
  const res = await Network.request({
    url: '/api/stats/records',
    method: 'GET',
    header: authHeader(token),
    data: { ...params, activityId: params.activityId ?? getActivityId() },
  });
  return res.data as ApiResponse<any>;
}

/** 上传并解析 Excel（预览） */
export async function adminParseImport(token: string, filePath: string) {
  const res = await Network.uploadFile({
    url: '/api/import/parse',
    filePath,
    name: 'file',
    header: authHeader(token),
    formData: { activityId: String(getActivityId()) },
  });
  console.log('[API] POST /api/import/parse ->', res.data);
  return JSON.parse(res.data) as ApiResponse<any>;
}

/** 确认导入 */
export async function adminCommitImport(token: string, body: Record<string, any>) {
  const res = await Network.request({
    url: '/api/import/commit',
    method: 'POST',
    header: authHeader(token),
    data: { ...body, activityId: body.activityId ?? getActivityId() },
  });
  return res.data as ApiResponse<any>;
}

/** 历史导入批次 */
export async function adminImportBatches(token: string) {
  const res = await Network.request({
    url: '/api/import/batches',
    method: 'GET',
    header: authHeader(token),
  });
  return res.data as ApiResponse<any>;
}

/** 管理员列表 */
export async function adminListAdmins(token: string) {
  const res = await Network.request({
    url: '/api/system/admins',
    method: 'GET',
    header: authHeader(token),
  });
  return res.data as ApiResponse<any>;
}

/** 新增管理员 */
export async function adminCreateAdmin(token: string, body: Record<string, any>) {
  const res = await Network.request({
    url: '/api/system/admins',
    method: 'POST',
    header: authHeader(token),
    data: body,
  });
  return res.data as ApiResponse<any>;
}

/** 更新管理员 */
export async function adminUpdateAdmin(token: string, id: string, body: Record<string, any>) {
  const res = await Network.request({
    url: `/api/system/admins/${id}`,
    method: 'PUT',
    header: authHeader(token),
    data: body,
  });
  return res.data as ApiResponse<any>;
}

/** 删除管理员 */
export async function adminDeleteAdmin(token: string, id: string) {
  const res = await Network.request({
    url: `/api/system/admins/${id}`,
    method: 'DELETE',
    header: authHeader(token),
  });
  return res.data as ApiResponse<any>;
}

/** 操作日志 */
export async function adminLogs(token: string) {
  const res = await Network.request({
    url: '/api/system/logs',
    method: 'GET',
    header: authHeader(token),
  });
  return res.data as ApiResponse<any>;
}

/** 数据重置 / 归档 */
export async function adminArchive(token: string, body: Record<string, any>) {
  const res = await Network.request({
    url: '/api/system/archive',
    method: 'POST',
    header: authHeader(token),
    data: body,
  });
  return res.data as ApiResponse<any>;
}
