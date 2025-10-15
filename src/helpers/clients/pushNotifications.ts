/**
 * Push Notification Service
 *
 * Handles sending push notifications via Firebase Cloud Messaging
 */

import admin from 'firebase-admin';
import { notificationLogger } from '@/utils/logger';
import { FirebaseClientManager } from './firebaseClient';
import { MobileClientManager } from './mobileClients';

/**
 * Push message structure
 */
export interface PushMessage {
	title: string;
	body: string;
}

/**
 * Push Notification Service
 */
export class PushNotificationService {
	/**
	 * Send push notification to a specific FCM token
	 * @param fcmToken - Firebase Cloud Messaging token
	 * @param message - Notification message with title and body
	 */
	static send(fcmToken: string, message: PushMessage): void {
		const firebase = FirebaseClientManager.getInstance();

		if (!firebase) {
			throw new Error('Firebase not initialized');
		}

		const deviceCount = MobileClientManager.getDeviceCount();
		const payload = {
			token: fcmToken,
			data: {
				title: message.title,
				body: message.body,
			} as { [key: string]: string },
		};

		admin
			.messaging()
			.send(payload)
			.then((response) =>
				notificationLogger.info(
					{ response, fcmToken, deviceCount },
					'Push notification sent',
				),
			)
			.catch((err) =>
				notificationLogger.error(
					{ error: err, fcmToken },
					'Push notification failed',
				),
			);
	}

	/**
	 * Send push notification to a device by ID
	 * @param deviceId - Device identifier
	 * @param message - Notification message
	 */
	static sendToDevice(deviceId: string, message: PushMessage): void {
		const fcmToken = MobileClientManager.getFcmToken(deviceId);

		if (!fcmToken) {
			notificationLogger.warn(
				{ deviceId },
				'Cannot send push notification: device not registered',
			);
			return;
		}

		PushNotificationService.send(fcmToken, message);
	}

	/**
	 * Broadcast push notification to all registered mobile devices
	 * @param message - Notification message
	 */
	static broadcast(message: PushMessage): void {
		const clients = MobileClientManager.getClients();

		for (const [deviceId, fcmToken] of clients.entries()) {
			PushNotificationService.send(fcmToken, message);
		}

		notificationLogger.info(
			{ deviceCount: clients.size },
			'Push notification broadcast sent',
		);
	}
}

