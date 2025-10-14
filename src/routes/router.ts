import { RedisService } from '@advcomm/utils';
import { decodeAccessToken } from '@advcomm/utils/dist/helper/authenticationHelper';
import type { Response } from 'express';
import { Router } from 'express';
import type { Knex } from 'knex';
import type { AuthenticatedRequest, ChannelMessage } from '../types/api';
import ActiveClients from '../helpers/activeClients';
import { db as knexHelperDb } from '../helpers/knexHelper';
import { BackendClient } from '../services/grpcClient';
import { apiLogger, notificationLogger } from '../utils/logger';

const PortalInfo = JSON.parse(process.env.PortalInfo || '{}')!;

export function createCoreRoutes(dbConnection: Knex): Router {
	// Check if the provided dbConnection is the same as the one from knexHelper (which has MTDD enabled)
	const db =
		dbConnection === knexHelperDb
			? dbConnection
			: (() => {
					apiLogger.warn(
						'Provided dbConnection is not the same as knexHelper db instance. MTDD functionality may not be available.',
					);
					apiLogger.warn(
						'Tip: Use the db instance from knexHelper to ensure MTDD functionality works correctly.',
					);
					return dbConnection;
				})();

	const router = Router();

	class UpdatePayload {
		New!: {
			CategoryID: number;
			CategoryName: string;
			VendorID: number;
			LastUpdatedTXID: number;
			LastUpdated: number | null;
			DeletedTXID: number | null;
		};
		old!: {
			CategoryID: number;
			CategoryName: string;
			VendorID: number;
			LastUpdatedTXID: number;
			LastUpdated: number | null;
			DeletedTXID: number | null;
		} | null;
	}

	class UpdateRequest {
		TXID!: number;
		TableName!: string;
		PK!: number;
		Action!: number | null;
		PayLoad!: UpdatePayload;
	}

	// router.post("/update", async (req, res) => {

	//     let response: { success: string[], failed: any[] } = { success: [], failed: [] };
	//     const updates: UpdateRequest[] = req.body;
	//     const vendorID = 1; //req.headers.authorization;

	//     updates.sort((a, b) => a.TXID - b.TXID);

	//     if (!vendorID) {
	//         res.status(400).json({ error: "Missing authorization header" });
	//         return;
	//     }

	//     try {
	//         let currentTXID: number | null = null;
	//         for (const update of updates) {
	//             try {

	//                 const { TXID, TableName, PK, Action, PayLoad } = update;

	//                 currentTXID = TXID;
	//                 const primaryKeyColumn = tblPrimaryKeys.get(TableName);

	//                 // Verify vendor ownership
	//                 // const ownershipCheck = await DatabaseFacade.callProcedure('checkOwnerShip', [vendorID, PK, TableName], true);
	//                 // if (ownershipCheck === 0 && Action !== 0) {
	//                 //     res.status(403).json({ error: `VendorID ${vendorID} does not own the record with PK ${PK} in table ${TableName}` });
	//                 //     return;
	//                 // } else {

	//                 // }

	//                 if (Action === 0) {
	//                     // Insert operation
	//                     await DatabaseFacade.callProcedure(`add_${TableName}`, [vendorID, HR.ns(), PayLoad.New]);
	//                 } else if (Action === 1) {
	//                     // Update operation
	//                     await DatabaseFacade.callProcedure(`update_${TableName}`, [vendorID, HR.ns(), PayLoad.New]);
	//                 } else if (Action === null) {
	//                     // Delete operation
	//                     await DatabaseFacade.callProcedure(`delete_${TableName}`, [PK, vendorID, HR.ns(), TXID]);
	//                 } else {
	//                     throw new Error(`Invalid action type ${Action}`);
	//                 }

	//                 response.success.push(TXID.toString());
	//             }
	//             catch (err: any) {
	//                 currentTXID && response.failed.push({ TXID: currentTXID?.toString(), ErrorDetail: err.message });
	//             }
	//         }

	//     } catch (err) {
	//         console.error("Update Error:", err);
	//         res.status(500).json({ error: "Failed to process updates" });
	//     }
	//     res.json(response);
	// });

	router.get('/Load', async (req: AuthenticatedRequest, res: Response) => {
		const TenantID = req.tid;
		const sub = req.sub;
		const roles = req.roles || [];
		// const deviceId = req.headers?.deviceid as string;
		try {
			const { tableName, lastUpdated } = req.query;
			const deviceId = (req.query?.deviceId || req.headers?.deviceid) as string;
			apiLogger.info(
				{ tableName, user: sub, tenantId: TenantID, roles, lastUpdated },
				'LoadData request',
			);

			// Validate required parameters
			if (!tableName) {
				res.send({ error: 'Missing required parameters: tableName' });
				return;
			}

			//   var tenantShard=await  BackendClient.getTenantShard(TenantID);

			// const redisInstance = RedisService.getInstance();
			// await redisInstance.sadd(`${tableName}:${PortalInfo.TenantColumnName}:${TenantID}`, `${deviceId}:items_view`);

			// Default lastUpdated to current timestamp if not provided
			const lastUpdatedParam = lastUpdated || Date.now() * 1000;
			// Execute the database query using authenticated tenant ID
			const result = await db
				.raw(`SELECT * FROM get_${tableName}(?, ?)`, [
					lastUpdatedParam,
					TenantID,
				])
				.mtdd();

			apiLogger.debug({ result }, 'LoadData result');

			res.status(200).json(result.rows);
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			apiLogger.error({ error: errorMessage }, 'LoadData error');
			res
				.status(500)
				.json({ message: 'LoadData request failed', error: errorMessage });
		}
		return;
	});

	router.get('/events', async (req: AuthenticatedRequest, res: Response) => {
		// Handle authorization within this endpoint
		try {
			let authToken = req.headers['authorization'];

			// Check if authorization is provided in query parameters
			if (!authToken && req.query.token) {
				// Create authorization header from query parameter
				authToken = `Bearer ${req.query.token}`;

				// Add authorization to headers for processing
				req.headers['authorization'] = authToken;
				apiLogger.debug(
					'Using authorization from query parameter for events endpoint',
				);
			}

			// Validate authorization
			if (!authToken || !authToken.startsWith('Bearer ')) {
				return res.status(422).json({
					message: 'Authorization required for events endpoint',
				});
			}

			// Extract and decode token
			req.token = authToken.split(' ')[1];
			const decoded = (await decodeAccessToken(req)) as {
				IsSuccess: boolean;
				payload: { sub: string; tid: string; roles: string[] };
			};

			if (!decoded.IsSuccess) {
				return res.status(401).json({
					message: 'Invalid token for events endpoint',
				});
			}

			// Extract auth values like in main middleware
			const { sub, tid, roles } = decoded.payload;
			req.sub = sub;
			req.tid = tid;
			req.roles = roles;

			apiLogger.info(
				{ user: sub, tenantId: tid, roles },
				'Events endpoint authorized',
			);
		} catch (authError: unknown) {
			const errorMessage =
				authError instanceof Error ? authError.message : 'Unknown error';
			apiLogger.error(
				{ error: errorMessage },
				'Events endpoint authentication failed',
			);
			return res.status(401).json({
				message: 'Authentication failed for events endpoint',
			});
		}

		// Continue with existing events logic
		const deviceId = (req.query?.deviceId || req.headers?.deviceid) as string;
		const mobileDevice = req.headers?.['user-agent'] as string;

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.write('data: Connected\n\n');

		ActiveClients.AddWebDeviceEvent(deviceId, 'events', res);

		notificationLogger.info(
			{ deviceId, user: req.sub, tenantId: req.tid },
			'Device registered for events',
		);

		req.on('close', () => {
			ActiveClients.DeleteWebDevice(deviceId);
			notificationLogger.info(
				{ deviceId, user: req.sub },
				'Device disconnected from events',
			);
		});
	});

	///Default channel listener if not any custom channel is provided.
	const listenChannel = async (msg: ChannelMessage) => {
		const { table, action, data } =
			process.env.NODE_ENV !== 'development'
				? JSON.parse(JSON.parse(msg.payload))
				: JSON.parse(msg.payload);
		const dataTenantID =
			data[PortalInfo?.TenantColumnName ?? ''] || data.TenantID;

		///TODO: This is just for the issue of tenantName and ID. will resolve later after discussion.
		var result = await db
			.raw('SELECT EntityName FROM tblEntities WHERE entityid = ?', [
				dataTenantID,
			])
			.mtdd();
		// Get Redis keys based on Foreign Key (e.g., VendorID)
		const vendorId = data.tenantid; // Adjust based on your schema

		const redisKey = `${table.toLowerCase()}:${PortalInfo.TenantColumnName}:${result.rows[0].entityname}`;

		const deviceEntries = await RedisService.getInstance().smembers(redisKey);
		if (deviceEntries.length > 0) {
			deviceEntries.forEach((view) => {
				const [deviceId, eventName] = view.split(':');
				const deviceEvents = ActiveClients.web.get(deviceId);

				if (deviceEvents) {
					const res = deviceEvents.get('events');
					if (res) {
						res.write(`data: ${msg.payload}\n\n`);
					}
				}
			});
		}
	};

	if (process.env.NODE_ENV !== 'development') {
		BackendClient.ListenToChannel('table_changes', listenChannel);
	} else {
		db.client.acquireConnection().then((pgClient: any) => {
			// Subscribe to a channel
			// Note: pgClient is typed as 'any' here because we're using internal Knex/pg API
			pgClient.query('LISTEN table_changes');

			// Handle notifications
			pgClient.on('notification', listenChannel);

			notificationLogger.info(
				{ channel: 'table_changes' },
				'Listening on PostgreSQL channel',
			);
		});
	}

	return router;
}

export default createCoreRoutes;
