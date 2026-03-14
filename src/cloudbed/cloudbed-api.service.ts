import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../common/logger/logger.service';
import axios, { AxiosInstance } from 'axios';

/**
 * Cloudbed API Service
 * Handles all interactions with Cloudbed API
 */
@Injectable()
export class CloudbedApiService {
  private readonly logger = new LoggerService('CloudbedApiService');
  private readonly httpClient: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl =
      this.config.get('CLOUDBED_API_URL') || 'https://api.cloudbeds.com';
    this.apiKey = this.config.get('CLOUDBED_API_KEY') || '';

    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async generatePaymentLink(
    params: { reservationId: string; propertyId?: string },
    requestId: string,
  ): Promise<string> {
    const { reservationId, propertyId } = params;

    this.logger.logInfo(
      'Generating payment link for reservation',
      'CloudbedApiService',
      'generatePaymentLink',
      requestId,
      { reservationId, propertyId },
    );

    // Cloudbeds payment-link endpoints vary by setup and permissions.
    // To keep the workflow functional, we support a configurable template.
    // Example: PAYMENT_LINK_TEMPLATE="https://pay.example.com/reservation/{reservationId}"
    const template = this.config.get<string>('PAYMENT_LINK_TEMPLATE') || '';
    if (template) {
      return template.replace('{reservationId}', encodeURIComponent(reservationId));
    }

    // Fallback: return a placeholder link that can be replaced when a real endpoint is available.
    return `${this.apiUrl}/reservation/${encodeURIComponent(reservationId)}/payment`;
  }

