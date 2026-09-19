import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  writeBatch
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

// ---------------------------------------------------------
// 🌟 1. LOAD CHECKOUT DATA
// ---------------------------------------------------------
async function loadCheckout() {
  const container = document.querySelector(".order-items");
  const summaryCount = document.querySelector(".item-count");

  const directBuyItem = JSON.parse(localStorage.getItem("direct_buy_item"));
  const checkoutIds = JSON.parse(localStorage.getItem("checkout_items") || "[]");

  if (!container) return;

  setupPaymentToggling();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    let itemsToRender = [];
    let isDirectBuy = false;

    container.innerHTML = `<div class="p-3 text-center text-muted">Loading order details...</div>`;

    // Scenario 1: Direct Buy
    if (directBuyItem) {
      itemsToRender = [directBuyItem];
      isDirectBuy = true;
    } 
    // Scenario 2: Cart Checkout
    else if (checkoutIds.length > 0) {
      const promises = checkoutIds.map(async (itemId) => {
        const itemRef = doc(db, "carts", user.uid, "items", itemId);
        const snap = await getDoc(itemRef);
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() };
        }
        return null;
      });
      itemsToRender = (await Promise.all(promises)).filter(item => item !== null);
      isDirectBuy = false;
    } else {
      alert("No items selected for checkout.");
      window.location.href = "cart.html";
      return;
    }

    container.innerHTML = "";
    let subtotal = 0;
    
    itemsToRender.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      const html = `
        <div class="order-item">
          <div class="order-item-image">
            <img src="${item.image}" alt="${item.name}" class="img-fluid">
          </div>
          <div class="order-item-details">
            <h4>${item.name}</h4>
            <div class="order-item-price">
              <span class="quantity">${item.quantity} ×</span>
              <span class="price">₱${item.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", html);
    });

    updateTotals(subtotal);
    if (summaryCount) summaryCount.textContent = `${itemsToRender.length} Items`;

    setupPlaceOrder(user, itemsToRender, subtotal, isDirectBuy);
  });
}

function setupPaymentToggling() {
  const options = document.querySelectorAll('input[name="payment-method"]');
  const details = document.querySelectorAll('.payment-details');
  
  options.forEach(opt => {
    opt.addEventListener('change', (e) => {
      details.forEach(d => d.classList.add('d-none'));
      document.querySelectorAll('.payment-option').forEach(po => po.classList.remove('active'));
      
      const selectedId = e.target.id; 
      const detailId = selectedId.replace('payment-', 'details-');
      const detailEl = document.getElementById(detailId);
      if(detailEl) detailEl.classList.remove('d-none');
      
      e.target.closest('.payment-option').classList.add('active');
    });
  });
}

function updateTotals(subtotal) {
  const taxRate = 0;
  const shipping = subtotal > 0 ? 4.99 : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax + shipping;

  const setVal = (sel, val) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = "₱" + val.toFixed(2);
  };

  // Update logic to match HTML structure
  const subEl = document.querySelector(".order-subtotal span:last-child");
  if(subEl) subEl.textContent = "₱" + subtotal.toFixed(2);
  
  const shipEl = document.querySelector(".order-shipping span:last-child");
  if(shipEl) shipEl.textContent = "₱" + shipping.toFixed(2);
  
  const taxEl = document.querySelector(".order-tax span:last-child");
  if(taxEl) taxEl.textContent = "₱" + tax.toFixed(2);

  const totalEl = document.querySelector(".order-total span:last-child");
  if(totalEl) totalEl.textContent = "₱" + total.toFixed(2);
  
  const btnPrice = document.querySelector(".btn-price");
  if(btnPrice) btnPrice.textContent = "₱" + total.toFixed(2);
}

// ---------------------------------------------------------
// 🌟 4. PLACE ORDER LOGIC (Updated for Confirmation Page)
// ---------------------------------------------------------
function setupPlaceOrder(user, items, subtotal, isDirectBuy) {
  const form = document.querySelector(".checkout-form");
  if (!form) return;

  // Clone to remove old listeners
  const oldBtn = form.querySelector(".place-order-btn");
  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  // We attach the listener to the FORM submit event
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const originalBtnText = btn.innerHTML;
    const paymentMethodInput = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethod = paymentMethodInput ? paymentMethodInput.value : "Cash on Pickup";

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Processing...`;

    try {
      const shippingInfo = {
        firstName: document.getElementById("first-name")?.value || "",
        lastName: document.getElementById("last-name")?.value || "",
        email: document.getElementById("email")?.value || "",
        phone: document.getElementById("phone")?.value || "",
        address: document.getElementById("address")?.value || "",
        city: document.getElementById("city")?.value || "",
        zip: document.getElementById("zip")?.value || ""
      };

      const orderData = {
        userId: user.uid,
        items: items,
        shippingInfo: shippingInfo,
        paymentMethod: paymentMethod,
        totals: {
          subtotal: subtotal,
          shipping: 4.99,
          total: subtotal + 4.99
        },
        status: "Confirmed",
        createdAt: new Date()
      };

      // 1. Add to Firestore
      const docRef = await addDoc(collection(db, "orders"), orderData);
      console.log("Order Success! ID:", docRef.id);

      // 2. Clear Cart (only if not Buy Now)
      if (!isDirectBuy) {
        const batch = writeBatch(db);
        items.forEach(item => {
          if (item.id) {
            const cartItemRef = doc(db, "carts", user.uid, "items", item.id);
            batch.delete(cartItemRef);
          }
        });
        await batch.commit();
      }

      // 3. Clear Local Storage
      localStorage.removeItem("checkout_items");
      localStorage.removeItem("direct_buy_item");

      // 4. Redirect to Order Confirmation with ID
      window.location.href = `order-confirmation.html?id=${docRef.id}`;

    } catch (error) {
      console.error("Order Failed:", error); // Check Console for this!
      alert("Failed to place order. See console for details.");
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
    }
  });
}

document.addEventListener("DOMContentLoaded", loadCheckout);