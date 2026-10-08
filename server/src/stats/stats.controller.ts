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
  async dashboard(@Query('activityId') activityId?: string) {
    const data = await this.service.dashboard(Number(activityId) || 1);
    return { status: 'success', data };
  }

  /** 投票记录查询 */
  @Get('records')
  async records(@Query() query: Record<string, any>) {
    const data = await this.service.records(query);
    return { status: 'success', data };
  }

  /** 完整排名（管理端，不受公示限制） */
  @Get('ranking')
  async ranking(@Query('activityId') activityId?: string) {
    const data = await this.service.ranking(Number(activityId) || 1);
    return { status: 'success', data };
  }

  /** 导出评选结果表 */
  @Get('export')
  async export(@Res() res: Response, @Query('activityId') activityId?: string) {
    const buffer = await this.service.exportResult(Number(activityId) || 1);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''result.xlsx");
    res.send(buffer);
  }
}
