import { Global, Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { StorageService } from './storage.service';

/** 全局公共模块：验证码、对象存储等通用能力 */
@Global()
@Module({
  providers: [CaptchaService, StorageService],
  exports: [CaptchaService, StorageService],
})
export class CommonModule {}
