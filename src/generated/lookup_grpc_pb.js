// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var lookup_pb = require('./lookup_pb.js');

function serialize_lookup_TenantRequest(arg) {
  if (!(arg instanceof lookup_pb.TenantRequest)) {
    throw new Error('Expected argument of type lookup.TenantRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_lookup_TenantRequest(buffer_arg) {
  return lookup_pb.TenantRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_lookup_TenantResponse(arg) {
  if (!(arg instanceof lookup_pb.TenantResponse)) {
    throw new Error('Expected argument of type lookup.TenantResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_lookup_TenantResponse(buffer_arg) {
  return lookup_pb.TenantResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// Lookup service for tenant-to-shard mapping
// Maps tenant names to specific database shards
var LookupServiceService = exports.LookupServiceService = {
  // Get the shard location for a tenant
getTenantShard: {
    path: '/lookup.LookupService/GetTenantShard',
    requestStream: false,
    responseStream: false,
    requestType: lookup_pb.TenantRequest,
    responseType: lookup_pb.TenantResponse,
    requestSerialize: serialize_lookup_TenantRequest,
    requestDeserialize: deserialize_lookup_TenantRequest,
    responseSerialize: serialize_lookup_TenantResponse,
    responseDeserialize: deserialize_lookup_TenantResponse,
  },
  // Register a new tenant and assign to a shard
addTenantShard: {
    path: '/lookup.LookupService/AddTenantShard',
    requestStream: false,
    responseStream: false,
    requestType: lookup_pb.TenantRequest,
    responseType: lookup_pb.TenantResponse,
    requestSerialize: serialize_lookup_TenantRequest,
    requestDeserialize: deserialize_lookup_TenantRequest,
    responseSerialize: serialize_lookup_TenantResponse,
    responseDeserialize: deserialize_lookup_TenantResponse,
  },
};

exports.LookupServiceClient = grpc.makeGenericClientConstructor(LookupServiceService, 'LookupService');
