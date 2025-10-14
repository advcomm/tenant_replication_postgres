/**
 * gRPC Channel Listener
 *
 * Functions for listening to gRPC streaming channels
 */

import { parseResponse } from './utils';
import type { ChannelMessage } from '../../types/api';

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
    console.log(`📡 No backend servers available for channel listening: ${channel}`);
    return;
  }

  // Use the first available server for channel listening
  const selectedClient = clients[0];
  console.log(`📡 Starting channel listener for '${channel}' on server 0`);

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
      console.error(`❌ Error processing channel data for ${channel}:`, error);
    }
  });

  stream.on('error', (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Channel stream error for ${channel}:`, errorMessage);
    // You could implement reconnection logic here
  });

  stream.on('end', () => {
    console.log(`📡 Channel stream ended for ${channel}`);
    // You could implement reconnection logic here
  });
}
