# Tenant Replication PostgreSQL Library

Multi-tenant database replication library with MTDD routing and gRPC support.

## Installation

```bash
npm install @advcomm/tenant_replication_postgres
```

## Firebase Configuration

The library supports Firebase for push notifications. You can configure Firebase in several ways:

### Method 1: Programmatic Configuration

```typescript
import { ActiveClients, FirebaseConfig } from '@advcomm/tenant_replication_postgres';

const firebaseConfig: FirebaseConfig = {
  type: "service_account",
  project_id: "your-project-id",
  private_key_id: "your-private-key-id",
  private_key: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  client_email: "your-service-account@your-project.iam.gserviceaccount.com",
  client_id: "your-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// Initialize Firebase with your config
ActiveClients.InitializeFirebase(firebaseConfig);
```

### Method 2: File Path Configuration

```typescript
import { ActiveClients } from '@advcomm/tenant_replication_postgres';

// Initialize with path to your Firebase service account file
ActiveClients.InitializeFirebase('./config/firebase-service-account.json');
```

### Method 3: Environment Variables

Set one of these environment variables:

```bash
# Option A: JSON string (recommended for containerized deployments)
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project",...}'

# Option B: File path
export FIREBASE_SERVICE_ACCOUNT_PATH='./config/firebase-service-account.json'
```

Then initialize without parameters:

```typescript
import { ActiveClients } from '@advcomm/tenant_replication_postgres';

// Will automatically use environment variables
ActiveClients.InitializeFirebase();
```

### Method 4: Default File (Backward Compatibility)

If no configuration is provided and no environment variables are set, the library will look for `firebase-service-account.json` in the library's helper directory (not recommended for production).

## Basic Usage

```typescript
import { InitializeReplication, ActiveClients } from '@advcomm/tenant_replication_postgres';
import express from 'express';
import knex from 'knex';

const app = express();
const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'username',
    password: 'password',
    database: 'database'
  }
});

// Initialize Firebase (choose one of the methods above)
ActiveClients.InitializeFirebase(yourFirebaseConfig);

// Initialize the replication routes
await InitializeReplication(app, db);

// Start your server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Firebase Helper Methods

```typescript
// Check if Firebase is initialized
if (ActiveClients.isFirebaseInitialized()) {
  console.log('Firebase is ready');
}

// Reset Firebase (useful for testing)
ActiveClients.resetFirebase();

// Get current configuration
const currentConfig = ActiveClients.getFirebaseConfig();
```

## Mobile Device Management

```typescript
// Add mobile device for push notifications
ActiveClients.AddMobileDevice('device-id-123', 'fcm-token-here');

// Remove mobile device
ActiveClients.DeleteMobileDevice('device-id-123');

// Send push notification
ActiveClients.SendPushNotification('fcm-token', {
  title: 'Notification Title',
  body: 'Notification message'
});
```

## Web Device Management

```typescript
// Add web device for real-time events (in Express route handler)
app.get('/events', (req, res) => {
  const deviceId = req.headers.deviceid;
  ActiveClients.AddWebDeviceEvent(deviceId, 'events', res);
  
  // Handle disconnection
  req.on('close', () => {
    ActiveClients.DeleteWebDevice(deviceId);
  });
});
```

## License

MIT