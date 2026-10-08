import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpCode,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { AuthGuard, WritePermissionGuard } from '@/common/auth.guard';
import { Request, Response } from 'express';

/** Excel 批量导入接口 */
@Controller('import')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  /** 下载导入模板 */
  @Get('template')
  @UseGuards(AuthGuard)
  async template(@Res() res: Response) {
    const buffer = await this.service.template();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''candidate_template.xlsx");
    res.send(buffer);
  }

  /** 上传并解析校验（预览） */
  @Post('parse')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  @UseInterceptors(FileInterceptor('file'))
  async parse(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('未接收到文件');
    const data = await this.service.parse(file);
    return { status: 'success', data };
  }

  /** 确认导入（追加/覆盖，事务） */
  @Post('commit')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async commit(@Body() body: Record<string, any>, @Req() req: Request) {
    const admin = (req as any).admin;
    const data = await this.service.commit(body, admin?.account || 'unknown');
    return { status: 'success', data };
  }

  /** 历史导入批次 */
  @Get('batches')
  @UseGuards(AuthGuard)
  async batches() {
    const data = await this.service.batches();
    return { status: 'success', data };
  }

  /** 导出错误明细 */
  @Get('errors/:id')
  @UseGuards(AuthGuard)
  async exportErrors(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.exportErrors(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''import_errors.xlsx");
    res.send(buffer);
  }
}
