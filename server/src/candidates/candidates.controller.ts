import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { AuthGuard, WritePermissionGuard } from '@/common/auth.guard';

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
    @Query('activityId') activityId?: string,
  ) {
    const data = await this.candidatesService.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      department,
      keyword,
      status,
      activityId: Number(activityId) || 1,
    });
    return { status: 'success', data };
  }

  /** GET /api/candidates/departments —— 部门列表 */
  @Get('departments')
  async departments(@Query('activityId') activityId?: string) {
    const data = await this.candidatesService.departments(Number(activityId) || 1);
    return { status: 'success', data };
  }

  /** GET /api/candidates/pool —— 用户池 + 候选人启用状态 */
  @Get('pool')
  async pool(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('activityId') activityId?: string,
  ) {
    const data = await this.candidatesService.pool({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      keyword,
      activityId: Number(activityId) || 1,
    });
    return { status: 'success', data };
  }

  /** POST /api/candidates/pool-toggle —— 按工号批量启用/停用候选人 */
  @Post('pool-toggle')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async poolToggle(@Body() body: Record<string, any>) {
    const action = body.action === 'enable' ? 'enable' : 'disable';
    const data =
      action === 'enable'
        ? await this.candidatesService.batchEnable(body.employeeNos, body.activityId)
        : await this.candidatesService.batchDisable(body.employeeNos, body.activityId);
    return { status: 'success', data };
  }

  /** POST /api/candidates —— 新增候选人 */
  @Post()
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async create(@Body() body: Record<string, any>) {
    const data = await this.candidatesService.create(body, body.activityId);
    return { status: 'success', data };
  }

  /** POST /api/candidates/batch —— 批量操作 */
  @Post('batch')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async batch(@Body() body: Record<string, any>) {
    const data = await this.candidatesService.batchAction(body.ids, body.action, body.activityId);
    return { status: 'success', data };
  }

  /** POST /api/candidates/batch-sort —— 批量排序 */
  @Post('batch-sort')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async batchSort(@Body() body: Record<string, any>) {
    const data = await this.candidatesService.batchSort(body.items);
    return { status: 'success', data };
  }

  /** PUT /api/candidates/:id —— 编辑候选人 */
  @Put(':id')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.candidatesService.update(id, body, body.activityId);
    return { status: 'success', data };
  }

  /** DELETE /api/candidates/:id —— 删除候选人 */
  @Delete(':id')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async remove(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.candidatesService.remove(id, body?.activityId);
    return { status: 'success', data };
  }
}
