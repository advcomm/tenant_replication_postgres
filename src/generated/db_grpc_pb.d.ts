// package: db
// file: db.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as db_pb from "./db_pb";

interface IDBServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    executeQuery: IDBServiceService_IExecuteQuery;
    listenToChannel: IDBServiceService_IListenToChannel;
}

interface IDBServiceService_IExecuteQuery extends grpc.MethodDefinition<db_pb.QueryRequest, db_pb.QueryResponse> {
    path: "/db.DBService/ExecuteQuery";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<db_pb.QueryRequest>;
    requestDeserialize: grpc.deserialize<db_pb.QueryRequest>;
    responseSerialize: grpc.serialize<db_pb.QueryResponse>;
    responseDeserialize: grpc.deserialize<db_pb.QueryResponse>;
}
interface IDBServiceService_IListenToChannel extends grpc.MethodDefinition<db_pb.ChannelRequest, db_pb.ChannelMessage> {
    path: "/db.DBService/ListenToChannel";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<db_pb.ChannelRequest>;
    requestDeserialize: grpc.deserialize<db_pb.ChannelRequest>;
    responseSerialize: grpc.serialize<db_pb.ChannelMessage>;
    responseDeserialize: grpc.deserialize<db_pb.ChannelMessage>;
}

export const DBServiceService: IDBServiceService;

export interface IDBServiceServer extends grpc.UntypedServiceImplementation {
    executeQuery: grpc.handleUnaryCall<db_pb.QueryRequest, db_pb.QueryResponse>;
    listenToChannel: grpc.handleServerStreamingCall<db_pb.ChannelRequest, db_pb.ChannelMessage>;
}

export interface IDBServiceClient {
    executeQuery(request: db_pb.QueryRequest, callback: (error: grpc.ServiceError | null, response: db_pb.QueryResponse) => void): grpc.ClientUnaryCall;
    executeQuery(request: db_pb.QueryRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: db_pb.QueryResponse) => void): grpc.ClientUnaryCall;
    executeQuery(request: db_pb.QueryRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: db_pb.QueryResponse) => void): grpc.ClientUnaryCall;
    listenToChannel(request: db_pb.ChannelRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<db_pb.ChannelMessage>;
    listenToChannel(request: db_pb.ChannelRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<db_pb.ChannelMessage>;
}

export class DBServiceClient extends grpc.Client implements IDBServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public executeQuery(request: db_pb.QueryRequest, callback: (error: grpc.ServiceError | null, response: db_pb.QueryResponse) => void): grpc.ClientUnaryCall;
    public executeQuery(request: db_pb.QueryRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: db_pb.QueryResponse) => void): grpc.ClientUnaryCall;
    public executeQuery(request: db_pb.QueryRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: db_pb.QueryResponse) => void): grpc.ClientUnaryCall;
    public listenToChannel(request: db_pb.ChannelRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<db_pb.ChannelMessage>;
    public listenToChannel(request: db_pb.ChannelRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<db_pb.ChannelMessage>;
}
