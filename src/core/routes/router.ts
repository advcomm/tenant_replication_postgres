import { Router, Request, Response } from 'express';
import ActiveClients from '../helper/activeClients';
import { RedisService } from '@advcomm/utils';
import { decodeAccessToken } from "@advcomm/utils/dist/helper/authenticationHelper";
import { BackendClient } from '../services/grpcClient';
import { Knex } from 'knex';
import { db as knexHelperDb } from '../helper/knexHelper';

const PortalInfo = JSON.parse(process.env.PortalInfo || '{}')!;

export function createCoreRoutes(dbConnection: Knex, constants: any): Router {
// Check if the provided dbConnection is the same as the one from knexHelper (which has MTDD enabled)
const db = dbConnection === knexHelperDb ? dbConnection : (() => {
  console.warn('⚠️ Warning: Provided dbConnection is not the same as knexHelper db instance. MTDD functionality may not be available.');
  console.warn('� Tip: Use the db instance from knexHelper to ensure MTDD functionality works correctly.');
  return dbConnection;
})();

const router = Router();

type TableName = keyof typeof constants.table_query_params;
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

router.get('/mtdd/Load', async (req: any, res: Response) => {
	const v_tableName = req.query.tableName;
	const v_lastUpdated = Number(req.query.lastUpdated);
	if (isNaN(v_lastUpdated))
		{
      res.status(400).send('Invalid lastUpdated parameter');
    return ;
    }
	console.log('v_tableName:', v_tableName, 'v_lastUpdated:', v_lastUpdated);
	if (!Object.hasOwn(constants.table_query_params, v_tableName)) {
		console.warn(`Invalid tableName: ${v_tableName}`);
		 res.status(400).json({
			error: 'Invalid tableName',
		});
    return;
	}
	const v_tid = req.tid as string;

	const positionalValues: any[] = [v_lastUpdated, v_tid];
	const params = constants.table_query_params[v_tableName as TableName];
	for (const param of params) positionalValues.push(req.query[param] ?? null);
	const argCount = 2 + params.length;
	const placeholders = Array.from(
		{ length: positionalValues.length },
		() => '?',
	).join(', ');
	const sql = `SELECT * FROM get_${v_tableName}(${placeholders})`;
	try {
		const result = await dbConnection.raw(sql, positionalValues);
		res.status(200).json(result.rows);
	} catch (error: any) {
		console.error(`❌ LoadData error:`, error);
		res
			.status(500)
			.json({ message: 'LoadData request failed', error: error.message });
	}
	return;
});



router.get("/events", async (req: any, res) => {
    // Handle authorization within this endpoint
    try {
      let authToken = req.headers["authorization"];
      
      // Check if authorization is provided in query parameters
      if (!authToken && req.query.token) {
        // Create authorization header from query parameter
        authToken = `Bearer ${req.query.token}`
        
        // Add authorization to headers for processing
        req.headers["authorization"] = authToken;
        console.log(`🔓 Using authorization from query parameter for events endpoint`);
      }
      
      // Validate authorization
      if (!authToken || !authToken.startsWith("Bearer ")) {
         res.status(422).json({
          message: 'Authorization required for events endpoint'
        });
        return;
      }

      // Extract and decode token
      req.token = authToken.split(" ")[1];
       const decoded: any = await decodeAccessToken(req);
      
      if (!decoded.IsSuccess) {
         res.status(401).json({
          message: 'Invalid token for events endpoint'
        });
        return;
      }

      // Extract auth values like in main middleware
      const { sub, tid, roles } = decoded.payload;
      req.sub = sub;
      req.tid = tid;
      req.roles = roles;
      
      console.log(`✅ Events endpoint authorized - User: ${sub}, TenantID: ${tid}, Roles: ${roles.join(', ')}`);

    } catch (authError: any) {
      console.error('❌ Events endpoint authentication failed:', authError.message);
       res.status(401).json({
        message: 'Authentication failed for events endpoint'
      });
      return;
    }

    // Continue with existing events logic
    const deviceId = (req.query?.deviceId || req.headers?.deviceid) as string;
    const mobileDevice = req.headers?.['user-agent'] as string;
  
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write("data: Connected\n\n");

    ActiveClients.AddWebDeviceEvent(deviceId, "events", res);

    console.log(`✅ Device registered: ${deviceId} for user: ${req.sub} (TenantID: ${req.tid})`);
  
    req.on("close", () => {
      ActiveClients.DeleteWebDevice(deviceId);
      console.log(`❌ Device disconnected: ${deviceId} for user: ${req.sub}`);
    });
  });

///Default channel listener if not any custom channel is provided.
  const listenChannel= async (msg:any) => {

          const { table, action, data } =process.env.NODE_ENV !== 'development' ?   JSON.parse(JSON.parse(msg.payload)): JSON.parse(msg.payload);
          const dataTenantID = data[PortalInfo?.TenantColumnName ?? ""] || data.TenantID;
          
        ///TODO: This is just for the issue of tenantName and ID. will resolve later after discussion.
        var result=  await db.raw("SELECT EntityName FROM tblEntities WHERE entityid = ?", [dataTenantID]);
          // Get Redis keys based on Foreign Key (e.g., VendorID)
      const vendorId = data.tenantid; // Adjust based on your schema

      const redisKey = `${table.toLowerCase()}:${PortalInfo.TenantColumnName}:${result.rows[0].entityname}`;
  
      const deviceEntries = await RedisService.getInstance().smembers(redisKey);
      if (deviceEntries.length > 0) {
        deviceEntries.forEach((view) => {
          const [deviceId, eventName] = view.split(":");
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

    if(process.env.NODE_ENV !== 'development'){
     BackendClient.ListenToChannel('table_changes', listenChannel);
    }else
    {

db.client.acquireConnection().then((pgClient: any) => {
  // Subscribe to a channel
  pgClient.query('LISTEN table_changes');

  // Handle notifications
  pgClient.on('notification', listenChannel);

  console.log("Listening on channel: table_changes");
});

      
    }
  
  return router;
}

export default createCoreRoutes;
