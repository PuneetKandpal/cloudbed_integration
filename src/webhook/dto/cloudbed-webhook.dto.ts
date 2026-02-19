import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Sub-reservation DTO
 */
export class SubReservationDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  roomId?: string;
}

/**
 * Actor DTO for status changes
 */
export class ActorDto {
  @IsString()
  type: string;

  @IsString()
  id: string;
}

/**
 * Base Cloudbed Webhook DTO
 * Represents the common structure of Cloudbed webhook events
 */
export class CloudbedWebhookDto {
  @IsString()
  event: string;

  @IsString()
  version: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  propertyID_str: string;

  @IsNumber()
  propertyID: number;
}

/**
 * Reservation Created/Updated Webhook DTO
 */
export class ReservationWebhookDto extends CloudbedWebhookDto {
  @IsString()
  reservationID: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubReservationDto)
  subReservations: SubReservationDto[];
}

/**
 * Reservation Status Changed Webhook DTO
 */
export class ReservationStatusChangedDto extends CloudbedWebhookDto {
  @IsString()
  reservationID: string;

  @IsString()
  status: string;

  @IsString()
  previousStatus: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ActorDto)
  actor: ActorDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubReservationDto)
  subReservations: SubReservationDto[];
}

/**
 * Reservation Accommodation Status Changed Webhook DTO
 */
export class ReservationAccommodationStatusDto extends CloudbedWebhookDto {
  @IsString()
  reservationId: string;

  @IsString()
  status: string;

  @IsString()
  roomId: string;
}

/**
 * Reservation Accommodation Changed Webhook DTO
 */
export class ReservationAccommodationChangedDto extends CloudbedWebhookDto {
  @IsString()
  reservationId: string;

  @IsString()
  subReservationId: string;

  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  roomIdPrev?: string;
}

/**
 * Guest Created/Updated Webhook DTO
 */
export class GuestWebhookDto extends CloudbedWebhookDto {
  @IsString()
  guestId_str: string;

  @IsNumber()
  guestId: number;
}
