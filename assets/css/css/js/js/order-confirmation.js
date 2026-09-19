import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

async function loadConfirmation() {
  // 1. Get Order ID from URL
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!orderId) {
    document.querySelector(".main-content").innerHTML = "<h3>No order ID found.</h3>";
    return;
  }

  // 2. Wait for Auth (Optional for security, but good practice)
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // You might want to allow viewing if you have the ID, 
        // but typically you want them logged in.
        // window.location.href = "login.html"; 
    }

    try {
      const docRef = doc(db, "orders", orderId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        document.querySelector(".main-content").innerHTML = "<h3>Order not found.</h3>";
        return;
      }

      const order = snap.data();
      renderOrder(orderId, order);

    } catch (error) {
      console.error("Error loading order:", error);
    }
  });
}

function renderOrder(id, data) {
  // A. Header Info
  document.getElementById("order-id-display").textContent = `Order #${id.slice(0, 8).toUpperCase()}`;
  
  // Format Date
  const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
  document.getElementById("order-date-display").textContent = dateObj.toLocaleDateString("en-US", {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // B. Totals
  document.getElementById("summary-subtotal").textContent = "₱" + data.totals.subtotal.toFixed(2);
  document.getElementById("summary-shipping").textContent = "₱" + data.totals.shipping.toFixed(2);
  // Assuming tax is 0 based on previous logic, or calculate it
  const tax = data.totals.tax || 0;
  document.getElementById("summary-tax").textContent = "₱" + tax.toFixed(2);
  document.getElementById("summary-total").textContent = "₱" + data.totals.total.toFixed(2);

  // C. Shipping Address
  const ship = data.shippingInfo;
  const addressHTML = `
    ${ship.firstName} ${ship.lastName}<br>
    ${ship.address}<br>
    ${ship.apartment ? ship.apartment + '<br>' : ''}
    ${ship.city}, ${ship.zip}
  `;
  document.getElementById("shipping-address-display").innerHTML = addressHTML;
  document.getElementById("contact-email-display").innerHTML = `<i class="bi bi-envelope"></i> ${ship.email}`;
  document.getElementById("contact-phone-display").innerHTML = `<i class="bi bi-telephone"></i> ${ship.phone}`;

  // D. Payment Method
  document.getElementById("payment-method-display").textContent = data.paymentMethod || "Cash on Pickup";

  // E. Order Items
  const itemsContainer = document.getElementById("order-items-container");
  itemsContainer.innerHTML = "";

  data.items.forEach(item => {
    const row = `
      <div class="item">
        <div class="item-image">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
        </div>
        <div class="item-details">
          <h4>${item.name}</h4>
          <div class="item-price">
            <span class="quantity">${item.quantity} ×</span>
            <span class="price">₱${item.price.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
    itemsContainer.insertAdjacentHTML("beforeend", row);
  });
}

document.addEventListener("DOMContentLoaded", loadConfirmation);