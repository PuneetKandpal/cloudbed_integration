import { Injectable } from '@nestjs/common';

@Injectable()
export class S3Service {
  async upload(_key: string, _data: any) {
    // Placeholder for Phase-4 archival
    return;
  }
}
