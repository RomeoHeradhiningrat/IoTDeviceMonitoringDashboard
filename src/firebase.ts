import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBbCtWZDMtNB38YUfbWPSGe2F0vSOvm1n8",
  authDomain: "smart-dispenser-b4450.firebaseapp.com",
  databaseURL: "https://smart-dispenser-b4450-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-dispenser-b4450",
  storageBucket: "smart-dispenser-b4450.firebasestorage.app",
  messagingSenderId: "1075653503034",
  appId: "1:1075653503034:web:88370909f2535e8ffcad03",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const MASTER_EMAIL = "romeoheradhiningrat@gmail.com";
