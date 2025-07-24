
try {
  process.loadEnvFile?.('.env');
} catch (err) {
  console.log('No .env file found, using default values');
}

// Initialize the appropriate backend client
import { BackendClient } from './core/services/grpcClient';
import { getCurrentBackendClient } from './core/services/mockClient';
import { startGrpcServer } from './core/services/grpcServer';
import { loadCustomStreamHandlers } from './extension/plugins/loader';


//const CurrentBackendClient = getCurrentBackendClient();
//CurrentBackendClient.initialize(JSON.parse(process.env.DB_CONFIG || '{}')); } from '@advcomm/dbfacade';

// Load .env file if it exists

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// Load extension stream handlers
loadCustomStreamHandlers();

// Initialize both DatabaseFacade (for channel listening) and BackendClient (for procedure calls)
//console.log('� Initializing database connections...');
//DatabaseFacade.initialize(JSON.parse(process.env.DB_CONFIG || '{}'));
//BackendClient.initialize(JSON.parse(process.env.DB_CONFIG || '{}'));

// Start gRPC server
const PORT = process.env.GRPC_PORT || '50051';
console.log(`🚀 Starting gRPC server on port ${PORT}...`);
startGrpcServer(PORT);


