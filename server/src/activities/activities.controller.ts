import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { AuthGuard, WritePermissionGuard } from '@/common/auth.guard';

/** 活动管理接口（多活动隔离） */
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  /** 活动列表（公开，投票端与管理端均使用） */
  @Get()
  async list() {
    const data = await this.service.list();
    return { status: 'success', data };
  }

  /** 当前活动（投票端入口） */
  @Get('current')
  async current() {
    const data = await this.service.current();
    return { status: 'success', data };
  }

  /** 新建活动 */
  @Post()
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async create(@Body() body: Record<string, any>) {
    const data = await this.service.create(body);
    return { status: 'success', data };
  }

  /** 归档活动 */
  @Post(':id/archive')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async archive(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.archive(id);
    return { status: 'success', data };
  }

  /** 更新活动状态 */
  @Post(':id/status')
  @HttpCode(200)
  @UseGuards(AuthGuard, WritePermissionGuard)
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    const data = await this.service.updateStatus(id, body.status);
    return { status: 'success', data };
  }
}
