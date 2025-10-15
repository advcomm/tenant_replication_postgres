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
export class WebClientManager {
	private static clients = new Map<string, Map<string, express.Response>>();

	/**
	 * Get all web clients
	 */
	static getClients(): Map<string, Map<string, express.Response>> {
		return WebClientManager.clients;
	}

	/**
	 * Add a web device event subscription
	 * @param deviceId - Unique device identifier
	 * @param eventName - Event channel name
	 * @param res - Express Response object for SSE
	 */
	static addDeviceEvent(
		deviceId: string,
		eventName: string,
		res: express.Response,
	): void {
		if (!WebClientManager.clients.has(deviceId)) {
			WebClientManager.clients.set(deviceId, new Map());
		}
		WebClientManager.clients.get(deviceId)?.set(eventName, res);
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
	static deleteDeviceEvents(deviceId: string, eventName: string): void {
		const deviceEvents = WebClientManager.clients.get(deviceId);
		if (deviceEvents) {
			deviceEvents.delete(eventName);

			// Remove device entirely if no events left
			if (deviceEvents.size === 0) {
				WebClientManager.deleteDevice(deviceId);
			}
		}
	}

	/**
	 * Delete a device and all its subscriptions
	 * @param deviceId - Device identifier
	 */
	static deleteDevice(deviceId: string): void {
		WebClientManager.clients.delete(deviceId);
		notificationLogger.info({ deviceId, type: 'web' }, 'Device removed');
	}

	/**
	 * Get device event subscriptions
	 * @param deviceId - Device identifier
	 */
	static getDeviceEvents(deviceId: string): Map<string, express.Response> | undefined {
		return WebClientManager.clients.get(deviceId);
	}

	/**
	 * Check if device has a specific event subscription
	 * @param deviceId - Device identifier
	 * @param eventName - Event channel name
	 */
	static hasDeviceEvent(deviceId: string, eventName: string): boolean {
		return WebClientManager.clients.get(deviceId)?.has(eventName) ?? false;
	}
}

