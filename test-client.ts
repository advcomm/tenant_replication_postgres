// Simple gRPC client to test the server
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const PROTO_PATH = path.join(__dirname, 'proto/api.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const apiProto: any = grpc.loadPackageDefinition(packageDefinition).api;

// Try different ports to find the running server
const POSSIBLE_PORTS = ['50052', '50053', '50051'];
let client: any = null;

async function findRunningServer(): Promise<string> {
  for (const port of POSSIBLE_PORTS) {
    try {
      console.log(`🔍 Trying to connect to localhost:${port}...`);
      const testClient = new apiProto.ApiService(`localhost:${port}`, grpc.credentials.createInsecure());
      
      // Test connection with a simple call
      await new Promise((resolve, reject) => {
        const deadline = new Date();
        deadline.setSeconds(deadline.getSeconds() + 2); // 2 second timeout
        
        testClient.waitForReady(deadline, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(null);
          }
        });
      });
      
      console.log(`✅ Found server running on port ${port}`);
      return port;
    } catch (err) {
      console.log(`❌ Port ${port} not available`);
      continue;
    }
  }
  throw new Error('No gRPC server found on any of the expected ports');
}

// Test 1: Update (Unary) call
function testUpdateCall() {
  console.log('\n=== Testing Update (Unary) Call ===');
  
  const updateRequests = {
    requests: [
  {
    "TXID": 164712521398288409,
    "TableName": "tblcategories",
    "PK": 1745489231326123,
    "Action": 0,
    "PayLoad": {
        "New": JSON.stringify({"CategoryID":1745489231326123,"CategoryName":"Test 12323","LastUpdatedTXID":164712521398288408,"LastUpdated":"2025-04-24T15:07:11.326860","DeletedTXID":0}),
        "Old": null
    }
  },
  {
    "TXID": 164762767264383001,
    "TableName": "tblcategories",
    "PK": 1745489231326123,
    "Action": 1,
    "PayLoad": {
        "New": JSON.stringify({"CategoryID":1745489231326123,"CategoryName":"Test 12323","LastUpdatedTXID":164762767264383000,"LastUpdated":"2025-04-24T15:57:06.215326","DeletedTXID":0}),
        "Old": JSON.stringify({"CategoryID":1745489231326123,"CategoryName":"Test Category Updated","LastUpdatedTXID":164712521398288408,"LastUpdated":"2025-04-24T15:07:11.326860","DeletedTXID":0})
    }
  }
]
  };

  return new Promise((resolve, reject) => {
    // Add timeout for the unary call
    const timeout = setTimeout(() => {
      reject(new Error('Update call timed out after 10 seconds'));
    }, 10000);

    try {
      client.Update(updateRequests, (err: any, response: any) => {
        clearTimeout(timeout);
        if (err) {
          console.error('❌ Update call failed:', err.message);
          reject(err);
        } else {
          console.log('✅ Update response:', response);
          resolve(response);
        }
      });
    } catch (error: any) {
      clearTimeout(timeout);
      console.error('❌ Update call exception:', error.message);
      reject(error);
    }
  });
}

