// package: lookup
// file: lookup.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as lookup_pb from "./lookup_pb";

interface ILookupServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getTenantShard: ILookupServiceService_IGetTenantShard;
    addTenantShard: ILookupServiceService_IAddTenantShard;
}

interface ILookupServiceService_IGetTenantShard extends grpc.MethodDefinition<lookup_pb.TenantRequest, lookup_pb.TenantResponse> {
    path: "/lookup.LookupService/GetTenantShard";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<lookup_pb.TenantRequest>;
    requestDeserialize: grpc.deserialize<lookup_pb.TenantRequest>;
    responseSerialize: grpc.serialize<lookup_pb.TenantResponse>;
    responseDeserialize: grpc.deserialize<lookup_pb.TenantResponse>;
}
interface ILookupServiceService_IAddTenantShard extends grpc.MethodDefinition<lookup_pb.TenantRequest, lookup_pb.TenantResponse> {
    path: "/lookup.LookupService/AddTenantShard";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<lookup_pb.TenantRequest>;
    requestDeserialize: grpc.deserialize<lookup_pb.TenantRequest>;
    responseSerialize: grpc.serialize<lookup_pb.TenantResponse>;
    responseDeserialize: grpc.deserialize<lookup_pb.TenantResponse>;
}

export const LookupServiceService: ILookupServiceService;

export interface ILookupServiceServer extends grpc.UntypedServiceImplementation {
    getTenantShard: grpc.handleUnaryCall<lookup_pb.TenantRequest, lookup_pb.TenantResponse>;
    addTenantShard: grpc.handleUnaryCall<lookup_pb.TenantRequest, lookup_pb.TenantResponse>;
}

export interface ILookupServiceClient {
    getTenantShard(request: lookup_pb.TenantRequest, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    getTenantShard(request: lookup_pb.TenantRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    getTenantShard(request: lookup_pb.TenantRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    addTenantShard(request: lookup_pb.TenantRequest, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    addTenantShard(request: lookup_pb.TenantRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    addTenantShard(request: lookup_pb.TenantRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
}

export class LookupServiceClient extends grpc.Client implements ILookupServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public getTenantShard(request: lookup_pb.TenantRequest, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    public getTenantShard(request: lookup_pb.TenantRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    public getTenantShard(request: lookup_pb.TenantRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    public addTenantShard(request: lookup_pb.TenantRequest, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    public addTenantShard(request: lookup_pb.TenantRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
    public addTenantShard(request: lookup_pb.TenantRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: lookup_pb.TenantResponse) => void): grpc.ClientUnaryCall;
}
