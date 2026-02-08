import { GatewayService } from './gateway.service';
export declare class GatewayController {
    private readonly gatewayService;
    constructor(gatewayService: GatewayService);
    getHealth(): {
        status: string;
        timestamp: string;
        services: {
            name: string;
            prefix: string;
            url: string;
        }[];
    };
    proxyBooking(req: any, res: any): Promise<void>;
    proxyCloudbeds(req: any, res: any): Promise<void>;
    proxyPayment(req: any, res: any): Promise<void>;
    proxyNotification(req: any, res: any): Promise<void>;
    proxyAudit(req: any, res: any): Promise<void>;
    proxyBookingPolicy(req: any, res: any): Promise<void>;
    private proxyToService;
}
