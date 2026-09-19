import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// Global Listener for ANY "Add to Cart" button on the page
document.addEventListener("click", async (e) => {
  // Check if the clicked element is a cart button
  if (e.target && e.target.classList.contains("cart-btn")) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.target;
    const user = auth.currentUser;

    // 1. Force Login
    if (!user) {
      alert("Please login to add items to your cart.");
      window.location.href = "login.html";
      return;
    }

    // 2. Get Product Data from the HTML card
    // Note: We need the product ID. 
    // You must ensure your HTML generation in index.js/category.html adds data-id to the button
    // OR we find the closest link to get the ID.
    
    // Let's assume the button is inside a card. We need the ID.
    // The best way is to look at the 'a' tag nearby or store ID on the button.
    const card = btn.closest(".product-item");
    if (!card) return;

    const link = card.querySelector(".product-name a");
    const urlParams = new URLSearchParams(link.href.split('?')[1]);
    const productId = urlParams.get("id");
    
    const name = card.querySelector(".product-name").innerText.trim();
    const priceText = card.querySelector(".product-price").innerText.replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText);
    const image = card.querySelector("img").src;

    if (!productId) {
      console.error("Product ID not found");
      return;
    }

    // 3. Add to Firestore
    btn.innerHTML = "Adding...";
    btn.disabled = true;

    try {
      const cartRef = doc(db, "carts", user.uid, "items", productId);
      const docSnap = await getDoc(cartRef);

      if (docSnap.exists()) {
        await updateDoc(cartRef, {
          quantity: docSnap.data().quantity + 1,
          totalPrice: (docSnap.data().quantity + 1) * price
        });
      } else {
        await setDoc(cartRef, {
          productId: productId,
          name: name,
          price: price,
          image: image,
          quantity: 1,
          totalPrice: price,
          timestamp: new Date()
        });
      }
      alert("Added to cart!");
    } catch (err) {
      console.error(err);
      alert("Error adding item.");
    } finally {
      btn.innerHTML = "Add to Cart";
      btn.disabled = false;
    }
  }
});