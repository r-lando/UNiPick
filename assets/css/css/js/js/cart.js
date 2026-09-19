import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
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

// Initialize App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------------------------------------
// 🌟 RENDER CART
// ---------------------------------------------------------
async function loadCart() {
  const listContainer = document.getElementById("cart-list");

  // Wait for Firebase to confirm user status
  onAuthStateChanged(auth, async (user) => {
    
    // 1. If not logged in
    if (!user) {
      listContainer.innerHTML = `
        <div class="text-center py-5">
          <p>Please <a href="login.html">login</a> to view your cart.</p>
        </div>`;
      updateSummary(0);
      return;
    }

    // 2. Get Data
    const userId = user.uid;
    const cartRef = collection(db, "carts", userId, "items");
    const snapshot = await getDocs(cartRef);

    // 3. Empty State
    if (snapshot.empty) {
      listContainer.innerHTML = `<div class="text-center py-5">Your cart is empty.</div>`;
      updateSummary(0);
      return;
    }

    // 4. Render Items
    listContainer.innerHTML = "";
    
    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const itemId = docSnap.id;
      
      const row = document.createElement("div");
      row.classList.add("cart-item");
      row.dataset.id = itemId;
      row.dataset.price = item.price;
      row.dataset.quantity = item.quantity;

      row.innerHTML = `
        <div class="row align-items-center">
          <div class="col-lg-6 col-12 mt-3 mt-lg-0 mb-lg-0 mb-3 d-flex align-items-center">
            
            <div class="me-3">
              <input class="form-check-input item-checkbox" type="checkbox" checked style="width: 20px; height: 20px; cursor: pointer;">
            </div>

            <div class="product-info d-flex align-items-center flex-grow-1">
              <div class="product-image">
                <img src="${item.image}" alt="${item.name}" class="img-fluid">
              </div>
              <div class="product-details">
                <h6 class="product-title mb-1">${item.name}</h6>
                <button class="remove-item text-danger border-0 bg-transparent p-0 mt-1" data-id="${itemId}">
                  <i class="bi bi-trash"></i> Remove
                </button>
              </div>
            </div>
          </div>

          <div class="col-lg-2 col-12 mt-3 mt-lg-0 text-center">
            <div class="price-tag">
              <span class="current-price">₱${item.price.toFixed(2)}</span>
            </div>
          </div>

          <div class="col-lg-2 col-12 mt-3 mt-lg-0 text-center">
            <div class="quantity-selector d-flex justify-content-center align-items-center">
              <button class="quantity-btn decrease-btn btn btn-sm btn-outline-secondary" 
                      data-id="${itemId}" 
                      style="width: 32px; height: 32px; padding: 0; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                -
              </button>
              
              <input type="number" class="quantity-input mx-2 text-center form-control" 
                     value="${item.quantity}" readonly 
                     style="width: 50px; height: 32px; padding: 0;">
              
              <button class="quantity-btn increase-btn btn btn-sm btn-outline-secondary" 
                      data-id="${itemId}" 
                      style="width: 32px; height: 32px; padding: 0; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                +
              </button>
            </div>
          </div>

          <div class="col-lg-2 col-12 mt-3 mt-lg-0 text-center">
            <div class="item-total">
              <span class="fw-bold">₱${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;

      // Event Listeners
      row.querySelector(".remove-item").addEventListener("click", () => removeFromCart(itemId));
      row.querySelector(".decrease-btn").addEventListener("click", () => updateQuantity(itemId, -1));
      row.querySelector(".increase-btn").addEventListener("click", () => updateQuantity(itemId, 1));
      row.querySelector(".item-checkbox").addEventListener("change", calculateCheckedTotal);

      listContainer.appendChild(row);
    });

    calculateCheckedTotal();
    setupPageButtons(); 
  });
}

// ---------------------------------------------------------
// 🌟 HELPER: Calculate Only Checked Items
// ---------------------------------------------------------
function calculateCheckedTotal() {
  const allRows = document.querySelectorAll(".cart-item");
  let subtotal = 0;

  allRows.forEach(row => {
    const checkbox = row.querySelector(".item-checkbox");
    if (checkbox && checkbox.checked) {
      const price = parseFloat(row.dataset.price);
      const qty = parseInt(row.dataset.quantity);
      subtotal += (price * qty);
    }
  });

  updateSummary(subtotal);
}

// ---------------------------------------------------------
// 🌟 ACTION: Update Quantity
// ---------------------------------------------------------
async function updateQuantity(itemId, change) {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  const itemRef = doc(db, "carts", userId, "items", itemId);

  try {
    const snap = await getDoc(itemRef);
    if (!snap.exists()) return;

    const currentData = snap.data();
    const newQuantity = currentData.quantity + change;

    if (newQuantity < 1) return;

    await updateDoc(itemRef, {
      quantity: newQuantity,
      totalPrice: currentData.price * newQuantity
    });

    loadCart();

  } catch (error) {
    console.error("Error updating quantity:", error);
  }
}

// ---------------------------------------------------------
// 🌟 ACTION: Remove Item
// ---------------------------------------------------------
async function removeFromCart(itemId) {
  if (!confirm("Are you sure you want to remove this item?")) return;

  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  const itemRef = doc(db, "carts", userId, "items", itemId);

  try {
    await deleteDoc(itemRef);
    loadCart();
  } catch (error) {
    console.error("Error removing item:", error);
  }
}

// ---------------------------------------------------------
// 🌟 ACTION: Clear Entire Cart
// ---------------------------------------------------------
async function clearCart() {
  const user = auth.currentUser;
  if (!user) return;

  if (!confirm("Are you sure you want to empty your entire cart?")) return;

  const userId = user.uid;
  const cartRef = collection(db, "carts", userId, "items");
  
  let clearBtn = document.querySelector(".btn-outline-remove");

  try {
    if(clearBtn) {
      clearBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Clearing...`;
      clearBtn.disabled = true;
    }

    const snapshot = await getDocs(cartRef);
    if (snapshot.empty) {
      loadCart();
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    await loadCart();

  } catch (error) {
    console.error("Error clearing cart:", error);
    alert("Failed to clear cart.");
  } finally {
    clearBtn = document.querySelector(".btn-outline-remove");
    if(clearBtn) {
      clearBtn.innerHTML = `<i class="bi bi-trash"></i> Clear Cart`;
      clearBtn.disabled = false;
      clearBtn.blur();
    }
  }
}

// ---------------------------------------------------------
// 🌟 HELPER: Update Totals UI
// ---------------------------------------------------------
function updateSummary(subtotal) {
  if (subtotal === 0) {
    document.getElementById("cart-subtotal").textContent = "₱0.00";
    document.getElementById("cart-tax").textContent = "₱0.00";
    document.getElementById("cart-total").textContent = "₱0.00";
    return;
  }

  const taxRate = 0;
  const shipping = 4.99;
  const tax = subtotal * taxRate;
  const total = subtotal + tax + shipping;

  document.getElementById("cart-subtotal").textContent = "₱" + subtotal.toFixed(2);
  document.getElementById("cart-tax").textContent = "₱" + tax.toFixed(2);
  document.getElementById("cart-total").textContent = "₱" + total.toFixed(2);
}

// ---------------------------------------------------------
// 🌟 INIT: Setup Global Page Buttons
// ---------------------------------------------------------
function setupPageButtons() {
  
  // A. Checkout Button
// ... inside setupPageButtons() in cart.js ...

  // A. Checkout Button
  const checkoutBtn = document.querySelector(".checkout-button a");
  if(checkoutBtn) {
    const newBtn = checkoutBtn.cloneNode(true);
    checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);

    newBtn.addEventListener("click", (e) => {
      const selectedItems = [];
      document.querySelectorAll(".cart-item").forEach(row => {
        const checkbox = row.querySelector(".item-checkbox");
        if (checkbox && checkbox.checked) {
          selectedItems.push(row.dataset.id);
        }
      });

      if (selectedItems.length === 0) {
        e.preventDefault();
        alert("Please select at least one item to checkout.");
        return;
      }
      
      // 🌟 FIX: Clear any "Buy Now" items so they don't interfere
      localStorage.removeItem("direct_buy_item");
      
      localStorage.setItem("checkout_items", JSON.stringify(selectedItems));
    });
  }

  // B. Clear Cart Button
  const clearBtn = document.querySelector(".btn-outline-remove");
  if (clearBtn) {
    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
    newClearBtn.addEventListener("click", clearCart);
  }

  // C. Apply Coupon Button (NEW!)
  const couponBtn = document.querySelector(".coupon-form button");
  const couponInput = document.querySelector(".coupon-form input");
  
  if (couponBtn && couponInput) {
    // Clone to remove old listeners
    const newCouponBtn = couponBtn.cloneNode(true);
    couponBtn.parentNode.replaceChild(newCouponBtn, couponBtn);

    newCouponBtn.addEventListener("click", () => {
      const code = couponInput.value.trim();
      if (!code) {
        alert("Please enter a coupon code.");
        return;
      }
      // Placeholder logic
      alert("Coupons feature available soon!");
      couponInput.value = ""; // Clear the input field
    });
  }
}

// Initialize
window.addEventListener("DOMContentLoaded", loadCart);