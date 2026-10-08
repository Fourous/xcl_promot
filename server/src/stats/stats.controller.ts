import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { StatsService } from './stats.service';
import { AuthGuard } from '@/common/auth.guard';

/** 数据看板 + 投票记录 + 结果导出 */
@Controller('stats')
@UseGuards(AuthGuard)
export class StatsController {
  constructor(private readonly service: StatsService) {}

  /** 数据看板 */
  @Get('dashboard')
  async dashboard() {
    const data = await this.service.dashboard();
    return { status: 'success', data };
  }

  /** 投票记录查询 */
  @Get('records')
  async records(@Query() query: Record<string, any>) {
    const data = await this.service.records(query);
    return { status: 'success', data };
  }

  /** 导出评选结果表 */
  @Get('export')
  async export(@Res() res: Response) {
    const buffer = await this.service.exportResult();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''result.xlsx");
    res.send(buffer);
  }
}
