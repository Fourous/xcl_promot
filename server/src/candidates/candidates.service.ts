import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 候选人数据结构（与数据库列名保持一致，snake_case） */
export interface Candidate {
  id: string;
  code: string;
  name: string;
  department: string;
  employee_no: string | null;
  position: string | null;
  avatar_url: string | null;
  intro: string | null;
  sort_weight: number;
  status: string;
}

/** 候选人列表查询参数 */
export interface CandidateListQuery {
  page?: number;
  pageSize?: number;
  department?: string;
  keyword?: string;
  status?: string;
  activityId?: number;
}

@Injectable()
export class CandidatesService {
  /**
   * 查询候选人列表（支持分页、部门筛选、姓名/编号搜索）
   */
  async list(query: CandidateListQuery) {
    const client = getSupabaseClient();
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const activityId = Number(query.activityId) || 1;

    // 使用 count: 'exact' 获取总行数（不受 range 影响）
    let builder = client
      .from('candidates')
      .select('*', { count: 'exact' })
      .eq('activity_id', activityId);

    if (query.department) {
      builder = builder.eq('department', query.department);
    }
    if (query.status) {
      builder = builder.eq('status', query.status);
    }
    if (query.keyword) {
      const kw = query.keyword;
      builder = builder.or(`name.ilike.*${kw}*,code.ilike.*${kw}*`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await builder
      .order('code', { ascending: true })
      .range(from, to);

    if (error) throw new Error(`候选人查询失败: ${error.message}`);

    return {
      list: (data as Candidate[]) || [],
      total: count || 0,
      page,
      pageSize,
    };
  }

  /**
   * 获取去重后的部门列表（用于部门筛选）
   */
  async departments(activityId = 1) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('candidates')
      .select('department')
      .eq('activity_id', Number(activityId) || 1)
      .order('department', { ascending: true });

    if (error) throw new Error(`部门查询失败: ${error.message}`);

    const rows = data as { department: string }[];
    const unique = Array.from(new Set(rows.map((r) => r.department)));
    return unique;
  }

  /** 新增候选人（支持从用户池按工号选择，自动带出姓名/部门/岗位） */
  async create(body: any, activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    let name = body.name;
    let department = body.department;
    let position = body.position || null;
    let intro = body.intro || null;

    // 从用户池选择：若提供 employee_no，则校验并带出用户信息
    if (body.employee_no) {
      const { data: user } = await client
        .from('voter_accounts')
        .select('*')
        .eq('employee_no', body.employee_no)
        .maybeSingle();
      if (!user) throw new BadRequestException('该工号不在用户池中，请先在「用户管理」导入');
      name = user.name;
      department = user.department;
      position = user.position || null;
      intro = intro || user.intro || null;
    }

    const { data, error } = await client
      .from('candidates')
      .insert({
        activity_id: aid,
        code: body.code,
        employee_no: body.employee_no || null,
        name,
        department,
        position,
        avatar_url: body.avatar_url || null,
        intro,
        sort_weight: body.sort_weight || 0,
        status: body.status || 'active',
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new BadRequestException('候选人编号已存在');
      throw new BadRequestException(`新增失败: ${error.message}`);
    }
    return data;
  }

  /** 编辑候选人 */
  async update(id: string, body: any, activityId = 1) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('candidates')
      .update({
        code: body.code,
        name: body.name,
        department: body.department,
        position: body.position || null,
        avatar_url: body.avatar_url || null,
        intro: body.intro || null,
        sort_weight: body.sort_weight || 0,
        status: body.status || 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('activity_id', Number(activityId) || 1)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new BadRequestException('候选人编号已存在');
      throw new BadRequestException(`编辑失败: ${error.message}`);
    }
    return data;
  }

  /** 删除候选人 */
  async remove(id: string, activityId = 1) {
    const client = getSupabaseClient();
    const { error } = await client
      .from('candidates')
      .delete()
      .eq('id', id)
      .eq('activity_id', Number(activityId) || 1);
    if (error) throw new BadRequestException(`删除失败: ${error.message}`);
    return { deleted: true };
  }

  /** 批量操作：enable / disable / delete */
  async batchAction(ids: string[], action: string, activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    if (action === 'delete') {
      const { error } = await client
        .from('candidates')
        .delete()
        .in('id', ids)
        .eq('activity_id', aid);
      if (error) throw new BadRequestException(`批量删除失败: ${error.message}`);
      return { deleted: ids.length };
    }
    const status = action === 'enable' ? 'active' : 'disabled';
    const { error } = await client
      .from('candidates')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('activity_id', aid);
    if (error) throw new BadRequestException(`批量操作失败: ${error.message}`);
    return { updated: ids.length };
  }

  /** 批量调整排序权重 */
  async batchSort(items: { id: string; sortWeight: number }[]) {
    const client = getSupabaseClient();
    for (const item of items) {
      await client
        .from('candidates')
        .update({ sort_weight: item.sortWeight, updated_at: new Date().toISOString() })
        .eq('id', item.id);
    }
    return { updated: items.length };
  }

  /** 用户池 + 候选人启用状态（候选人管理页：展示所有用户，标记已启用/未启用） */
  async pool(query: CandidateListQuery) {
    const client = getSupabaseClient();
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const activityId = Number(query.activityId) || 1;

    // 该活动已有候选人的 employee_no -> 状态映射
    const { data: cands } = await client
      .from('candidates')
      .select('id, employee_no, status, code')
      .eq('activity_id', activityId);
    const candMap = new Map<string, any>();
    for (const c of cands || []) {
      if (c.employee_no) candMap.set(c.employee_no, c);
    }

    // 用户池分页 + 搜索
    let builder = client
      .from('voter_accounts')
      .select('employee_no, name, department, position, intro, status', { count: 'exact' });
    if (query.keyword) {
      const kw = query.keyword;
      builder = builder.or(`employee_no.ilike.*${kw}*,name.ilike.*${kw}*`);
    }
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: users, error, count } = await builder
      .order('employee_no', { ascending: true })
      .range(from, to);

    if (error) throw new BadRequestException(`用户池查询失败: ${error.message}`);

    const list = (users || []).map((u: any) => {
      const cand = candMap.get(u.employee_no);
      return {
        ...u,
        isCandidate: !!cand,
        candidateId: cand?.id || null,
        candidateStatus: cand?.status || null,
        candidateCode: cand?.code || null,
      };
    });

    return { list, total: count || 0, page, pageSize };
  }

  /** 批量启用候选人（按工号从用户池批量加入当前活动） */
  async batchEnable(employeeNos: string[], activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    let enabled = 0;
    for (const emp of employeeNos || []) {
      const { data: user } = await client
        .from('voter_accounts')
        .select('*')
        .eq('employee_no', emp)
        .maybeSingle();
      if (!user) continue;

      const { data: existing } = await client
        .from('candidates')
        .select('id, status')
        .eq('activity_id', aid)
        .eq('employee_no', emp)
        .maybeSingle();
      if (existing) {
        if (existing.status !== 'active') {
          await client
            .from('candidates')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          enabled++;
        }
        continue;
      }

      const { error } = await client
        .from('candidates')
        .insert({
          activity_id: aid,
          code: emp,
          employee_no: emp,
          name: user.name,
          department: user.department,
          position: user.position || null,
          intro: user.intro || null,
          sort_weight: 0,
          status: 'active',
        });
      if (!error) enabled++;
    }
    return { enabled };
  }

  /** 批量停用候选人（按工号，仅停用不删除） */
  async batchDisable(employeeNos: string[], activityId = 1) {
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;
    const { error } = await client
      .from('candidates')
      .update({ status: 'disabled', updated_at: new Date().toISOString() })
      .in('employee_no', employeeNos || [])
      .eq('activity_id', aid);
    if (error) throw new BadRequestException(`批量停用失败: ${error.message}`);
    return { disabled: (employeeNos || []).length };
  }
}
