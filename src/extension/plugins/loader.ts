
// Extension loader for custom stream handlers
import { registerStreamHandler, broadcastEvent, sendEventToClient } from '../../core/services/grpcServer';

// Example: register a custom stream handler
export function loadCustomStreamHandlers() {
  // Register a custom handler that logs all new connections
  registerStreamHandler((call) => {
    console.log('🔌 Custom extension handler activated for new event stream');
    
    // Send a welcome message from the extension
    setTimeout(() => {
      call.write({
        deviceId: 'extension',
        userAgent: '',
        payload: JSON.stringify({
          type: 'extension_welcome',
          message: 'Welcome message from extension system',
          timestamp: new Date().toISOString()
        })
      });
    }, 1000);
  });
  
  // Example: Send periodic broadcast events
  setInterval(() => {
    
    broadcastEvent({
      type: 'system_status',
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  }, 10000); // Every 10 seconds
  
  console.log('✅ Custom stream handlers loaded');
}