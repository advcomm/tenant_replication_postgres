/**
 * Firebase Client Management
 *
 * Handles Firebase initialization and configuration
 */

import admin from 'firebase-admin';
import { notificationLogger } from '@/utils/logger';
import type { FirebaseConfig } from './types';

/**
 * Firebase Client Manager
 */
export class FirebaseClientManager {
	private static instance: admin.app.App | null = null;
	private static config: FirebaseConfig | string | null = null;

	/**
	 * Initialize Firebase with custom configuration
	 * @param config - Firebase service account config object, file path, or null to use default
	 */
	static initialize(config?: FirebaseConfig | string | null): void {
		if (FirebaseClientManager.instance) {
			notificationLogger.warn(
				'Firebase already initialized, skipping re-initialization',
			);
			return;
		}

		let credential;

		if (config) {
			// Store the config for future use
			FirebaseClientManager.config = config;

			if (typeof config === 'string') {
				// Config is a file path
				try {
					credential = admin.credential.cert(require(config));
				} catch (error) {
					notificationLogger.error(
						{ path: config, error },
						'Failed to load Firebase config from path',
					);
					throw new Error(`Firebase config file not found at path: ${config}`);
				}
			} else {
				// Config is an object
				credential = admin.credential.cert(config as admin.ServiceAccount);
			}
		} else {
			// Try environment variable first, then fall back to default file
			const firebaseConfigPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
			const firebaseConfigEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

			if (firebaseConfigEnv) {
				try {
					const configObj = JSON.parse(firebaseConfigEnv);
					credential = admin.credential.cert(configObj);
				} catch (error) {
					notificationLogger.error(
						{ error },
						'Failed to parse Firebase config from environment variable',
					);
					throw new Error(
						'Invalid Firebase config in FIREBASE_SERVICE_ACCOUNT_JSON environment variable',
					);
				}
			} else if (firebaseConfigPath) {
				try {
					credential = admin.credential.cert(require(firebaseConfigPath));
				} catch (error) {
					notificationLogger.error(
						{ path: firebaseConfigPath, error },
						'Failed to load Firebase config from environment path',
					);
					throw new Error(
						`Firebase config file not found at path: ${firebaseConfigPath}`,
					);
				}
			} else {
				// Fall back to default file (for backward compatibility)
				try {
					credential = admin.credential.cert(
						require('../firebase-service-account.json'),
					);
					notificationLogger.warn(
						'Using default Firebase config file. Consider providing config via InitializeFirebase() or environment variables.',
					);
				} catch (error) {
					notificationLogger.error(
						{ error },
						'No Firebase configuration provided and default file not found',
					);
					throw new Error(
						'Firebase configuration required. Provide config via InitializeFirebase() method, FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH environment variable.',
					);
				}
			}
		}

		FirebaseClientManager.instance = admin.initializeApp({
			credential: credential,
		});
	}

	/**
	 * Get Firebase instance
	 */
	static getInstance(): admin.app.App | null {
		return FirebaseClientManager.instance;
	}

	/**
	 * Check if Firebase is initialized
	 */
	static isInitialized(): boolean {
		return FirebaseClientManager.instance !== null;
	}

	/**
	 * Reset Firebase instance (useful for testing or reconfiguration)
	 */
	static reset(): void {
		if (FirebaseClientManager.instance) {
			FirebaseClientManager.instance
				.delete()
				.catch((error) =>
					notificationLogger.error(
						{ error },
						'Error deleting Firebase instance',
					),
				);
		}
		FirebaseClientManager.instance = null;
		FirebaseClientManager.config = null;
	}

	/**
	 * Get current Firebase configuration (returns null if using default file)
	 */
	static getConfig(): FirebaseConfig | string | null {
		return FirebaseClientManager.config;
	}
}

