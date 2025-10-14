/**
 * gRPC Channel Listener
 *
 * Functions for listening to gRPC streaming channels
 */

import { parseResponse } from './utils';
import type { ChannelMessage } from '../../types/api';
import { grpcLogger } from '../../utils/logger';

/**
 * Listen to a gRPC channel with streaming
 * @param clients - gRPC client instances (typed as any[] - gRPC doesn't export client types)
 */
export function listenToChannel(
  clients: any[], // gRPC client type not exported
  channel: string,
  callback: (msg: ChannelMessage) => void,
): void {
  if (clients.length === 0) {
    grpcLogger.warn({ channel }, 'No backend servers available for channel listening');
    return;
  }

  // Use the first available server for channel listening
  const selectedClient = clients[0];
  grpcLogger.info({ channel }, 'Starting channel listener on server 0');

  const channelRequest = {
    channelName: channel,
  };

  const stream = selectedClient.listenToChannel(channelRequest);

  stream.on('data', (response: unknown) => {
    try {
      const parsedResponse = parseResponse(response) as {
        data: string;
        channelName: string;
        timestamp: string;
      };
      // Convert the gRPC response back to the expected format
      const msg: ChannelMessage = {
        payload: parsedResponse.data,
        channel: parsedResponse.channelName,
        timestamp: parsedResponse.timestamp,
      };
      callback(msg);
    } catch (error) {
      grpcLogger.error({ channel, error }, 'Error processing channel data');
    }
  });

  stream.on('error', (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    grpcLogger.error({ channel, error: errorMessage }, 'Channel stream error');
    // You could implement reconnection logic here
  });

  stream.on('end', () => {
    grpcLogger.info({ channel }, 'Channel stream ended');
    // You could implement reconnection logic here
  });
}
