/**
 * Protobuf Type Converters
 *
 * Converts between internal types and generated protobuf types
 * Updated to match actual MTDD and MTDDLookup service proto definitions
 */

import { StoredProcRequest, type StoredProcResponse } from '@/generated/db_pb';
import { TenantRequest, type TenantResponse } from '@/generated/lookup_pb';
import type { SqlParameters, SqlParameterValue } from '@/types';
import type { GrpcProcedureRequest, GrpcQueryRequest } from '@/types/grpc';

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
 * Create a StoredProcRequest protobuf message from GrpcQueryRequest
 */
export function createQueryRequest(
	request: GrpcQueryRequest,
): StoredProcRequest {
	const protoRequest = new StoredProcRequest();
	protoRequest.setQuery(request.query);
	protoRequest.setParamsList(
		convertParametersToProto((request.params as SqlParameters) || []),
	);
	return protoRequest;
}

/**
 * Create a StoredProcRequest protobuf message from GrpcProcedureRequest
 */
export function createProcedureRequest(
	request: GrpcProcedureRequest,
): StoredProcRequest {
	const protoRequest = new StoredProcRequest();
	protoRequest.setQuery(request.name); // Stored procedure name as query
	protoRequest.setParamsList(
		convertParametersToProto((request.params as SqlParameters) || []),
	);
	return protoRequest;
}

/**
 * Convert protobuf StoredProcResponse to JavaScript result
 * The response contains result as JSON string
 */
export function convertQueryResponse(response: StoredProcResponse): unknown {
	try {
		const resultString = response.getResult();

		// Parse the JSON result
		const rows = resultString ? JSON.parse(resultString) : [];

		// Return result in pg-compatible format
		return {
			rows: Array.isArray(rows) ? rows : [rows],
			rowCount: response.getRowcount(),
			command: response.getCommand(),
		};
	} catch (error) {
		// If parsing fails, return empty result
		return {
			rows: [],
			rowCount: 0,
			command: '',
		};
	}
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
