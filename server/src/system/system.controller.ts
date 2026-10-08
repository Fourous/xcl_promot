import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { SystemService } from './system.service';
import { AuthGuard, WritePermissionGuard } from '@/common/auth.guard';

/** 系统管理：管理员账号 + 操作日志 + 归档 */
@Controller('system')
@UseGuards(AuthGuard)
export class SystemController {
  constructor(private readonly service: SystemService) {}

  /** 管理员列表 */
  @Get('admins')
  async admins() {
    const data = await this.service.listAdmins();
    return { status: 'success', data };
  }

  /** 新增管理员 */
  @Post('admins')
  @HttpCode(200)
  @UseGuards(WritePermissionGuard)
  async createAdmin(@Body() body: Record<string, any>, @Req() req: Request) {
    const data = await this.service.createAdmin(body, (req as any).admin);
    return { status: 'success', data };
  }

  /** 更新管理员（角色/状态/重置密码） */
  @Put('admins/:id')
  @HttpCode(200)
  @UseGuards(WritePermissionGuard)
  async updateAdmin(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Request) {
    const data = await this.service.updateAdmin(id, body, (req as any).admin);
    return { status: 'success', data };
  }

  /** 删除管理员 */
  @Delete('admins/:id')
  @HttpCode(200)
  @UseGuards(WritePermissionGuard)
  async deleteAdmin(@Param('id') id: string, @Req() req: Request) {
    const data = await this.service.deleteAdmin(id, (req as any).admin);
    return { status: 'success', data };
  }

  /** 操作日志查询 */
  @Get('logs')
  async logs(@Req() req: Request) {
    const data = await this.service.listLogs((req as any).admin);
    return { status: 'success', data };
  }

  /** 数据重置 / 活动归档（危险操作） */
  @Post('archive')
  @HttpCode(200)
  @UseGuards(WritePermissionGuard)
  async archive(@Body() body: Record<string, any>, @Req() req: Request) {
    const data = await this.service.archive(body, (req as any).admin);
    return { status: 'success', data };
  }
}
