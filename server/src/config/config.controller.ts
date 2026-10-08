import { Controller, Get, Put, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { AuthGuard, WritePermissionGuard } from '@/common/auth.guard';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /** GET /api/config —— 投票活动配置 */
  @Get()
  async get() {
    const data = await this.configService.get();
    return { status: 'success', data };
  }

  /** PUT /api/config —— 保存规则配置（立即生效） */
  @Put()
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async update(@Body() body: Record<string, any>) {
    const data = await this.configService.update(body);
    return { status: 'success', data };
  }
}
