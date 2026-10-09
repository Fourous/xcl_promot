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
  Res,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { AuthGuard, WritePermissionGuard } from '@/common/auth.guard';
import { Request, Response } from 'express';

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

  /** GET /api/users/template —— 下载用户导入模板 */
  @Get('template')
  @UseGuards(AuthGuard)
  async template(@Res() res: Response) {
    const buffer = await this.usersService.template();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''user_import_template.xlsx");
    res.send(buffer);
  }

  /** GET /api/users/import-batches —— 用户导入历史记录 */
  @Get('import-batches')
  @UseGuards(AuthGuard)
  async importBatches() {
    const data = await this.usersService.importBatches();
    return { status: 'success', data };
  }

  /** POST /api/users —— 新增单个用户 */
  @Post()
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async create(
    @Body()
    body: {
      employeeNo: string;
      name: string;
      department?: string;
      position?: string;
      intro?: string;
    },
  ) {
    const data = await this.usersService.createUser(body);
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
  async importUsers(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('未接收到文件');
    const admin = (req as any).admin;
    const data = await this.usersService.importUsers(
      file,
      admin?.account || 'unknown',
      file.originalname || '用户导入.xlsx',
    );
    return { status: 'success', data };
  }
}
