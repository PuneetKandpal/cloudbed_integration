import { OnModuleDestroy } from '@nestjs/common';
import { Connection } from 'mongoose';
export declare class MongoService implements OnModuleDestroy {
    private readonly connection;
    constructor(connection: Connection);
    getConnection(): Connection;
    onModuleDestroy(): Promise<void>;
}
