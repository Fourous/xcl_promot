import { Controller, Get, Query } from '@nestjs/common';
import { CandidatesService } from './candidates.service';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  /** GET /api/candidates —— 候选人列表 */
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('department') department?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.candidatesService.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      department,
      keyword,
      status,
    });
    return { status: 'success', data };
  }

  /** GET /api/candidates/departments —— 部门列表 */
  @Get('departments')
  async departments() {
    const data = await this.candidatesService.departments();
    return { status: 'success', data };
  }
}
