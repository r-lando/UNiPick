// Firebase core
      import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
      import {
        getAuth,
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signOut,
        onAuthStateChanged
      } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

      // Firestore
      import {
        getFirestore,
        collection,
        getDocs
      } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

      // Your Firebase config
      const firebaseConfig = {
        apiKey: "AIzaSyA6f-crfOeE4e7gDr8gNolAzqIqBsUqg7Y",
        authDomain: "unipick-e-commerce-web-app.firebaseapp.com",
        projectId: "unipick-e-commerce-web-app",
        storageBucket: "unipick-e-commerce-web-app.firebasestorage.app",
        messagingSenderId: "315041934524",
        appId: "1:315041934524:web:ba357dc818f868c19f74b9"
      };

      // Initialize app once
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      // Expose auth globally if needed on other scripts
      window.auth = auth;

      // --------------------------
      // Helper: fetch all products
      // --------------------------
      async function fetchAllProducts() {
        const snap = await getDocs(collection(db, "products"));
        const products = [];
        snap.forEach(doc => {
          products.push({
            id: doc.id,
            ...doc.data()
          });
        });
        return products;
      }

      // --------------------------
      // Render main Best Sellers (4 items)
      // --------------------------
      function renderMainBestSellers(products) {
        const container = document.getElementById("bestSellerContainer");
        if (!container) return;

        container.innerHTML = "";

        const list = products.slice(0, 4); // 4 items
        if (!list.length) {
          container.innerHTML = `
            <div class="col-12 text-center">
              <p class="text-muted">No products available.</p>
            </div>`;
          return;
        }

        list.forEach(p => {
          const price = (typeof p.Price === "number") ? p.Price : parseFloat(p.Price || 0);

          const col = document.createElement("div");
          col.className = "col-lg-3 col-md-6";

          col.innerHTML = `
            <div class="product-item">
              <div class="product-image">
                <img src="${p.Image || "assets/img/img/product/product-1.webp"}"
                    alt="${p.Name || "Product"}"
                    class="img-fluid"
                    loading="lazy">



                <button class="cart-btn">Add to Cart</button>
              </div>
              <div class="product-info">
                <div class="product-category">${p.Category || "Product"}</div>
                <h4 class="product-name">
                  <a href="product-details.html?id=${p.id}">
                    ${p.Name || "Unnamed Product"}
                  </a>
                </h4>
                <div class="product-price">
                  ₱${isNaN(price) ? "—" : price.toFixed(2)}
                </div>
              </div>
            </div>
          `;

          container.appendChild(col);
        });
      }

      /*function listenForNotifications(user) {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("isRead", "==", false) // Only get unread ones
        );
      
        onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const notif = change.doc.data();
              
              // 1. Show Alert (Simple native alert)
              alert(`🔔 ${notif.title}\n${notif.message}`);
      
              // 2. Mark as Read immediately
              try {
                const notifRef = doc(db, "notifications", change.doc.id);
                await updateDoc(notifRef, { isRead: true });
              } catch (err) {
                console.error("Error marking notification as read:", err);
              }
            }
          });
        });
      }*/
      
      // Render side list sections (3 items each)
      function renderSideList(containerId, products, limitCount, delayBase = 0) {
        const wrapper = document.getElementById(containerId);
        if (!wrapper) return;

        wrapper.innerHTML = "";

        const list = products.slice(0, limitCount);
        if (!list.length) {
          wrapper.innerHTML = `<p class="text-muted">No products yet.</p>`;
          return;
        }

        list.forEach((p, index) => {
          const price = (typeof p.Price === "number") ? p.Price : parseFloat(p.Price || 0);

          const card = document.createElement("div");
          card.className = "product-card mb-3"; // Added margin-bottom for spacing

          // UPDATED INNER HTML:
          // 1. Wrapped in <a href="...">
          // 2. Added styles to remove underline and inherit text color
          // 3. Used Bootstrap 'd-flex' to keep image and text side-by-side
          card.innerHTML = `
            <a href="product-details.html?id=${p.id}" class="d-flex align-items-center" style="text-decoration: none; color: inherit; width: 100%;">
              
              <div class="product-image me-3" style="width: 80px; flex-shrink: 0;">
                <img src="${p.Image || "assets/img/img/product/product-1.webp"}"
                    alt="${p.Name || "Product"}"
                    class="img-fluid rounded"
                    style="object-fit: cover; aspect-ratio: 1/1;">
              </div>

              <div class="product-info flex-grow-1">
                <h4 class="product-name mb-1" style="font-size: 1rem; font-weight: 600;">
                  ${p.Name || "Unnamed Product"}
                </h4>
                
                <div class="product-rating mb-1 text-warning" style="font-size: 0.75rem;">
                  <i class="bi bi-star-fill"></i>
                  <i class="bi bi-star-fill"></i>
                  <i class="bi bi-star-fill"></i>
                  <i class="bi bi-star-fill"></i>
                  <i class="bi bi-star"></i>
                  <span class="text-muted ms-1">(${p.Stock ?? 0})</span>
                </div>
                
                <div class="product-price">
                  <span class="current-price fw-bold text-primary">
                    ₱${isNaN(price) ? "—" : price.toFixed(2)}
                  </span>
                </div>
              </div>
            </a>
          `;

          wrapper.appendChild(card);
        });
      }
      // --------------------------
      // Init on DOM ready
      // --------------------------
      window.addEventListener("DOMContentLoaded", async () => {
        try {
          const products = await fetchAllProducts();

          // Main Best Sellers grid (4 items)
          renderMainBestSellers(products);

          // Cards section lists (3, 3, 3)
          renderSideList("trending-list",   products, 3);
          renderSideList("bestseller-list", products, 3);
          renderSideList("featured-list",   products, 3);
        } catch (err) {
          console.error("Error loading products:", err);
        }
      });
      // --------------------------

      document.addEventListener("DOMContentLoaded", () => {
  // Desktop search form
  const desktopForm = document.querySelector(".desktop-search-form");
  if (desktopForm) {
    desktopForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = desktopForm.querySelector("input[type='text']");
      const q = input ? input.value.trim() : "";
      if (!q) return; // don't redirect on empty search
      window.location.href = `category.html?q=${encodeURIComponent(q)}`;
    });
  }

  // Mobile search form (inside #mobileSearch collapse)
  const mobileForm = document.querySelector("#mobileSearch .search-form");
  if (mobileForm) {
    mobileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = mobileForm.querySelector("input[type='text']");
      const q = input ? input.value.trim() : "";
      if (!q) return;
      window.location.href = `category.html?q=${encodeURIComponent(q)}`;
    });
  }
});

      