import { BadRequestException, Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** Excel 批量导入服务：模板生成、解析校验、事务导入、错误导出 */
@Injectable()
export class ImportService {
  /** 生成导入模板（表头 + 2 行示例） */
  async template(): Promise<Buffer> {
    const header = ['编号', '姓名', '部门', '岗位', '简介', '头像文件名'];
    const examples = [
      ['001', '张三', '综合办公室', '主管', '长期从事综合管理工作，业绩突出。', 'avatar_001.jpg'],
      ['002', '李四', '技术研发部', '工程师', '深耕技术领域，多次牵头重点项目。', 'avatar_002.jpg'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...examples]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '候选人导入模板');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /** 解析并校验上传文件（返回校验预览，不落库） */
  async parse(file: Express.Multer.File, activityId = 1) {
    const buffer = file.buffer || (file.path ? await readFile(file.path) : null);
    if (!buffer) throw new BadRequestException('无法读取文件内容');
    const aid = Number(activityId) || 1;

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new BadRequestException('文件为空或格式不支持');
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c ?? '').trim() !== ''));

    const client = getSupabaseClient();
    const { data: existing } = await client.from('candidates').select('code,name,department').eq('activity_id', aid);
    const existingCodes = new Set((existing || []).map((e: any) => String(e.code).trim()));
    const existingNameDept = new Set((existing || []).map((e: any) => `${e.department}:${e.name}`));

    const results: any[] = [];
    const errors: any[] = [];
    const warnings: any[] = [];
    const fileCodes = new Set<string>();
    const fileNames = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const cells = dataRows[i];
      const code = String(cells[0] ?? '').trim();
      const name = String(cells[1] ?? '').trim();
      const department = String(cells[2] ?? '').trim();
      const position = String(cells[3] ?? '').trim();
      const intro = String(cells[4] ?? '').trim();
      const avatar = String(cells[5] ?? '').trim();
      const line = i + 2;
      const rowErrors: string[] = [];

      if (!code) rowErrors.push('编号缺失');
      if (!name) rowErrors.push('姓名缺失');
      if (!department) rowErrors.push('部门缺失');
      if (code && !/^\d{3}$/.test(code)) rowErrors.push('编号须为3位数字');
      if (code && /[^0-9]/.test(code)) rowErrors.push('编号含非法字符');
      if (code && existingCodes.has(code)) rowErrors.push('编号与库内已有数据重复');
      if (code && fileCodes.has(code)) rowErrors.push('文件内编号重复');
      if (name && name.length > 50) rowErrors.push('姓名超过50字');
      if (department && department.length > 100) rowErrors.push('部门超过100字');
      if (intro && intro.length > 200) rowErrors.push('简介超过200字');

      if (code) fileCodes.add(code);

      if (rowErrors.length) {
        errors.push({ line, code, name, department, errors: rowErrors });
      } else {
        const nameDeptKey = `${department}:${name}`;
        if (existingNameDept.has(nameDeptKey) || fileNames.has(nameDeptKey)) {
          warnings.push({ line, code, name, department, warning: '同部门同名，请确认' });
        }
        fileNames.add(nameDeptKey);
        results.push({
          code,
          name,
          department,
          position: position || null,
          intro: intro || null,
          avatar: avatar || null,
        });
      }
    }

    return {
      total: dataRows.length,
      success: results.length,
      fail: errors.length,
      results,
      errors,
      warnings,
    };
  }

  /** 确认导入（追加/覆盖） */
  async commit(body: any, operator: string, activityId = 1) {
    const { mode, rows, errors, fileName } = body || {};
    if (!rows?.length) throw new BadRequestException('无可导入数据');
    const client = getSupabaseClient();
    const aid = Number(activityId) || 1;

    if (mode === 'overwrite') {
      const { error: delErr } = await client
        .from('candidates')
        .delete()
        .eq('activity_id', aid);
      if (delErr) throw new BadRequestException(`清空失败: ${delErr.message}`);
    }

    const insertRows = rows.map((r: any) => ({
      activity_id: aid,
      code: r.code,
      name: r.name,
      department: r.department,
      position: r.position || null,
      intro: r.intro || null,
      avatar_url: null,
      sort_weight: 0,
      status: 'active',
    }));

    const { data, error } = await client.from('candidates').insert(insertRows).select('id');
    if (error) throw new BadRequestException(`导入失败: ${error.message}`);

    await client.from('import_batches').insert({
      file_name: fileName || 'unknown.xlsx',
      total_rows: rows.length,
      success_rows: data?.length || 0,
      fail_rows: (errors || []).length,
      error_detail: errors || null,
      operator,
    });

    return { imported: data?.length || 0, mode };
  }

  /** 历史导入批次 */
  async batches() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new BadRequestException(`查询失败: ${error.message}`);
    return data || [];
  }

  /** 导出错误明细 */
  async exportErrors(id: string) {
    const client = getSupabaseClient();
    const { data: batch } = await client.from('import_batches').select('*').eq('id', id).maybeSingle();
    const errors = (batch?.error_detail || []) as any[];
    const header = ['行号', '编号', '姓名', '部门', '错误原因'];
    const rows = errors.map((e: any) => [e.line, e.code, e.name, e.department, (e.errors || []).join('；')]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '错误明细');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
