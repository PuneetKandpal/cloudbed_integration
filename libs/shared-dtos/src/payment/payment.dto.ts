/**
 * Shared DTOs for payment domain.
 */

export interface PaymentCreateDto {
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  // TODO: Add fields as needed
}

export interface PaymentUpdateDto extends Partial<PaymentCreateDto> {
  id: string;
}

export interface PaymentResponseDto {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
