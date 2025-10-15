/**
 * Mobile Client Management
 *
 * Manages mobile device FCM tokens for push notifications
 */

import { notificationLogger } from '@/utils/logger';
import { FirebaseClientManager } from './firebaseClient';

/**
 * Mobile Client Manager
 * Manages FCM tokens for mobile push notifications
 */
export class MobileClientManager {
	private static clients = new Map<string, string>(); // deviceId -> fcmToken

	/**
	 * Get all mobile clients
	 */
	static getClients(): Map<string, string> {
		return MobileClientManager.clients;
	}

	/**
	 * Add a mobile device
	 * @param deviceId - Unique device identifier
	 * @param fcmToken - Firebase Cloud Messaging token
	 */
	static addDevice(deviceId: string, fcmToken: string): void {
		// Ensure Firebase is initialized
		if (!FirebaseClientManager.isInitialized()) {
			FirebaseClientManager.initialize();
		}

		MobileClientManager.clients.set(deviceId, fcmToken);
		notificationLogger.info({ deviceId, type: 'mobile' }, 'Device registered');
	}

	/**
	 * Delete a mobile device
	 * @param deviceId - Device identifier
	 */
	static deleteDevice(deviceId: string): void {
		MobileClientManager.clients.delete(deviceId);
		notificationLogger.info({ deviceId, type: 'mobile' }, 'Device removed');
	}

	/**
	 * Get FCM token for a device
	 * @param deviceId - Device identifier
	 */
	static getFcmToken(deviceId: string): string | undefined {
		return MobileClientManager.clients.get(deviceId);
	}

	/**
	 * Check if device is registered
	 * @param deviceId - Device identifier
	 */
	static hasDevice(deviceId: string): boolean {
		return MobileClientManager.clients.has(deviceId);
	}

	/**
	 * Get count of registered mobile devices
	 */
	static getDeviceCount(): number {
		return MobileClientManager.clients.size;
	}
}

