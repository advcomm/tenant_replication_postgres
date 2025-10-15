// package: lookup
// file: lookup.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class TenantRequest extends jspb.Message { 
    getTenantName(): string;
    setTenantName(value: string): TenantRequest;
    getTenantType(): number;
    setTenantType(value: number): TenantRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TenantRequest.AsObject;
    static toObject(includeInstance: boolean, msg: TenantRequest): TenantRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TenantRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TenantRequest;
    static deserializeBinaryFromReader(message: TenantRequest, reader: jspb.BinaryReader): TenantRequest;
}

export namespace TenantRequest {
    export type AsObject = {
        tenantName: string,
        tenantType: number,
    }
}

export class TenantResponse extends jspb.Message { 
    getTenantId(): string;
    setTenantId(value: string): TenantResponse;
    getShardIndex(): number;
    setShardIndex(value: number): TenantResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TenantResponse.AsObject;
    static toObject(includeInstance: boolean, msg: TenantResponse): TenantResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TenantResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TenantResponse;
    static deserializeBinaryFromReader(message: TenantResponse, reader: jspb.BinaryReader): TenantResponse;
}

export namespace TenantResponse {
    export type AsObject = {
        tenantId: string,
        shardIndex: number,
    }
}