// Test 2: EventStream (Server streaming) call
function testEventStream() {
  console.log('\n=== Testing EventStream (Server Streaming) ===');
  
  return new Promise((resolve, reject) => {
    // Subscribe to events by sending device info
    const subscription = {
      deviceId: 'test-client-001',
      userAgent: 'test-browser/1.0'
    };
    
    const stream = client.EventStream(subscription);
    let messageCount = 0;
    let isResolved = false;
    
    // Handle responses from server
    stream.on('data', (message: any) => {
      console.log('✅ Received event from server:', message);
      messageCount++;
      
      // Parse the payload if it's JSON
      try {
        const eventData = JSON.parse(message.payload);
        console.log('📄 Event details:', eventData);
      } catch (e) {
        console.log('📄 Raw payload:', message.payload);
      }
    });
    
    stream.on('end', () => {
      console.log('✅ Stream ended by server');
      if (!isResolved) {
        isResolved = true;
        resolve(messageCount);
      }
    });
    
    stream.on('error', (err: any) => {
      console.error('❌ Stream error:', err.message);
      if (!isResolved) {
        isResolved = true;
        // Don't reject on CANCELLED error as it's expected when we cancel
        if (err.code === grpc.status.CANCELLED) {
          resolve(messageCount);
        } else {
          reject(err);
        }
      }
    });
    
    console.log('📡 Subscribed to event stream, waiting for events...');
    
    // Keep the stream open for 5 seconds to receive events (reduced time)
    setTimeout(() => {
      console.log('📤 Ending event stream subscription...');
      try {
        stream.cancel();
        // Give some time for cleanup before resolving
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            resolve(messageCount);
          }
        }, 500);
      } catch (error) {
        console.log('Stream already ended');
        if (!isResolved) {
          isResolved = true;
          resolve(messageCount);
        }
      }
    }, 5000);
  });
}

// Test 3: LoadData (Server streaming) call
function testLoadDataStream() {
  console.log('\n=== Testing LoadData (Server Streaming) ===');
  
  return new Promise((resolve, reject) => {
    const loadRequest = {
      deviceId: 'test-client-001',
      tableName: 'tblcategories', // Change this to a real table name in your database
      lastUpdated: '2023-01-01',   // Change this to test different dates
      TenantID: 1                  // Change this to your actual tenant ID
    };
    
    const stream = client.LoadData(loadRequest);
    let totalRowsReceived = 0;
    let chunksReceived = 0;
    
    // Handle responses from server
    stream.on('data', (response: any) => {
      if (response.status === 'error') {
        console.error('❌ LoadData error:', response.error);
        reject(new Error(response.error));
      } else if (response.status === 'streaming') {
        chunksReceived++;
        totalRowsReceived += response.rows.length;
        console.log(`📦 Chunk ${chunksReceived}: ${response.rows.length} rows (Total: ${totalRowsReceived})`);
        
        // Log first row of each chunk as sample (if any rows)
        if (response.rows.length > 0) {
          const sampleRow = response.rows[0];
          console.log('   📄 Sample row fields:', Object.keys(sampleRow.fields));
          console.log('   📋 Sample data:', sampleRow.fields);
        }
      } else if (response.status === 'completed') {
        console.log(`✅ LoadData completed! Total: ${totalRowsReceived} rows in ${chunksReceived} chunks`);
        resolve(totalRowsReceived);
      }
    });
    
    stream.on('end', () => {
      console.log('✅ LoadData stream ended by server');
      if (totalRowsReceived === 0) {
        resolve(0); // Handle case where no data was returned
      }
    });
    
    stream.on('error', (err: any) => {
      console.error('❌ LoadData stream error:', err.message);
      reject(err);
    });
    
    console.log(`📊 Requesting data from table '${loadRequest.tableName}' for tenant ${loadRequest.TenantID}...`);
  });
}

// Run tests
async function runTests() {
  console.log('🧪 Starting gRPC Client Tests...');
  
  try {
    // Find and connect to the running server
    const port = await findRunningServer();
    client = new apiProto.ApiService(`localhost:${port}`, grpc.credentials.createInsecure());
    
    console.log('🔗 Client connected successfully');
    
    // Test server streaming - EventStream
    console.log('▶️ Starting EventStream test...');
    await testEventStream();
    console.log('✅ EventStream test completed');
    
    // Wait longer before next test to ensure cleanup
    console.log('⏳ Waiting before next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test unary call - Update
    console.log('▶️ Starting Update test...');
    await testUpdateCall();
    console.log('✅ Update test completed');
    
    // Wait before final test
    console.log('⏳ Waiting before final test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test server streaming - LoadData
    console.log('▶️ Starting LoadData test...');
    await testLoadDataStream();
    console.log('✅ LoadData test completed');
  
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n💡 Make sure the gRPC server is running with: npm run dev');
    process.exit(1);
  }
}

runTests();
