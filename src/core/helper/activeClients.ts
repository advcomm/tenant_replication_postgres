import express from 'express';
import admin from "firebase-admin";

/**
 * Firebase Service Account Configuration Interface
 * Use this interface when providing Firebase configuration programmatically
 */
export interface FirebaseConfig {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

/**
 * ActiveClients class for managing web and mobile device connections with Firebase support
 * 
 * @example
 * ```typescript
 * import { ActiveClients, FirebaseConfig } from '@advcomm/tenant_replication_postgres';
 * 
 * // Option 1: Initialize with config object
 * const firebaseConfig: FirebaseConfig = {
 *   type: "service_account",
 *   project_id: "your-project-id",
 *   private_key: "-----BEGIN PRIVATE KEY-----\n...",
 *   client_email: "your-service-account@your-project.iam.gserviceaccount.com"
 *   // ... other config properties
 * };
 * ActiveClients.InitializeFirebase(firebaseConfig);
 * 
 * // Option 2: Initialize with file path
 * ActiveClients.InitializeFirebase('./path/to/firebase-service-account.json');
 * 
 * // Option 3: Use environment variables
 * // Set FIREBASE_SERVICE_ACCOUNT_JSON with stringified JSON config
 * // or FIREBASE_SERVICE_ACCOUNT_PATH with file path
 * ActiveClients.InitializeFirebase(); // Will use environment variables or fall back to default
 * 
 * // Then use normally
 * ActiveClients.AddMobileDevice('device123', 'fcm-token-here');
 * ```
 */
export default class ActiveClients {
     static web = new Map<string, Map<string, express.Response>>(); // { deviceId -> { eventName -> res } }
     static mobile = new Map<string, string>(); // { deviceId -> fcmToken }
    

     static firebase : admin.app.App | null = null ;
     private static firebaseConfig: FirebaseConfig | string | null = null;

     /**
      * Initialize Firebase with custom configuration
      * @param config - Firebase service account config object, file path, or null to use default
      */
     static InitializeFirebase(config?: FirebaseConfig | string | null) {
       if (ActiveClients.firebase) {
         console.warn('Firebase already initialized, skipping re-initialization');
         return;
       }

       let credential;

       if (config) {
         // Store the config for future use
         ActiveClients.firebaseConfig = config;
         
         if (typeof config === 'string') {
           // Config is a file path
           try {
             credential = admin.credential.cert(require(config));
           } catch (error) {
             console.error(`Failed to load Firebase config from path: ${config}`, error);
             throw new Error(`Firebase config file not found at path: ${config}`);
           }
         } else {
           // Config is an object
           credential = admin.credential.cert(config as admin.ServiceAccount);
         }
       } else {
         // Try environment variable first, then fall back to default file
         const firebaseConfigPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
         const firebaseConfigEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
         
         if (firebaseConfigEnv) {
           try {
             const configObj = JSON.parse(firebaseConfigEnv);
             credential = admin.credential.cert(configObj);
           } catch (error) {
             console.error('Failed to parse Firebase config from environment variable', error);
             throw new Error('Invalid Firebase config in FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
           }
         } else if (firebaseConfigPath) {
           try {
             credential = admin.credential.cert(require(firebaseConfigPath));
           } catch (error) {
             console.error(`Failed to load Firebase config from environment path: ${firebaseConfigPath}`, error);
             throw new Error(`Firebase config file not found at path: ${firebaseConfigPath}`);
           }
         } else {
           // Fall back to default file (for backward compatibility)
           try {
             credential = admin.credential.cert(require("./firebase-service-account.json"));
             console.warn('Using default Firebase config file. Consider providing config via InitializeFirebase() or environment variables.');
           } catch (error) {
             console.error('No Firebase configuration provided and default file not found', error);
             throw new Error('Firebase configuration required. Provide config via InitializeFirebase() method, FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH environment variable.');
           }
         }
       }

       ActiveClients.firebase = admin.initializeApp({
         credential: credential,
       });
     }

     /**
      * Check if Firebase is initialized
      */
     static isFirebaseInitialized(): boolean {
       return ActiveClients.firebase !== null;
     }

     /**
      * Reset Firebase instance (useful for testing or reconfiguration)
      */
     static resetFirebase() {
       if (ActiveClients.firebase) {
         ActiveClients.firebase.delete().catch(console.error);
       }
       ActiveClients.firebase = null;
       ActiveClients.firebaseConfig = null;
     }

     /**
      * Get current Firebase configuration (returns null if using default file)
      */
     static getFirebaseConfig(): FirebaseConfig | string | null {
       return ActiveClients.firebaseConfig;
     }

    static DeleteWebDeviceEvents(deviceId: string, eventName: string) {
        const deviceEvents = ActiveClients.web.get(deviceId);
        if (deviceEvents) {
          deviceEvents.delete(eventName);
    
          if (deviceEvents.size === 0) {
           this.DeleteWebDevice(deviceId);
          }
        }
    }


    static AddWebDeviceEvent(deviceId: string, eventName: string, res: express.Response) {
        if (!ActiveClients.web.has(deviceId)) {
            ActiveClients.web.set(deviceId, new Map());
        }
        ActiveClients.web.get(deviceId)?.set(eventName, res);
        console.log(`✅ Device registered: ${deviceId}`);
    }

    static DeleteWebDevice(deviceId: string) {
        ActiveClients.web.delete(deviceId);
        console.log(`❌ Device ${deviceId} removed completely`);
    }


    static AddMobileDevice(deviceId: string, fcmToken: string) {
        if(ActiveClients.firebase === null) {
          ActiveClients.InitializeFirebase();
        }
        ActiveClients.mobile.set(deviceId, fcmToken);
        console.log(`✅ Device registered: ${deviceId}`);
    }

   static DeleteMobileDevice(deviceId: string) {
        ActiveClients.mobile.delete(deviceId);
        console.log(`❌ Device ${deviceId} removed completely`);
    }

    static SendPushNotification(fcmToken: string, message: { title: string; body: string }) {
      if (!ActiveClients.firebase) {
        throw new Error("Firebase not initialized");
      }
    
      const counter = ActiveClients.mobile.size;
      const payload = {
        token: fcmToken,
        data: message
      };
    
      admin
        .messaging()
        .send(payload)
        .then((response) => console.log("📢 Push sent:", response))
        .catch((err) => console.error("❌ Push failed:", err));
    }


} 