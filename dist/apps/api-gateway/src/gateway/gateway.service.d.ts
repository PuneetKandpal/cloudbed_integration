export interface ServiceConfig {
    name: string;
    baseUrl: string;
    port: number;
    prefix: string;
}
export declare class GatewayService {
    private services;
    constructor();
    private initializeServices;
    getServiceConfig(serviceName: string): ServiceConfig | undefined;
    proxyRequest(serviceName: string, path: string, method: string, headers: Record<string, string>, body?: any, query?: Record<string, string>): Promise<any>;
    private sanitizeHeaders;
    getAllServices(): ServiceConfig[];
}
