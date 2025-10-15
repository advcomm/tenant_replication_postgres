// package: db
// file: db.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class QueryRequest extends jspb.Message { 
    getQuery(): string;
    setQuery(value: string): QueryRequest;
    clearParamsList(): void;
    getParamsList(): Array<string>;
    setParamsList(value: Array<string>): QueryRequest;
    addParams(value: string, index?: number): string;
    getName(): string;
    setName(value: string): QueryRequest;
    getIsFunction(): boolean;
    setIsFunction(value: boolean): QueryRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): QueryRequest.AsObject;
    static toObject(includeInstance: boolean, msg: QueryRequest): QueryRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: QueryRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): QueryRequest;
    static deserializeBinaryFromReader(message: QueryRequest, reader: jspb.BinaryReader): QueryRequest;
}

export namespace QueryRequest {
    export type AsObject = {
        query: string,
        paramsList: Array<string>,
        name: string,
        isFunction: boolean,
    }
}

export class QueryResponse extends jspb.Message { 
    clearRowsList(): void;
    getRowsList(): Array<Row>;
    setRowsList(value: Array<Row>): QueryResponse;
    addRows(value?: Row, index?: number): Row;
    getRowCount(): number;
    setRowCount(value: number): QueryResponse;
    getCommand(): string;
    setCommand(value: string): QueryResponse;
    getOid(): number;
    setOid(value: number): QueryResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): QueryResponse.AsObject;
    static toObject(includeInstance: boolean, msg: QueryResponse): QueryResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: QueryResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): QueryResponse;
    static deserializeBinaryFromReader(message: QueryResponse, reader: jspb.BinaryReader): QueryResponse;
}

export namespace QueryResponse {
    export type AsObject = {
        rowsList: Array<Row.AsObject>,
        rowCount: number,
        command: string,
        oid: number,
    }
}

export class Row extends jspb.Message { 
    getJsonData(): string;
    setJsonData(value: string): Row;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Row.AsObject;
    static toObject(includeInstance: boolean, msg: Row): Row.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Row, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Row;
    static deserializeBinaryFromReader(message: Row, reader: jspb.BinaryReader): Row;
}

export namespace Row {
    export type AsObject = {
        jsonData: string,
    }
}

export class ChannelRequest extends jspb.Message { 
    getChannel(): string;
    setChannel(value: string): ChannelRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChannelRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ChannelRequest): ChannelRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChannelRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChannelRequest;
    static deserializeBinaryFromReader(message: ChannelRequest, reader: jspb.BinaryReader): ChannelRequest;
}

export namespace ChannelRequest {
    export type AsObject = {
        channel: string,
    }
}

export class ChannelMessage extends jspb.Message { 
    getChannel(): string;
    setChannel(value: string): ChannelMessage;
    getPayload(): string;
    setPayload(value: string): ChannelMessage;
    getTimestamp(): string;
    setTimestamp(value: string): ChannelMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChannelMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ChannelMessage): ChannelMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChannelMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChannelMessage;
    static deserializeBinaryFromReader(message: ChannelMessage, reader: jspb.BinaryReader): ChannelMessage;
}

export namespace ChannelMessage {
    export type AsObject = {
        channel: string,
        payload: string,
        timestamp: string,
    }
}
