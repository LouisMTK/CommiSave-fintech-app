const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
  if (firebaseConfig.projectId === 'YOUR_PROJECT_ID' || firebaseConfig.apiKey === 'YOUR_API_KEY') {
    console.warn('Replace the placeholder Firebase settings in firebase-config.js to enable auth and Firestore.');
  } else {
    firebase.initializeApp(firebaseConfig);
  }
}
