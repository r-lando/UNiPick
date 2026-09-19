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

// ... (Keep loadThumbnails function exactly as is) ...
function loadThumbnails(mainImage) {
  const grid = document.getElementById("thumbnail-grid");
  if(!grid) return;
  
  grid.innerHTML = "";
  const images = [mainImage]; 

  images.forEach((imgUrl, index) => {
    const item = document.createElement("div");
    item.classList.add("thumbnail-wrapper", "thumbnail-item");
    if (index === 0) item.classList.add("active");

    item.setAttribute("data-image", imgUrl);
    item.innerHTML = `<img src="${imgUrl}" class="img-fluid" alt="Thumbnail ${index + 1}">`;

    item.addEventListener("click", () => {
      const mainImg = document.getElementById("main-product-image");
      if(mainImg) {
        mainImg.src = imgUrl;
        mainImg.setAttribute("data-zoom", imgUrl);
      }
      document.querySelectorAll(".thumbnail-item").forEach(t => t.classList.remove("active"));
      item.classList.add("active");
    });
    grid.appendChild(item);
  });
}

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

async function loadProduct() {
  if (!productId) return;

  const ref = doc(db, "products", productId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const detailsContainer = document.querySelector(".product-details");
    if(detailsContainer) detailsContainer.innerHTML = `<h2 class="text-danger">Product not found.</h2>`;
    return;
  }

  const p = snap.data();

  // Update UI Elements safely
  const elName = document.getElementById("prod-name");
  const elCat = document.getElementById("prod-category");
  const elPrice = document.getElementById("prod-price");
  const elDesc = document.getElementById("prod-description");
  const elStock = document.getElementById("prod-stock");
  const elImg = document.getElementById("main-product-image");

  if(elName) elName.textContent = p.Name || "No Name";
  if(elCat) elCat.textContent = p.Category || "No Category";
  if(elPrice) elPrice.textContent = "₱" + parseFloat(p.Price).toFixed(2);
  if(elDesc) elDesc.textContent = p.Description || "No description available.";
  if(elStock) elStock.textContent = p.Stock > 0 ? `Only ${p.Stock} remaining` : "Out of Stock";

  if (p.Image && elImg) {
    elImg.src = p.Image;
    elImg.setAttribute("data-zoom", p.Image);
    loadThumbnails(p.Image);
  }

  // ------------------------------------------
  // SIZE SELECTION LOGIC
  // ------------------------------------------
  let selectedSize = "XS"; // Default size
  const sizeChips = document.querySelectorAll(".size-chip");
  const selectedSizeText = document.getElementById("selected-size-text");

  sizeChips.forEach(chip => {
    chip.addEventListener("click", () => {
      // 1. Remove active class from all chips
      sizeChips.forEach(c => c.classList.remove("active"));
      
      // 2. Add active class to clicked chip
      chip.classList.add("active");
      
      // 3. Update the selected size variable
      selectedSize = chip.getAttribute("data-size");
      
      // 4. Update the text display
      if (selectedSizeText) {
        selectedSizeText.textContent = selectedSize;
      }
    });
  });

  // Quantity Logic
  const qtyInput = document.getElementById("quantity-input");
  const increaseBtn = document.getElementById("increase-qty");
  const decreaseBtn = document.getElementById("decrease-qty");

  if(increaseBtn && qtyInput) {
    increaseBtn.addEventListener("click", () => {
      let current = parseInt(qtyInput.value) || 1;
      if (current < (p.Stock || 50)) qtyInput.value = current + 1;
    });
  }

  if(decreaseBtn && qtyInput) {
    decreaseBtn.addEventListener("click", () => {
      let current = parseInt(qtyInput.value) || 1;
      if (current > 1) qtyInput.value = current - 1;
    });
  }

  // ------------------------------------------
  // HANDLE ADD TO CART (Normal functionality)
  // ------------------------------------------
  const addToCartBtn = document.getElementById("add-to-cart-btn");
  
  if(addToCartBtn) {
    addToCartBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("Please login to add items to your cart.");
        window.location.href = "login.html";
        return;
      }

      const quantity = parseInt(qtyInput.value) || 1;
      const price = parseFloat(p.Price);

      addToCartBtn.disabled = true;
      addToCartBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Adding...`;

      try {
        const cartItemRef = doc(db, "carts", user.uid, "items", productId);
        const itemSnap = await getDoc(cartItemRef);

        if (itemSnap.exists()) {
          // If item exists, update quantity and ensure size is updated if needed (or handle different sizes as different items)
          // For simplicity here, we update the existing record. 
          // Note: In a complex app, unique ID usually combines ProductID + Size.
          await updateDoc(cartItemRef, {
            quantity: itemSnap.data().quantity + quantity,
            totalPrice: (itemSnap.data().quantity + quantity) * price,
            size: selectedSize // Update size preference
          });
        } else {
          await setDoc(cartItemRef, {
            productId: productId,
            name: p.Name,
            price: price,
            image: p.Image,
            quantity: quantity,
            totalPrice: price * quantity,
            size: selectedSize, // Add selected size
            timestamp: new Date()
          });
        }
        alert(`Product (${selectedSize}) added to cart successfully!`);
      } catch (error) {
        console.error("Error adding to cart:", error);
        alert("Failed to add to cart.");
      } finally {
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = `<i class="bi bi-bag-plus"></i> Add to Cart`;
      }
    });
  }

  // ------------------------------------------
  // 🌟 MODIFIED: BUY NOW (Direct Checkout)
  // ------------------------------------------
  const buyNowBtn = document.getElementById("buy-now-btn");

  if(buyNowBtn) {
    buyNowBtn.addEventListener("click", () => {
      const user = auth.currentUser;

      // 1. Strict Login Check
      if (!user) {
        alert("Please login to purchase items.");
        window.location.href = "login.html";
        return;
      }

      const quantity = parseInt(qtyInput.value) || 1;
      const price = parseFloat(p.Price);

      // 2. Prepare Direct Buy Object (No Firestore Interaction)
      const directItem = {
        id: productId,
        name: p.Name,
        price: price,
        image: p.Image,
        quantity: quantity,
        size: selectedSize, // Include selected size
        totalPrice: price * quantity
      };

      // 3. Save to LocalStorage using a specific key for "Buy Now"
      // We also clear the regular checkout_items to avoid confusion
      localStorage.setItem("direct_buy_item", JSON.stringify(directItem));
      localStorage.removeItem("checkout_items"); 

      // 4. Redirect
      window.location.href = "checkout.html";
    });
  }
}

window.addEventListener("DOMContentLoaded", loadProduct);