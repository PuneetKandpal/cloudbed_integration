export interface S3WriteOptions {
    bucket: string;
    key: string;
    body: string | Buffer;
    contentType?: string;
}
export declare function buildAuditLogKey(service: string, date: string): string;
