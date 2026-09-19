import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- 1. CONFIGURATION ---
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
const db = getFirestore(app);

// --- 2. DOM ELEMENTS ---
const cartBadge = document.getElementById("cart-badge-count");
const cartLink = document.querySelector('a[href="cart.html"]'); 

// --- 3. AUTH & BADGE LOGIC ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // [LOGGED IN]
    // We strictly use the Auth UID. No Local Storage.
    const userId = user.uid;

    if (cartBadge) {
      cartBadge.style.display = ""; // Make badge visible
      listenToCartCount(userId);    // Fetch data from Firestore
    }
  } else {
    // [LOGGED OUT]
    if (cartBadge) {
      cartBadge.style.display = "none"; // Hide badge
      cartBadge.textContent = "0";
    }

    // Security: Kick user out if they are on the cart page
    if (window.location.pathname.includes("cart.html")) {
        window.location.href = "login.html";
    }
  }
});

// --- 4. CLICK INTERCEPTION ---
// Prevents clicking the cart icon if not logged in
if (cartLink) {
  cartLink.addEventListener("click", (e) => {
    const user = auth.currentUser;
    if (!user) {
      e.preventDefault(); 
      window.location.href = "login.html"; 
    }
  });
}

// --- 5. FIRESTORE LISTENER ---
function listenToCartCount(userId) {
  // STRICT PATH: carts / {user.uid} / items
  const cartRef = collection(db, "carts", userId, "items");
  
  onSnapshot(cartRef, (snapshot) => {
    let count = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Add up the quantity of each item
      count += Number(data.quantity || 0);
    });

    if (cartBadge) {
      cartBadge.textContent = count;
    }
  });
}