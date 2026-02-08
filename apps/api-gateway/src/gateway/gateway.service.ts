import { Injectable } from '@nestjs/common';

export interface ServiceConfig {
  name: string;
  baseUrl: string;
  port: number;
  prefix: string;
}

@Injectable()
export class GatewayService {
  private services: Map<string, ServiceConfig> = new Map();

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    const services: ServiceConfig[] = [
      {
        name: 'booking',
        baseUrl: process.env.BOOKING_SERVICE_URL || 'localhost',
        port: parseInt(process.env.BOOKING_SERVICE_PORT || '3007'),
        prefix: '/api/booking',
      },
      {
        name: 'cloudbeds',
        baseUrl: process.env.CLOUDBEDS_SERVICE_URL || 'localhost',
        port: parseInt(process.env.CLOUDBEDS_SERVICE_PORT || '3002'),
        prefix: '/api/cloudbeds',
      },
      {
        name: 'payment',
        baseUrl: process.env.PAYMENT_SERVICE_URL || 'localhost',
        port: parseInt(process.env.PAYMENT_SERVICE_PORT || '3009'),
        prefix: '/api/payment',
      },
      {
        name: 'notification',
        baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'localhost',
        port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3011'),
        prefix: '/api/notification',
      },
      {
        name: 'audit',
        baseUrl: process.env.AUDIT_SERVICE_URL || 'localhost',
        port: parseInt(process.env.AUDIT_SERVICE_PORT || '3005'),
        prefix: '/api/audit',
      },
      {
        name: 'booking-policy',
        baseUrl: process.env.BOOKING_POLICY_SERVICE_URL || 'localhost',
        port: parseInt(process.env.BOOKING_POLICY_SERVICE_PORT || '3008'),
        prefix: '/api/booking-policy',
      },
    ];

    services.forEach(service => {
      this.services.set(service.name, service);
    });
  }

  getServiceConfig(serviceName: string): ServiceConfig | undefined {
    return this.services.get(serviceName);
  }

  async proxyRequest(
    serviceName: string,
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
    query?: Record<string, string>,
  ): Promise<any> {
    const service = this.getServiceConfig(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const url = `http://${service.baseUrl}:${service.port}${path}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.sanitizeHeaders(headers),
        body: body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Service ${serviceName} error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Service ${serviceName} error: ${error.message}`);
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    // Remove headers that shouldn't be forwarded
    delete sanitized['host'];
    delete sanitized['content-length'];
    
    return sanitized;
  }

  getAllServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }
}
