import { Injectable, HttpException } from '@nestjs/common';
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
   * Get guest details by ID
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

      return response.data.data || response.data;
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
