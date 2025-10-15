/**
 * Active Clients
 *
 * Main interface for managing web and mobile device connections with Firebase support
 *
 * @example
 * ```typescript
 * import { ActiveClients, FirebaseConfig } from '@advcomm/tenant_replication_postgres';
 *
 * // Option 1: Initialize with config object
 * const firebaseConfig: FirebaseConfig = {
 *   type: "service_account",
 *   project_id: "your-project-id",
 *   private_key: "-----BEGIN PRIVATE KEY-----\n...",
 *   client_email: "your-service-account@your-project.iam.gserviceaccount.com"
 *   // ... other config properties
 * };
 * ActiveClients.InitializeFirebase(firebaseConfig);
 *
 * // Option 2: Initialize with file path
 * ActiveClients.InitializeFirebase('./path/to/firebase-service-account.json');
 *
 * // Option 3: Use environment variables
 * // Set FIREBASE_SERVICE_ACCOUNT_JSON with stringified JSON config
 * // or FIREBASE_SERVICE_ACCOUNT_PATH with file path
 * ActiveClients.InitializeFirebase(); // Will use environment variables or fall back to default
 *
 * // Then use normally
 * ActiveClients.AddMobileDevice('device123', 'fcm-token-here');
 * ```
 */

import type express from 'express';
import {
	initializeFirebase,
	getFirebaseInstance,
	isFirebaseInitialized,
	resetFirebase,
	getFirebaseConfig,
} from './firebaseClient';
import {
	getWebClients,
	addWebDeviceEvent,
	deleteWebDeviceEvents,
	deleteWebDevice,
} from './webClients';
import {
	getMobileClients,
	addMobileDevice,
	deleteMobileDevice,
} from './mobileClients';
import {
	sendPushNotification,
	sendPushNotificationToDevice,
	broadcastPushNotification,
	type PushMessage,
} from './pushNotifications';
import type { FirebaseConfig } from './types';

// Re-export types
export type { FirebaseConfig, PushMessage };

/**
 * ActiveClients - Main class for managing client connections
 *
 * This is the public API that maintains backward compatibility
 * while delegating to module functions internally
 */
export default class ActiveClients {
	/**
	 * Web clients map (for backward compatibility - direct access)
	 */
	static web = getWebClients();

	/**
	 * Mobile clients map (for backward compatibility - direct access)
	 */
	static mobile = getMobileClients();

	/**
	 * Firebase app instance (for backward compatibility)
	 */
	static get firebase() {
		return getFirebaseInstance();
	}

	/**
	 * Initialize Firebase with custom configuration
	 * @param config - Firebase service account config object, file path, or null to use default
	 */
	static InitializeFirebase(config?: FirebaseConfig | string | null): void {
		initializeFirebase(config);
	}

	/**
	 * Check if Firebase is initialized
	 */
	static isFirebaseInitialized(): boolean {
		return isFirebaseInitialized();
	}

	/**
	 * Reset Firebase instance (useful for testing or reconfiguration)
	 */
	static resetFirebase(): void {
		resetFirebase();
	}

	/**
	 * Get current Firebase configuration
	 */
	static getFirebaseConfig(): FirebaseConfig | string | null {
		return getFirebaseConfig();
	}

	/**
	 * Delete a specific web device event subscription
	 */
	static DeleteWebDeviceEvents(deviceId: string, eventName: string): void {
		deleteWebDeviceEvents(deviceId, eventName);
	}

	/**
	 * Add a web device event subscription
	 */
	static AddWebDeviceEvent(
		deviceId: string,
		eventName: string,
		res: express.Response,
	): void {
		addWebDeviceEvent(deviceId, eventName, res);
	}

	/**
	 * Delete a web device and all its subscriptions
	 */
	static DeleteWebDevice(deviceId: string): void {
		deleteWebDevice(deviceId);
	}

	/**
	 * Add a mobile device with FCM token
	 */
	static AddMobileDevice(deviceId: string, fcmToken: string): void {
		addMobileDevice(deviceId, fcmToken);
	}

	/**
	 * Delete a mobile device
	 */
	static DeleteMobileDevice(deviceId: string): void {
		deleteMobileDevice(deviceId);
	}

	/**
	 * Send push notification to FCM token
	 */
	static SendPushNotification(
		fcmToken: string,
		message: { title: string; body: string },
	): void {
		sendPushNotification(fcmToken, message);
	}
}

