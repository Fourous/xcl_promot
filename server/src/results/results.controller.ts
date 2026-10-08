import { Controller, Get, Query } from '@nestjs/common';
import { ResultsService } from './results.service';

/** 结果统计与公示接口 */
@Controller('results')
export class ResultsController {
  constructor(private readonly service: ResultsService) {}

  /** 得票排名（含得票率与当选标识） */
  @Get()
  async rank(@Query('activityId') activityId?: string) {
    const data = await this.service.rank(Number(activityId) || 1);
    return { status: 'success', data };
  }
}
