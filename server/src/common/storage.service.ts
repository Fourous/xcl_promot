import { Injectable } from '@nestjs/common';
import { S3Storage } from 'coze-coding-dev-sdk';

/** 对象存储服务封装：头像、导入模板、导出文件等 */
@Injectable()
export class StorageService {
  private storage: S3Storage;

  constructor() {
    this.storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }

  /** 上传文件，返回实际存储 key */
  async upload(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    return this.storage.uploadFile({ fileContent: buffer, fileName, contentType });
  }

  /** 生成签名访问 URL */
  async getUrl(key: string, expireTime = 86400): Promise<string> {
    if (!key) return '';
    return this.storage.generatePresignedUrl({ key, expireTime });
  }
}
