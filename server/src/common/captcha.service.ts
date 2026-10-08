import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

interface CaptchaRecord {
  code: string;
  expiresAt: number;
}

/** 图形验证码服务：生成 SVG 验证码，存内存，5 分钟有效 */
@Injectable()
export class CaptchaService {
  private store = new Map<string, CaptchaRecord>();
  private readonly CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  generate() {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += this.CHARS[randomInt(this.CHARS.length)];
    }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    this.store.set(id, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    // 顺手清理过期记录，防止内存膨胀
    for (const [k, v] of this.store) {
      if (v.expiresAt < Date.now()) this.store.delete(k);
    }
    const svg = this.renderSvg(code);
    const base64 = Buffer.from(svg).toString('base64');
    return { captchaId: id, captchaImage: `data:image/svg+xml;base64,${base64}` };
  }

  verify(id: string, code: string): boolean {
    const record = this.store.get(id);
    if (!record) return false;
    this.store.delete(id); // 一次性使用
    return record.expiresAt >= Date.now() && record.code === String(code || '').toUpperCase();
  }

  private renderSvg(code: string): string {
    const items = code
      .split('')
      .map((c, i) => {
        const x = 18 + i * 22;
        const y = 28 + randomInt(-4, 5);
        const rotate = randomInt(-15, 16);
        return `<text x="${x}" y="${y}" font-size="24" font-family="Arial, sans-serif" font-weight="bold" fill="#C80018" transform="rotate(${rotate} ${x} ${y})">${c}</text>`;
      })
      .join('');
    const lines = [0, 1, 2]
      .map(() => {
        const x1 = randomInt(0, 30);
        const y1 = randomInt(0, 40);
        const x2 = randomInt(70, 100);
        const y2 = randomInt(0, 40);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#E5E5E5" stroke-width="1" />`;
      })
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40"><rect width="100" height="40" fill="#F7F7F5"/>${lines}${items}</svg>`;
  }
}
