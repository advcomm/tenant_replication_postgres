/**
 * gRPC Channel Listener
 *
 * Functions for listening to gRPC streaming channels
 * Now using generated protobuf types!
 */

import type { DBServiceClient } from '@/generated/db_grpc_pb';
import {
	ChannelRequest,
	type ChannelMessage as ProtoChannelMessage,
} from '@/generated/db_pb';
import type { ChannelMessage } from '@/types/api';
import { grpcLogger } from '@/utils/logger';

/**
 * Listen to a gRPC channel with streaming
 * @param clients - Typed DB service clients
 */
export function listenToChannel(
	clients: DBServiceClient[],
	channel: string,
	callback: (msg: ChannelMessage) => void,
): void {
	if (clients.length === 0) {
		grpcLogger.warn(
			{ channel },
			'No backend servers available for channel listening',
		);
		return;
	}

	// Use the first available server for channel listening
	const selectedClient = clients[0];
	grpcLogger.info({ channel }, 'Starting channel listener on server 0');

	// Create protobuf request
	const protoRequest = new ChannelRequest();
	protoRequest.setChannel(channel);

	// Start streaming
	const stream = selectedClient.listenToChannel(protoRequest);

	stream.on('data', (protoMessage: ProtoChannelMessage) => {
		try {
			// Convert protobuf message to our internal format
			const msg: ChannelMessage = {
				payload: protoMessage.getPayload(),
				channel: protoMessage.getChannel(),
				timestamp: protoMessage.getTimestamp(),
			};
			callback(msg);
		} catch (error) {
			grpcLogger.error({ channel, error }, 'Error processing channel data');
		}
	});

	stream.on('error', (error: Error) => {
		grpcLogger.error({ channel, error: error.message }, 'Channel stream error');
		// You could implement reconnection logic here
	});

	stream.on('end', () => {
		grpcLogger.info({ channel }, 'Channel stream ended');
		// You could implement reconnection logic here
	});
}
