/**
 * Mobile Client Management
 *
 * Manages mobile device FCM tokens for push notifications
 */

import { notificationLogger } from '@/utils/logger';
import { initializeFirebase, isFirebaseInitialized } from './firebaseClient';

/**
 * Mobile Client Manager
 * Manages FCM tokens for mobile push notifications
 */

/**
 * Mobile clients storage: deviceId -> fcmToken
 */
const mobileClients = new Map<string, string>();

/**
 * Get all mobile clients
 */
export function getMobileClients(): Map<string, string> {
	return mobileClients;
}

/**
 * Add a mobile device
 * @param deviceId - Unique device identifier
 * @param fcmToken - Firebase Cloud Messaging token
 */
export function addMobileDevice(deviceId: string, fcmToken: string): void {
	// Ensure Firebase is initialized
	if (!isFirebaseInitialized()) {
		initializeFirebase();
	}

	mobileClients.set(deviceId, fcmToken);
	notificationLogger.info({ deviceId, type: 'mobile' }, 'Device registered');
}

/**
 * Delete a mobile device
 * @param deviceId - Device identifier
 */
export function deleteMobileDevice(deviceId: string): void {
	mobileClients.delete(deviceId);
	notificationLogger.info({ deviceId, type: 'mobile' }, 'Device removed');
}

/**
 * Get FCM token for a device
 * @param deviceId - Device identifier
 */
export function getMobileFcmToken(deviceId: string): string | undefined {
	return mobileClients.get(deviceId);
}

/**
 * Check if device is registered
 * @param deviceId - Device identifier
 */
export function hasMobileDevice(deviceId: string): boolean {
	return mobileClients.has(deviceId);
}

/**
 * Get count of registered mobile devices
 */
export function getMobileDeviceCount(): number {
	return mobileClients.size;
}
