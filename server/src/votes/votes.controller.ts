import { Controller, Post, Body, Get, Query, HttpCode, UseGuards, BadRequestException } from '@nestjs/common';
import { VotesService } from './votes.service';
import { RateLimitGuard } from '@/common/rate-limit.guard';

/** 投票提交与查询接口 */
@Controller('votes')
export class VotesController {
  constructor(private readonly service: VotesService) {}

  /** 提交投票（服务端强校验 + 幂等 + 唯一约束） */
  @Post()
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  async submit(@Body() body: Record<string, any>) {
    const data = await this.service.submit(body);
    return { status: 'success', data };
  }

  /** 我的投票记录 */
  @Get('mine')
  async mine(@Query('openid') openid: string, @Query('activityId') activityId?: string) {
    if (!openid) throw new BadRequestException('缺少 openid');
    const data = await this.service.mine(openid, Number(activityId) || 1);
    return { status: 'success', data };
  }
}
