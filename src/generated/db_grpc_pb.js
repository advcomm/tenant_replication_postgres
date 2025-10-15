// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var db_pb = require('./db_pb.js');

function serialize_db_ChannelMessage(arg) {
  if (!(arg instanceof db_pb.ChannelMessage)) {
    throw new Error('Expected argument of type db.ChannelMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_db_ChannelMessage(buffer_arg) {
  return db_pb.ChannelMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_db_ChannelRequest(arg) {
  if (!(arg instanceof db_pb.ChannelRequest)) {
    throw new Error('Expected argument of type db.ChannelRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_db_ChannelRequest(buffer_arg) {
  return db_pb.ChannelRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_db_QueryRequest(arg) {
  if (!(arg instanceof db_pb.QueryRequest)) {
    throw new Error('Expected argument of type db.QueryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_db_QueryRequest(buffer_arg) {
  return db_pb.QueryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_db_QueryResponse(arg) {
  if (!(arg instanceof db_pb.QueryResponse)) {
    throw new Error('Expected argument of type db.QueryResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_db_QueryResponse(buffer_arg) {
  return db_pb.QueryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// Database Query Service
// Executes SQL queries and provides channel listening for real-time updates
var DBServiceService = exports.DBServiceService = {
  // Execute a SQL query with parameters
executeQuery: {
    path: '/db.DBService/ExecuteQuery',
    requestStream: false,
    responseStream: false,
    requestType: db_pb.QueryRequest,
    responseType: db_pb.QueryResponse,
    requestSerialize: serialize_db_QueryRequest,
    requestDeserialize: deserialize_db_QueryRequest,
    responseSerialize: serialize_db_QueryResponse,
    responseDeserialize: deserialize_db_QueryResponse,
  },
  // Listen to PostgreSQL NOTIFY/LISTEN channel (streaming)
listenToChannel: {
    path: '/db.DBService/ListenToChannel',
    requestStream: false,
    responseStream: true,
    requestType: db_pb.ChannelRequest,
    responseType: db_pb.ChannelMessage,
    requestSerialize: serialize_db_ChannelRequest,
    requestDeserialize: deserialize_db_ChannelRequest,
    responseSerialize: serialize_db_ChannelMessage,
    responseDeserialize: deserialize_db_ChannelMessage,
  },
};

exports.DBServiceClient = grpc.makeGenericClientConstructor(DBServiceService, 'DBService');
