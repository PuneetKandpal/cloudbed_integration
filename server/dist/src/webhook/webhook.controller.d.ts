import { WebhookService } from './webhook.service';
export declare class WebhookController {
    private readonly webhookService;
    private readonly logger;
    constructor(webhookService: WebhookService);
    handleWebhook(payload: any, headers: any): Promise<{
        status: string;
        message: string;
        requestId: string;
    }>;
}
