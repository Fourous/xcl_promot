import { Controller, Get, Post, Body, HttpCode, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@/common/auth.guard';
import { RateLimitGuard } from '@/common/rate-limit.guard';
import { Request } from 'express';

/** 管理端登录接口 */
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  /** 获取图形验证码 */
  @Get('captcha')
  async captcha() {
    const data = this.service.captcha();
    return { status: 'success', data };
  }

  /** 管理员登录（账号 + 密码 + 验证码） */
  @Post('login')
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  async login(@Body() body: Record<string, any>) {
    const data = await this.service.login(body);
    return { status: 'success', data };
  }

  /** 当前登录管理员信息 */
  @Get('profile')
  @UseGuards(AuthGuard)
  async profile(@Req() req: Request) {
    const admin = (req as any).admin;
    const data = await this.service.profile(admin);
    return { status: 'success', data };
  }
}
