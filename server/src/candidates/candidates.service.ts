import { BadRequestException, Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 候选人数据结构（与数据库列名保持一致，snake_case） */
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

/** 候选人列表查询参数 */
export interface CandidateListQuery {
  page?: number;
  pageSize?: number;
  department?: string;
  keyword?: string;
  status?: string;
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

    // 使用 count: 'exact' 获取总行数（不受 range 影响）
    let builder = client
      .from('candidates')
      .select('*', { count: 'exact' });

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
  async departments() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('candidates')
      .select('department')
      .order('department', { ascending: true });

    if (error) throw new Error(`部门查询失败: ${error.message}`);

    const rows = data as { department: string }[];
    const unique = Array.from(new Set(rows.map((r) => r.department)));
    return unique;
  }

  /** 新增候选人 */
  async create(body: any) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('candidates')
      .insert({
        code: body.code,
        name: body.name,
        department: body.department,
        position: body.position || null,
        avatar_url: body.avatar_url || null,
        intro: body.intro || null,
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
  async update(id: string, body: any) {
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
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new BadRequestException('候选人编号已存在');
      throw new BadRequestException(`编辑失败: ${error.message}`);
    }
    return data;
  }

  /** 删除候选人 */
  async remove(id: string) {
    const client = getSupabaseClient();
    const { error } = await client.from('candidates').delete().eq('id', id);
    if (error) throw new BadRequestException(`删除失败: ${error.message}`);
    return { deleted: true };
  }

  /** 批量操作：enable / disable / delete */
  async batchAction(ids: string[], action: string) {
    const client = getSupabaseClient();
    if (action === 'delete') {
      const { error } = await client.from('candidates').delete().in('id', ids);
      if (error) throw new BadRequestException(`批量删除失败: ${error.message}`);
      return { deleted: ids.length };
    }
    const status = action === 'enable' ? 'active' : 'disabled';
    const { error } = await client
      .from('candidates')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids);
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
}
