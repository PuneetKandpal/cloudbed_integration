import { ConfigService } from '@nestjs/config';
export declare class CloudbedApiService {
    private readonly config;
    private readonly logger;
    private readonly httpClient;
    private readonly apiUrl;
    private readonly apiKey;
    constructor(config: ConfigService);
    generatePaymentLink(params: {
        reservationId: string;
        propertyId?: string;
    }, requestId: string): Promise<string>;
    getRooms(params: {
        propertyIDs?: string;
        roomTypeID?: string;
        roomTypeNameShort?: string;
        startDate?: string;
        endDate?: string;
        includeRoomRelations?: number;
    }, requestId: string): Promise<any[]>;
    getRoomBlocks(params: {
        propertyID?: string;
        roomBlockID?: string;
        roomTypeID?: string;
        roomID?: string;
        startDate?: string;
        endDate?: string;
        pageNumber?: number;
        pageSize?: number;
    }, requestId: string): Promise<any[]>;
    getReservation(reservationId: string, requestId: string): Promise<any>;
    getReservationsWithRateDetails(reservationId: string, requestId: string): Promise<unknown>;
    getGuestByReservation(reservationId: string, requestId: string): Promise<any>;
    getGuest(guestId: string, requestId: string): Promise<any>;
    getRatePlans(params: {
        startDate: string;
        endDate: string;
        adults?: number;
        children?: number;
        detailedRates?: boolean;
    }, requestId: string): Promise<any[]>;
    getCurrencySettings(requestId: string): Promise<any>;
    private getMockReservationData;
}
