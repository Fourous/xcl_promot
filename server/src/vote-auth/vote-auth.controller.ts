import { Controller, Post, Body, HttpCode, BadRequestException } from '@nestjs/common';
import { VoteAuthService } from './vote-auth.service';

/** 投票端身份识别接口 */
@Controller('vote-auth')
export class VoteAuthController {
  constructor(private readonly service: VoteAuthService) {}

  /** 微信登录：返回 openid 及投票状态 */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { code: string }) {
    if (!body?.code) throw new BadRequestException('缺少登录凭证 code');
    const data = await this.service.login(body.code);
    return { status: 'success', data };
  }

  /** 工号/姓名补充校验（可选开启） */
  @Post('verify')
  @HttpCode(200)
  async verify(@Body() body: { openid: string; employeeNo: string; name: string }) {
    if (!body?.openid) throw new BadRequestException('缺少 openid');
    const data = await this.service.verify(body.openid, body.employeeNo, body.name);
    return { status: 'success', data };
  }
}
