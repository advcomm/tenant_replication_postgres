/**
 * Type Definitions Index
 *
 * Central export point for all type definitions used across the library
 */

// API request/response types
export type {
	AuthenticatedRequest,
	ChannelMessage,
	ErrorResponse,
	LoadDataQuery,
	SuccessResponse,
	TableChangeNotification,
	UpdatePayload,
	UpdateRequest,
} from './api';
// Configuration types
export type {
	LibraryConfig,
	MtddBackendConfig,
	PortalConfig,
} from './config';
// gRPC service types
export type {
	ChannelRequest,
	ChannelResponse,
	GrpcConnectionOptions,
	GrpcProcedureRequest,
	GrpcQueryRequest,
	TenantShardRequest,
	TenantShardResponse,
} from './grpc';
// MTDD (Multi-Tenant Database Deployment) types
export type { MtddMeta, SqlResult } from './mtdd';
// SQL query and parameter types
export type {
	KnexQueryObject,
	SqlParameters,
	SqlParameterValue,
} from './sql';
export { isKnexQueryObject } from './sql';
// gRPC client types now imported from generated protobuf files:
// - DBServiceClient from '@/generated/db_grpc_pb'
// - LookupServiceClient from '@/generated/lookup_grpc_pb'
