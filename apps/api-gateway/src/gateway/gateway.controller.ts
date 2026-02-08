import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Patch, 
  Request, 
  Response,
  Param,
  Query,
  Body,
  Headers,
  HttpStatus,
  HttpException,
  All,
} from '@nestjs/common';
import { GatewayService } from './gateway.service';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get('api/health')
  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: this.gatewayService.getAllServices().map(s => ({
        name: s.name,
        prefix: s.prefix,
        url: `http://${s.baseUrl}:${s.port}`,
      })),
    };
  }

  // Booking Service Routes
  @All('api/booking/*')
  async proxyBooking(@Request() req: any, @Response() res: any) {
    await this.proxyToService('booking', req, res);
  }

  // Cloudbeds Integration Service Routes
  @All('api/cloudbeds/*')
  async proxyCloudbeds(@Request() req: any, @Response() res: any) {
    await this.proxyToService('cloudbeds', req, res);
  }

  // Payment Service Routes
  @All('api/payment/*')
  async proxyPayment(@Request() req: any, @Response() res: any) {
    await this.proxyToService('payment', req, res);
  }

  // Notification Service Routes
  @All('api/notification/*')
  async proxyNotification(@Request() req: any, @Response() res: any) {
    await this.proxyToService('notification', req, res);
  }

  // Audit Service Routes
  @All('api/audit/*')
  async proxyAudit(@Request() req: any, @Response() res: any) {
    await this.proxyToService('audit', req, res);
  }

  // Booking Policy Service Routes
  @All('api/booking-policy/*')
  async proxyBookingPolicy(@Request() req: any, @Response() res: any) {
    await this.proxyToService('booking-policy', req, res);
  }

  private async proxyToService(
    serviceName: string, 
    req: any, 
    res: any
  ) {
    try {
      const path = req.url;
      const method = req.method;
      const headers = req.headers as Record<string, string>;
      const query = req.query as Record<string, string>;
      const body = req.body;

      const response = await this.gatewayService.proxyRequest(
        serviceName,
        path,
        method,
        headers,
        body,
        query,
      );

      // Forward response headers
      Object.entries(response.headers || {}).forEach(([key, value]) => {
        if (typeof value === 'string') {
          res.setHeader(key, value);
        }
      });

      // Send response with same status code
      res.status(response.status || 200).json(response.data);
    } catch (error) {
      console.error(`Gateway error proxying to ${serviceName}:`, error);
      
      if (error instanceof Error) {
        throw new HttpException(
          {
            message: `Service ${serviceName} unavailable`,
            error: error.message,
            timestamp: new Date().toISOString(),
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
      
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
