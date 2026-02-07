import { Controller, Post, Body } from '@nestjs/common';
import { CloudbedsService } from '../services/cloudbeds.service';

@Controller('cloudbeds')
export class CloudbedsWebhookController {
  constructor(private readonly cloudbedsService: CloudbedsService) {}

  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    return this.cloudbedsService.handleWebhook(payload);
  }
}
