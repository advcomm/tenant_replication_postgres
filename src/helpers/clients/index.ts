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
	getFirebaseConfig,
	getFirebaseInstance,
	initializeFirebase,
	isFirebaseInitialized,
	resetFirebase,
} from './firebaseClient';
import {
	addMobileDevice,
	deleteMobileDevice,
	getMobileClients,
} from './mobileClients';
import { type PushMessage, sendPushNotification } from './pushNotifications';
import type { FirebaseConfig } from './types';
import {
	addWebDeviceEvent,
	deleteWebDevice,
	getTenantDevices,
	getWebClients,
} from './webClients';

// Re-export types
export type { FirebaseConfig, PushMessage };

/**
 * ActiveClients - Main API for managing client connections
 *
 * This is the public API that maintains backward compatibility
 * Implemented as an object literal to avoid static-only class pattern
 */
const ActiveClients = {
	/**
	 * Web clients map (for backward compatibility - direct access)
	 * Note: Structure changed to tenant-based: Map<tenantID, Map<deviceId, Response>>
	 */
	web: getWebClients(),

	/**
	 * Mobile clients map (for backward compatibility - direct access)
	 */
	mobile: getMobileClients(),

	/**
	 * Firebase app instance (for backward compatibility)
	 */
	get firebase() {
		return getFirebaseInstance();
	},

	/**
	 * Initialize Firebase with custom configuration
	 * @param config - Firebase service account config object, file path, or null to use default
	 */
	InitializeFirebase(config?: FirebaseConfig | string | null): void {
		initializeFirebase(config);
	},

	/**
	 * Check if Firebase is initialized
	 */
	isFirebaseInitialized(): boolean {
		return isFirebaseInitialized();
	},

	/**
	 * Reset Firebase instance (useful for testing or reconfiguration)
	 */
	resetFirebase(): void {
		resetFirebase();
	},

	/**
	 * Get current Firebase configuration
	 */
	getFirebaseConfig(): FirebaseConfig | string | null {
		return getFirebaseConfig();
	},

	/**
	 * Add a web device event subscription
	 * @param tenantId - Tenant identifier
	 * @param deviceId - Device identifier
	 * @param res - Express Response object for SSE
	 */
	AddWebDeviceEvent(
		tenantId: string | number,
		deviceId: string,
		res: express.Response,
	): void {
		addWebDeviceEvent(tenantId, deviceId, res);
	},

	/**
	 * Delete a web device for a tenant
	 * @param tenantId - Tenant identifier
	 * @param deviceId - Device identifier
	 */
	DeleteWebDevice(tenantId: string | number, deviceId: string): void {
		deleteWebDevice(tenantId, deviceId);
	},

	/**
	 * Get all devices for a tenant
	 * @param tenantId - Tenant identifier
	 * @returns Map of deviceId -> Response, or undefined if tenant has no devices
	 */
	GetTenantDevices(
		tenantId: string | number,
	): Map<string, express.Response> | undefined {
		return getTenantDevices(tenantId);
	},

	/**
	 * Add a mobile device with FCM token
	 */
	AddMobileDevice(deviceId: string, fcmToken: string): void {
		addMobileDevice(deviceId, fcmToken);
	},

	/**
	 * Delete a mobile device
	 */
	DeleteMobileDevice(deviceId: string): void {
		deleteMobileDevice(deviceId);
	},

	/**
	 * Send push notification to FCM token
	 */
	SendPushNotification(
		fcmToken: string,
		message: { title: string; body: string },
	): void {
		sendPushNotification(fcmToken, message);
	},
};

export default ActiveClients;
