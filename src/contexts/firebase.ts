// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAy-ElSswFhDrejhXcs_MsUaWgG-2cnbGM",
  authDomain: "cryonics-em.firebaseapp.com",
  databaseURL: "https://cryonics-em-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cryonics-em",
  storageBucket: "cryonics-em.firebasestorage.app",
  messagingSenderId: "907895762193",
  appId: "1:907895762193:web:5122aecfcbefbf309d70b0",
  measurementId: "G-REF63WLHL7"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  // If no apps are initialized, go ahead and initialize the default app
  app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized!");
} else {
  // If an app is already initialized, get a reference to the default app
  app = getApp();
  console.log("Firebase app already initialized, getting existing app.");
}
// const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export const db = getDatabase(app);
export { auth, provider };
