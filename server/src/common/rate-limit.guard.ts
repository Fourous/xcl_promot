import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';

interface RateRecord {
  count: number;
  windowStart: number;
}

/** 简单内存限流守卫：按 IP + 路由做滑动窗口限流 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private store = new Map<string, RateRecord>();
  private readonly limit = 120; // 每窗口最大请求数
  private readonly windowMs = 60 * 1000; // 60 秒窗口

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const route = req.route?.path || req.url || '/';
    const key = `${ip}:${route}`;
    const now = Date.now();
    const record = this.store.get(key);
    if (!record || record.windowStart + this.windowMs < now) {
      this.store.set(key, { count: 1, windowStart: now });
      return true;
    }
    record.count += 1;
    if (record.count > this.limit) {
      throw new HttpException('请求过于频繁，请稍后再试', 429);
    }
    return true;
  }
}
