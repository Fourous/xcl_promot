import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { AuthGuard, WritePermissionGuard } from '@/common/auth.guard';

/** 用户池管理接口（管理端） */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/users —— 用户列表（分页 + 搜索） */
  @Get()
  @UseGuards(AuthGuard)
  async list(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.usersService.list(keyword, Number(page) || 1, Number(pageSize) || 20);
    return { status: 'success', data };
  }

  /** POST /api/users/reset-password —— 重置密码（恢复默认密码 = 工号） */
  @Post('reset-password')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async resetPassword(@Body() body: { employeeNo: string }) {
    const data = await this.usersService.resetPassword(body?.employeeNo);
    return { status: 'success', data };
  }

  /** POST /api/users/import —— Excel 导入用户到用户池 */
  @Post('import')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('未接收到文件');
    const data = await this.usersService.importUsers(file);
    return { status: 'success', data };
  }
}
