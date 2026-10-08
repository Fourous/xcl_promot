import { Controller, Post, Body, HttpCode, BadRequestException } from '@nestjs/common';
import { VoteAuthService } from './vote-auth.service';

/** 投票端账号密码登录接口 */
@Controller('vote-auth')
export class VoteAuthController {
  constructor(private readonly service: VoteAuthService) {}

  /** 账号密码登录（工号 + 密码） */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { account: string; password: string }) {
    if (!body?.account || !body?.password) throw new BadRequestException('参数不完整');
    const data = await this.service.login(body.account, body.password);
    return { status: 'success', data };
  }

  /** 修改密码（首次登录强制） */
  @Post('change-password')
  @HttpCode(200)
  async changePassword(@Body() body: { token: string; oldPassword: string; newPassword: string }) {
    if (!body?.token || !body?.newPassword) throw new BadRequestException('参数不完整');
    const data = await this.service.changePassword(body.token, body.oldPassword, body.newPassword);
    return { status: 'success', data };
  }
}
