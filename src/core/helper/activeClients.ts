import admin from "firebase-admin";

export default class ActiveClients {
     static web = new Map<string, Map<string, any>>(); // { deviceId -> { eventName -> grpcStream } }
     static mobile = new Map<string, string>(); // { deviceId -> fcmToken }
    

     static firebase : admin.app.App | null = null ;

     static InitializeFirebase() {
       try {
         ActiveClients.firebase = admin.initializeApp({
           credential: admin.credential.cert(require("./firebase-service-account.json")),
         });
       } catch (error) {
         console.warn('Firebase service account not found, Firebase features will be disabled');
         ActiveClients.firebase = null;
       }
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


    static AddWebDeviceEvent(deviceId: string, eventName: string, stream: any) {
        if (!ActiveClients.web.has(deviceId)) {
            ActiveClients.web.set(deviceId, new Map());
        }
        ActiveClients.web.get(deviceId)?.set(eventName, stream);
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
        if(ActiveClients.firebase) {
          ActiveClients.mobile.set(deviceId, fcmToken);
          console.log(`✅ Mobile device registered: ${deviceId}`);
        } else {
          console.warn(`⚠️ Firebase not available, mobile device ${deviceId} not registered`);
        }
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