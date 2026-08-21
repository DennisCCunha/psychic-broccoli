// Get these values from Firebase Console → Project Settings → Your apps → SDK setup and configuration
// Free plan (Spark) is enough. Enable Realtime Database and set rules to allow read/write.
// Recommended rules for development:
//   { "rules": { ".read": true, ".write": true } }
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL: 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
