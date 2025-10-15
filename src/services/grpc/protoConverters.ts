/**
 * Protobuf Type Converters
 *
 * Converts between internal types and generated protobuf types
 */

import { QueryRequest, type QueryResponse, type Row } from '@/generated/db_pb';
import { TenantRequest, type TenantResponse } from '@/generated/lookup_pb';
import type { SqlParameters, SqlParameterValue } from '@/types';
import type { GrpcQueryRequest, GrpcProcedureRequest } from '@/types/grpc';

/**
 * Convert SQL parameter value to string for protobuf
 * Proto uses string array for flexibility
 */
export function convertParameterToString(value: SqlParameterValue): string {
	if (value === null || value === undefined) {
		return 'null';
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (value instanceof Buffer) {
		return value.toString('base64');
	}

	if (Array.isArray(value)) {
		return JSON.stringify(value);
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return String(value);
}

/**
 * Convert SqlParameters to string array for protobuf
 */
export function convertParametersToProto(params: SqlParameters): string[] {
	if (Array.isArray(params)) {
		return params.map(convertParameterToString);
	}

	// For named parameters, convert to array of values
	return Object.values(params).map(convertParameterToString);
}

/**
 * Create a QueryRequest protobuf message from GrpcQueryRequest
 */
export function createQueryRequest(request: GrpcQueryRequest): QueryRequest {
	const protoRequest = new QueryRequest();
	protoRequest.setQuery(request.query);
	protoRequest.setParamsList(
		convertParametersToProto((request.params as SqlParameters) || []),
	);
	return protoRequest;
}

/**
 * Create a QueryRequest protobuf message from GrpcProcedureRequest
 */
export function createProcedureRequest(
	request: GrpcProcedureRequest,
): QueryRequest {
	const protoRequest = new QueryRequest();
	protoRequest.setQuery(''); // No query for procedures
	protoRequest.setParamsList(
		convertParametersToProto((request.params as SqlParameters) || []),
	);
	protoRequest.setName(request.name);
	protoRequest.setIsFunction(request.isFunction);
	return protoRequest;
}

/**
 * Convert protobuf Row to JavaScript object
 */
export function convertProtoRowToObject(
	protoRow: Row,
): Record<string, unknown> {
	try {
		const jsonData = protoRow.getJsonData();
		return JSON.parse(jsonData);
	} catch (_error) {
		// If parsing fails, return empty object
		return {};
	}
}

/**
 * Convert protobuf QueryResponse to JavaScript result
 */
export function convertQueryResponse(response: QueryResponse): unknown {
	const rows = response.getRowsList().map(convertProtoRowToObject);

	// Return result in pg-compatible format
	return {
		rows,
		rowCount: response.getRowCount(),
		command: response.getCommand(),
		oid: response.getOid(),
	};
}

/**
 * Create a TenantRequest protobuf message
 */
export function createTenantRequest(
	tenantName: string,
	tenantType: number,
): TenantRequest {
	const request = new TenantRequest();
	request.setTenantName(tenantName);
	request.setTenantType(tenantType);
	return request;
}

/**
 * Convert TenantResponse to JavaScript object
 */
export function convertTenantResponse(response: TenantResponse): {
	tenant_id: string;
	shard_index: number;
} {
	return {
		tenant_id: response.getTenantId(),
		shard_index: response.getShardIndex(),
	};
}
