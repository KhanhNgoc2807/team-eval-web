import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get, child } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKVN3QEG5Ls5QfzbkHuApqKp69_AinJso",
  authDomain: "team-aa2b2.firebaseapp.com",
  databaseURL: "https://team-aa2b2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "team-aa2b2",
  storageBucket: "team-aa2b2.firebasestorage.app",
  messagingSenderId: "741645081687",
  appId: "1:741645081687:web:54ccb88f0080e4d6ea5712"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, onValue, get, child };
