import { BadRequestException, Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 用户池（voter_accounts）管理服务：全局账号，工号唯一 */
@Injectable()
export class UsersService {
  /** 用户列表（分页 + 工号/姓名搜索） */
  async list(keyword?: string, page = 1, pageSize = 20) {
    const client = getSupabaseClient();
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;

    let builder = client.from('voter_accounts').select('*', { count: 'exact' });
    if (keyword) {
      const kw = String(keyword).trim();
      builder = builder.or(`employee_no.ilike.%${kw}%,name.ilike.%${kw}%`);
    }

    const from = (p - 1) * ps;
    const to = from + ps - 1;
    const { data, error, count } = await builder
      .order('employee_no', { ascending: true })
      .range(from, to);

    if (error) throw new BadRequestException(`用户查询失败: ${error.message}`);
    return { list: data || [], total: count || 0, page: p, pageSize: ps };
  }

  /** 重置密码：清空 password_hash，恢复默认密码（工号），登录后需重新改密 */
  async resetPassword(employeeNo: string) {
    const client = getSupabaseClient();
    const emp = String(employeeNo || '').trim();
    if (!emp) throw new BadRequestException('缺少工号');

    const { data: acc } = await client
      .from('voter_accounts')
      .select('id')
      .eq('employee_no', emp)
      .maybeSingle();
    if (!acc) throw new BadRequestException('该工号不在用户池中');

    const { error } = await client
      .from('voter_accounts')
      .update({ password_hash: null, updated_at: new Date().toISOString() })
      .eq('id', acc.id);
    if (error) throw new BadRequestException(`重置失败: ${error.message}`);

    return { reset: true, employeeNo: emp };
  }

  /** 新增单个用户到用户池（工号唯一，默认密码=工号，登录后强制改密） */
  async createUser(dto: {
    employeeNo: string;
    name: string;
    department?: string;
    position?: string;
    intro?: string;
  }) {
    const client = getSupabaseClient();
    const employeeNo = String(dto?.employeeNo || '').trim();
    const name = String(dto?.name || '').trim();
    if (!employeeNo || !name) throw new BadRequestException('工号和姓名不能为空');

    const { data: existing } = await client
      .from('voter_accounts')
      .select('id')
      .eq('employee_no', employeeNo)
      .maybeSingle();
    if (existing) throw new BadRequestException('该工号已存在');

    const { data, error } = await client
      .from('voter_accounts')
      .insert({
        employee_no: employeeNo,
        name,
        department: String(dto?.department || '').trim() || null,
        position: String(dto?.position || '').trim() || null,
        intro: String(dto?.intro || '').trim() || null,
        status: 'active',
        password_hash: null,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(`新增失败: ${error.message}`);

    return data;
  }

  /** 生成用户导入模板（工号 | 姓名 | 部门 | 岗位 | 简介） */
  async template(): Promise<Buffer> {
    const header = ['工号', '姓名', '部门', '岗位', '简介'];
    const examples = [
      ['20250001', '张三', '综合办公室', '主管', '示例：长期从事综合管理工作'],
      ['20250002', '李四', '技术研发部', '工程师', '示例：深耕技术领域'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...examples]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '用户导入模板');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /** Excel 导入用户到用户池（工号唯一，默认密码=工号，登录后强制改密） */
  async importUsers(file: Express.Multer.File, operator = 'unknown', fileName?: string) {
    const buffer = file.buffer || (file.path ? await readFile(file.path) : null);
    if (!buffer) throw new BadRequestException('无法读取文件内容');

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new BadRequestException('文件为空或格式不支持');
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    // 表头：工号 | 姓名 | 部门 | 岗位 | 简介
    const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c ?? '').trim() !== ''));

    const client = getSupabaseClient();
    let imported = 0;
    let skipped = 0;
    const errors: any[] = [];
    const duplicates: any[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const cells = dataRows[i];
      const employeeNo = String(cells[0] ?? '').trim();
      const name = String(cells[1] ?? '').trim();
      const department = String(cells[2] ?? '').trim();
      const position = String(cells[3] ?? '').trim();
      const intro = String(cells[4] ?? '').trim();
      const line = i + 2;

      if (!employeeNo || !name) {
        errors.push({ line, employeeNo, name, reason: '工号或姓名缺失' });
        continue;
      }
      if (seen.has(employeeNo)) {
        errors.push({ line, employeeNo, name, reason: '文件内工号重复' });
        continue;
      }
      seen.add(employeeNo);

      const { data: existing } = await client
        .from('voter_accounts')
        .select('id')
        .eq('employee_no', employeeNo)
        .maybeSingle();
      if (existing) {
        skipped += 1;
        duplicates.push({ line, employeeNo, name, reason: '工号已存在，已跳过' });
        continue;
      }

      const { error } = await client.from('voter_accounts').insert({
        employee_no: employeeNo,
        name,
        department: department || null,
        position: position || null,
        intro: intro || null,
        status: 'active',
        password_hash: null,
      });
      if (error) {
        errors.push({ line, employeeNo, name, reason: error.message });
        continue;
      }
      imported += 1;
    }

    // 记录导入批次
    await client.from('import_batches').insert({
      file_name: fileName || '用户导入.xlsx',
      total_rows: dataRows.length,
      success_rows: imported,
      fail_rows: errors.length + duplicates.length,
      error_detail: [...errors, ...duplicates],
      operator,
    });

    return { imported, skipped, total: dataRows.length, errors, duplicates };
  }

  /** 用户导入历史批次 */
  async importBatches() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new BadRequestException(`查询失败: ${error.message}`);
    return data || [];
  }
}
