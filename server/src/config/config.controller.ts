import { Controller, Get, Put, Body, Query, HttpCode, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { AuthGuard, WritePermissionGuard } from '@/common/auth.guard';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /** GET /api/config —— 投票活动配置（按 activityId） */
  @Get()
  async get(@Query('activityId') activityId?: string) {
    const data = await this.configService.get(Number(activityId) || 1);
    return { status: 'success', data };
  }

  /** PUT /api/config —— 保存规则配置（立即生效） */
  @Put()
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async update(@Body() body: Record<string, any>, @Query('activityId') activityId?: string) {
    const data = await this.configService.update(Number(activityId) || 1, body);
    return { status: 'success', data };
  }
}
