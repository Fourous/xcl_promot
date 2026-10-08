import { Controller, Get } from '@nestjs/common';
import { ConfigService } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /** GET /api/config —— 投票活动配置 */
  @Get()
  async get() {
    const data = await this.configService.get();
    return { status: 'success', data };
  }
}
