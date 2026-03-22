import { type Page } from '@playwright/test';
export declare function goToReservationsSearchAndAuthorizeCreditCard(page: Page, propertyId: string, reservationId: string, amount?: string): Promise<void>;
export declare function openSideDrawerIfNeeded(page: Page, requestId: string): Promise<void>;
export declare function goToReservationsAndSearch(page: Page, propertyId: string, reservationId: string): Promise<void>;
