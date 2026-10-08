import { Controller, Get } from '@nestjs/common';
import { ResultsService } from './results.service';

/** 结果统计与公示接口 */
@Controller('results')
export class ResultsController {
  constructor(private readonly service: ResultsService) {}

  /** 得票排名（含得票率与当选标识） */
  @Get()
  async rank() {
    const data = await this.service.rank();
    return { status: 'success', data };
  }
}