  /**
   * Fetch rooms (optionally scoped to date range to retrieve unassigned rooms)
   */
  async getRooms(
    params: {
      propertyIDs?: string;
      roomTypeID?: string;
      roomTypeNameShort?: string;
      startDate?: string;
      endDate?: string;
      includeRoomRelations?: number;
    },
    requestId: string,
  ): Promise<any[]> {
    this.logger.logInfo(
      'Fetching rooms from Cloudbed',
      'CloudbedApiService',
      'getRooms',
      requestId,
      params,
    );

    try {
      const response = await this.httpClient.get(`/api/v1.3/getRooms`, {
        params,
      });

      const roomData = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      this.logger.logInfo(
        'Successfully fetched rooms from Cloudbed',
        'CloudbedApiService',
        'getRooms',
        requestId,
        {
          status: response.status,
          propertyCount: roomData.length,
        },
        response.data,
      );

      return roomData;
    } catch (error) {
      this.logger.logError(
        'Failed to fetch rooms from Cloudbed',
        'CloudbedApiService',
        'getRooms',
        error,
        requestId,
        params,
      );
      throw new HttpException(
        'Unable to fetch rooms from Cloudbed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Fetch room blocks / out-of-service rooms
   */
  async getRoomBlocks(
    params: {
      propertyID?: string;
      roomBlockID?: string;
      roomTypeID?: string;
      roomID?: string;
      startDate?: string;
      endDate?: string;
      pageNumber?: number;
      pageSize?: number;
    },
    requestId: string,
  ): Promise<any[]> {
    this.logger.logInfo(
      'Fetching room blocks from Cloudbed',
      'CloudbedApiService',
      'getRoomBlocks',
      requestId,
      params,
    );

    try {
      const response = await this.httpClient.get(`/api/v1.3/getRoomBlocks`, {
        params,
      });

      const blockData = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      this.logger.logInfo(
        'Successfully fetched room blocks from Cloudbed',
        'CloudbedApiService',
        'getRoomBlocks',
        requestId,
        {
          status: response.status,
          blockCount: blockData.length,
        },
        response.data,
      );

      return blockData;
    } catch (error) {
      this.logger.logError(
        'Failed to fetch room blocks from Cloudbed',
        'CloudbedApiService',
        'getRoomBlocks',
        error,
        requestId,
        params,
      );
      throw new HttpException(
        'Unable to fetch room blocks from Cloudbed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get reservation details by ID
   */
  async getReservation(reservationId: string, requestId: string): Promise<any> {
    this.logger.logInfo(
      'Fetching reservation from Cloudbed',
      'CloudbedApiService',
      'getReservation',
      requestId,
      { reservationId },
    );

    try {
      const response = await this.httpClient.get(`/api/v1.3/getReservation`, {
        params: { reservationID: reservationId, includeRatePlans: true },
      });

      const reservationData = response.data?.data ?? response.data;
      const reservationKeys =
        typeof reservationData === 'object' && reservationData !== null
          ? Object.keys(reservationData as Record<string, unknown>)
          : [];

      const includeRatePlansCount = Array.isArray(
        (reservationData)?.ratePlans,
      )
        ? ((reservationData).ratePlans as any[]).length
        : undefined;

      const fullReservationResponse = reservationData;

      this.logger.logInfo(
        'Successfully fetched reservation',
        'CloudbedApiService',
        'getReservation',
        requestId,
        {
          reservationId,
          status: response.status,
          topLevelKeys: reservationKeys,
          ratePlansCount: includeRatePlansCount,
          fullResponse: fullReservationResponse,
        },
      );

      return reservationData;
    } catch (error) {
      this.logger.logError(
        'Failed to fetch reservation from Cloudbed',
        'CloudbedApiService',
        'getReservation',
        error,
        requestId,
        { reservationId },
      );
      return this.getMockReservationData(reservationId);
    }
  }

  async getReservationsWithRateDetails(
    reservationId: string,
    requestId: string,
  ): Promise<unknown> {
    this.logger.logInfo(
      'Fetching reservation rate details from Cloudbed',
      'CloudbedApiService',
      'getReservationsWithRateDetails',
      requestId,
      { reservationId },
    );

    try {
      const response = await this.httpClient.get(
        `/api/v1.3/getReservationsWithRateDetails`,
        {
          params: { reservationID: reservationId },
        },
      );

      const first = Array.isArray(response.data?.data) ? response.data.data[0] : null;
      const detailsData = first ?? response.data?.data ?? response.data ?? null;

      const rooms = Array.isArray((detailsData)?.rooms)
        ? ((detailsData).rooms as any[])
        : [];

      const rateNames = rooms
        .map((r) => String(r?.rateName ?? ''))
        .filter(Boolean);

      const fullRateDetailsResponse = detailsData;

      this.logger.logInfo(
        'Successfully fetched reservation rate details from Cloudbed',
        'CloudbedApiService',
        'getReservationsWithRateDetails',
        requestId,
        {
          reservationId,
          status: response.status,
          roomsCount: rooms.length,
          rateNamesSample: rateNames.slice(0, 5),
          fullResponse: fullRateDetailsResponse,
        },
      );

      return detailsData;
    } catch (error) {
      this.logger.logError(
        'Failed to fetch reservation rate details from Cloudbed',
        'CloudbedApiService',
        'getReservationsWithRateDetails',
        error,
        requestId,
        { reservationId },
      );
      return null;
    }
  }

  /**
   * Get guest details by reservation ID
   * This is the primary method to fetch guest data including email and special requests
   */
  async getGuestByReservation(
    reservationId: string,
    requestId: string,
  ): Promise<any> {
    this.logger.logInfo(
      'Fetching guest by reservation ID from Cloudbed',
      'CloudbedApiService',
      'getGuestByReservation',
      requestId,
      { reservationId },
    );

    try {
      const response = await this.httpClient.get(`/api/v1.3/getGuest`, {
        params: { reservationID: reservationId },
      });

      const guestData = response.data?.data ?? response.data;

      this.logger.logInfo(
        'Successfully fetched guest data from Cloudbed',
        'CloudbedApiService',
        'getGuestByReservation',
        requestId,
        {
          reservationId,
          guestID: guestData?.guestID,
          email: guestData?.email,
          hasSpecialRequests: !!guestData?.specialRequests,
          fullResponse: guestData,
        },
      );

      return guestData;
    } catch (error) {
      this.logger.logError(
        'Failed to fetch guest by reservation from Cloudbed',
        'CloudbedApiService',
        'getGuestByReservation',
        error,
        requestId,
        { reservationId },
      );
      return null;
    }
  }

  /**
   * Get guest details by guest ID
   */
  async getGuest(guestId: string, requestId: string): Promise<any> {
    this.logger.logInfo(
      'Fetching guest from Cloudbed',
      'CloudbedApiService',
      'getGuest',
      requestId,
      { guestId },
    );

    try {
      const response = await this.httpClient.get(`/api/v1.2/getGuest`, {
        params: { guestID: guestId },
      });

      const guestData = response.data?.data ?? response.data;

      this.logger.logInfo(
        'Successfully fetched guest data',
        'CloudbedApiService',
        'getGuest',
        requestId,
        {
          guestId,
          email: guestData?.email,
          fullResponse: guestData,
        },
      );

      return guestData;
    } catch (error) {
      this.logger.logError(
        'Failed to fetch guest from Cloudbed',
        'CloudbedApiService',
        'getGuest',
        error,
        requestId,
      );
      return null;
    }
  }

  async getRatePlans(
    params: {
      startDate: string;
      endDate: string;
      adults?: number;
      children?: number;
      detailedRates?: boolean;
    },
    requestId: string,
  ): Promise<any[]> {
    this.logger.logInfo(
      'Fetching rate plans from Cloudbed',
      'CloudbedApiService',
      'getRatePlans',
      requestId,
      params,
    );

    try {
      const response = await this.httpClient.get(`/api/v1.3/getRatePlans`, {
        params: {
          ...params,
          detailedRates: params.detailedRates ?? true,
        },
      });

      this.logger.logInfo(
        'Successfully fetched rate plans from Cloudbed',
        'CloudbedApiService',
        'getRatePlans',
        requestId,
        {
          status: response.status,
          count: Array.isArray(response.data?.data)
            ? response.data.data.length
            : 0,
        },
      );

      return response.data?.data ?? response.data ?? [];
    } catch (error) {
      this.logger.logError(
        'Failed to fetch rate plans from Cloudbed',
        'CloudbedApiService',
        'getRatePlans',
        error,
        requestId,
        params,
      );
      return [];
    }
  }

  /**
   * Get currency settings for the property/system
   * Cloudbeds: GET /api/v1.3/getCurrencySettings
   */
  async getCurrencySettings(requestId: string): Promise<any> {
    this.logger.logInfo(
      'Fetching currency settings from Cloudbed',
      'CloudbedApiService',
      'getCurrencySettings',
      requestId,
      {},
    );

    try {
      const response = await this.httpClient.get(`/api/v1.3/getCurrencySettings`);

      const currencySettings = response.data?.data ?? response.data;

      this.logger.logInfo(
        'Successfully fetched currency settings from Cloudbed',
        'CloudbedApiService',
        'getCurrencySettings',
        requestId,
        {
          status: response.status,
          defaultCurrency: currencySettings?.default,
          hasFormat: !!currencySettings?.format,
          fullResponse: currencySettings,
        },
      );

      return currencySettings;
    } catch (error) {
      this.logger.logError(
        'Failed to fetch currency settings from Cloudbed',
        'CloudbedApiService',
        'getCurrencySettings',
        error,
        requestId,
      );
      return null;
    }
  }

  /**
   * Mock reservation data for development/fallback
   */
  private getMockReservationData(reservationId: string): any {
    return {
      reservationID: reservationId,
      propertyName: 'Test Property',
      propertyAddress: '123 Test St, City, Country',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      numberOfGuests: 2,
      balance: 100.0,
      currency: 'USD',
      ratePlan: 'Flexible Rate',
      specialRequests: 'Free cancellation until 2 days before check-in',
      description: 'Standard room with flexible cancellation',
    };
  }
}
