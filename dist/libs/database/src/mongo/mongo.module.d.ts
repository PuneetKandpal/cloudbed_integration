import { DynamicModule } from '@nestjs/common';
export interface MongoModuleOptions {
    uri: string;
    dbName?: string;
}
export declare class MongoModule {
    static forRoot(options: MongoModuleOptions): DynamicModule;
}
