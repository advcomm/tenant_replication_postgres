/**
 * Push Notification Service
 *
 * Handles sending push notifications via Firebase Cloud Messaging
 */

import admin from 'firebase-admin';
import { notificationLogger } from '@/utils/logger';
import { getFirebaseInstance } from './firebaseClient';
import {
	getMobileClients,
	getMobileDeviceCount,
	getMobileFcmToken,
} from './mobileClients';

/**
 * Push message structure
 */
export interface PushMessage {
	title: string;
	body: string;
}

/**
 * Send push notification to a specific FCM token
 * @param fcmToken - Firebase Cloud Messaging token
 * @param message - Notification message with title and body
 */
export function sendPushNotification(
	fcmToken: string,
	message: PushMessage,
): void {
	const firebase = getFirebaseInstance();

	if (!firebase) {
		throw new Error('Firebase not initialized');
	}

	const deviceCount = getMobileDeviceCount();
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
export function sendPushNotificationToDevice(
	deviceId: string,
	message: PushMessage,
): void {
	const fcmToken = getMobileFcmToken(deviceId);

	if (!fcmToken) {
		notificationLogger.warn(
			{ deviceId },
			'Cannot send push notification: device not registered',
		);
		return;
	}

	sendPushNotification(fcmToken, message);
}

/**
 * Broadcast push notification to all registered mobile devices
 * @param message - Notification message
 */
export function broadcastPushNotification(message: PushMessage): void {
	const clients = getMobileClients();

	for (const [_deviceId, fcmToken] of clients.entries()) {
		sendPushNotification(fcmToken, message);
	}

	notificationLogger.info(
		{ deviceCount: clients.size },
		'Push notification broadcast sent',
	);
}
