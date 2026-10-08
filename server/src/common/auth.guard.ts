import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { verifyAdminToken } from './token.util';

/** 管理端鉴权守卫：校验 Bearer Token 并注入 req.admin */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const payload = token ? verifyAdminToken(token) : null;
    if (!payload) {
      throw new HttpException('未登录或登录已过期', 401);
    }
    req.admin = payload;
    return true;
  }
}

/** 写权限守卫：只读审计角色禁止写操作 */
@Injectable()
export class WritePermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const admin = req.admin;
    if (!admin) throw new HttpException('未登录', 401);
    if (admin.role === 'auditor') {
      throw new HttpException('只读审计角色无写操作权限', 403);
    }
    return true;
  }
}
