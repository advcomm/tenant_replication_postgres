/**
 * Web Client Management
 *
 * Manages web/SSE client connections
 */

import type express from 'express';
import { notificationLogger } from '@/utils/logger';

/**
 * Web Client Manager
 * Manages Server-Sent Events (SSE) connections for web clients
 */

/**
 * Web clients storage: deviceId -> { eventName -> Response }
 */
const webClients = new Map<string, Map<string, express.Response>>();

/**
 * Get all web clients
 */
export function getWebClients(): Map<string, Map<string, express.Response>> {
	return webClients;
}

/**
 * Add a web device event subscription
 * @param deviceId - Unique device identifier
 * @param eventName - Event channel name
 * @param res - Express Response object for SSE
 */
export function addWebDeviceEvent(
	deviceId: string,
	eventName: string,
	res: express.Response,
): void {
	if (!webClients.has(deviceId)) {
		webClients.set(deviceId, new Map());
	}
	webClients.get(deviceId)?.set(eventName, res);
	notificationLogger.info(
		{ deviceId, eventName, type: 'web' },
		'Device registered',
	);
}

/**
 * Delete a specific event subscription for a device
 * @param deviceId - Device identifier
 * @param eventName - Event channel name
 */
export function deleteWebDeviceEvents(deviceId: string, eventName: string): void {
	const deviceEvents = webClients.get(deviceId);
	if (deviceEvents) {
		deviceEvents.delete(eventName);

		// Remove device entirely if no events left
		if (deviceEvents.size === 0) {
			deleteWebDevice(deviceId);
		}
	}
}

/**
 * Delete a device and all its subscriptions
 * @param deviceId - Device identifier
 */
export function deleteWebDevice(deviceId: string): void {
	webClients.delete(deviceId);
	notificationLogger.info({ deviceId, type: 'web' }, 'Device removed');
}

/**
 * Get device event subscriptions
 * @param deviceId - Device identifier
 */
export function getWebDeviceEvents(deviceId: string): Map<string, express.Response> | undefined {
	return webClients.get(deviceId);
}

/**
 * Check if device has a specific event subscription
 * @param deviceId - Device identifier
 * @param eventName - Event channel name
 */
export function hasWebDeviceEvent(deviceId: string, eventName: string): boolean {
	return webClients.get(deviceId)?.has(eventName) ?? false;
}

