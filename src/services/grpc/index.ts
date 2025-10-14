/**
 * gRPC Services Index
 *
 * Central export point for all gRPC-related functions and clients
 */

export { parseResponse, convertBigIntToString } from './utils';
export {
  backendServers,
  IS_SINGLE_SERVER_DEPLOYMENT,
  createGrpcConnectionOptions,
  createGrpcCredentials,
} from './config';
export { clients, lookupClient } from './clientSetup';
export {
  callAllServersRace,
  callAllServersAny,
  callAllServersAll,
  callSpecificServer,
  callSpecificServerByShard,
} from './serverCalls';
export { getTenantShard, addTenantShard } from './lookupService';

