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
 * Storage: tenantID -> { deviceId -> Response }
 * This allows multiple devices per tenant and efficient tenant-based broadcasting
 */

/**
 * Web clients storage: tenantID -> { deviceId -> Response }
 */
const webClients = new Map<string | number, Map<string, express.Response>>();

/**
 * Get all web clients (tenant-based map)
 */
export function getWebClients(): Map<
	string | number,
	Map<string, express.Response>
> {
	return webClients;
}

/**
 * Get all devices for a specific tenant
 * @param tenantId - Tenant identifier
 * @returns Map of deviceId -> Response, or undefined if tenant has no devices
 */
export function getTenantDevices(
	tenantId: string | number,
): Map<string, express.Response> | undefined {
	return webClients.get(tenantId);
}

/**
 * Add a web device event subscription
 * @param tenantId - Tenant identifier
 * @param deviceId - Unique device identifier
 * @param res - Express Response object for SSE
 */
export function addWebDeviceEvent(
	tenantId: string | number,
	deviceId: string,
	res: express.Response,
): void {
	if (!webClients.has(tenantId)) {
		webClients.set(tenantId, new Map());
	}
	webClients.get(tenantId)?.set(deviceId, res);
	notificationLogger.info(
		{ tenantId, deviceId, type: 'web' },
		'Device registered for tenant',
	);
}

/**
 * Delete a device for a tenant
 * @param tenantId - Tenant identifier
 * @param deviceId - Device identifier
 */
export function deleteWebDevice(
	tenantId: string | number,
	deviceId: string,
): void {
	const tenantDevices = webClients.get(tenantId);
	if (tenantDevices) {
		tenantDevices.delete(deviceId);

		// Remove tenant entry if no devices left
		if (tenantDevices.size === 0) {
			webClients.delete(tenantId);
		}

		notificationLogger.info(
			{ tenantId, deviceId, type: 'web' },
			'Device removed from tenant',
		);
	}
}

/**
 * Get device count for a tenant
 * @param tenantId - Tenant identifier
 * @returns Number of devices for the tenant
 */
export function getTenantDeviceCount(tenantId: string | number): number {
	return webClients.get(tenantId)?.size ?? 0;
}

/**
 * Get total number of tenants with active connections
 */
export function getTenantCount(): number {
	return webClients.size;
}

/**
 * Get total number of devices across all tenants
 */
export function getTotalDeviceCount(): number {
	let total = 0;
	for (const devices of webClients.values()) {
		total += devices.size;
	}
	return total;
}
