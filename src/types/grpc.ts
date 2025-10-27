/**
 * gRPC Service Type Definitions
 *
 * Types for gRPC communication with backend servers
 */

/**
 * Channel Request for gRPC streaming
 */
export interface ChannelRequest {
	channelName: string;
}

/**
 * Channel Response from gRPC streaming
 */
export interface ChannelResponse {
	channelName: string;
	data: string;
	timestamp: string;
}

/**
 * gRPC Query Request
 */
export interface GrpcQueryRequest {
	query: string;
	params: unknown[];
}

/**
 * gRPC Procedure Call Request
 */
export interface GrpcProcedureRequest {
	name: string;
	params: unknown[];
	isFunction: boolean;
}

/**
 * Tenant Shard Request
 */
export interface TenantShardRequest {
	tenantName: string;
	tenantType: number;
}

/**
 * Tenant Shard Response
 */
export interface TenantShardResponse {
	rows: Array<{ shard_idx: number }>;
}

/**
 * gRPC Connection Options
 */
export interface GrpcConnectionOptions {
	'grpc.max_receive_message_length': number;
	'grpc.max_send_message_length': number;
	'grpc.ssl_target_name_override'?: string;
	'grpc.default_authority'?: string;
}
