import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔥 Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDSLZgCX72KumWj2QGzG92Qv_eNJKw_rKg",
    authDomain: "gestorrestaurants.firebaseapp.com",
    projectId: "gestorrestaurants",
    storageBucket: "gestorrestaurants.firebasestorage.app",
    messagingSenderId: "488656890149",
    appId: "1:488656890149:web:a2f7d6731d79d6187992cc",
    measurementId: "G-78RZJ92WRZ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
