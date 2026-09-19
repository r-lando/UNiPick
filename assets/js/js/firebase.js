import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA6f-crfOeE4e7gDr8gNolAzqIqBsUqg7Y",
    authDomain: "unipick-e-commerce-web-app.firebaseapp.com",
    projectId: "unipick-e-commerce-web-app",
    storageBucket: "unipick-e-commerce-web-app.firebasestorage.app",
    messagingSenderId: "315041934524",
    appId: "1:315041934524:web:ba357dc818f868c19f74b9"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);ge


export { app, auth, db };
console.log("Firebase services initialized and exported for E-Mula.");

