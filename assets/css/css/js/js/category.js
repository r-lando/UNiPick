import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 1. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyA6f-crfOeE4e7gDr8gNolAzqIqBsUqg7Y",
  authDomain: "unipick-e-commerce-web-app.firebaseapp.com",
  projectId: "unipick-e-commerce-web-app",
  storageBucket: "unipick-e-commerce-web-app.firebasestorage.app",
  messagingSenderId: "315041934524",
  appId: "1:315041934524:web:ba357dc818f868c19f74b9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. STATE MANAGEMENT
let allProducts = [];       
let filteredProducts = [];  
let activeFilters = {};     
let currentPage = 1; // [UPDATED] Track current page

// 3. DOM ELEMENTS
const container = document.getElementById("category-products");
const titleEl = document.getElementById("categoryTitle");
const countEl = document.getElementById("categoryCount");
const searchInput = document.getElementById("productSearch");
const searchBtn = document.querySelector(".search-btn");
const priceRange = document.getElementById("priceRange");
const sortBy = document.getElementById("sortBy");
const itemsPerPage = document.getElementById("itemsPerPage");
const activeFiltersContainer = document.querySelector(".filter-tags");
const clearAllBtn = document.querySelector(".clear-all-btn");
const paginationContainer = document.querySelector("#category-pagination ul"); // [UPDATED] Select pagination list

// 4. HELPER FUNCTIONS
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function createProductCard(product) {
  const price = (typeof product.Price === "number") ? product.Price : parseFloat(product.Price || 0);
  const img = product.Image || "assets/img/img/product/product-1.webp";
  const name = product.Name || "Unnamed Product";
  const category = product.Category || "Product";

  return `
    <div class="col-lg-3 col-md-4 col-sm-6">
      <div class="product-item">
        <div class="product-image">
          <img src="${img}" alt="${name}" class="img-fluid" loading="lazy">
          <div class="product-actions">
          </div>
          <button class="cart-btn">Add to Cart</button>
        </div>
        <div class="product-info">
          <div class="product-category">${category}</div>
          <h4 class="product-name">
            <a href="product-details.html?id=${product.id}">${name}</a>
          </h4>
          <div class="product-price">₱${isNaN(price) ? "—" : price.toFixed(2)}</div>
        </div>
      </div>
    </div>
  `;
}

// 5. MAIN LOGIC: LOAD & INIT
async function initCategoryPage() {
  if (!container) return;

  container.innerHTML = `<div class="col-12 text-center text-muted">Loading products...</div>`;

  try {
    const snap = await getDocs(collection(db, "products"));
    
    allProducts = [];
    snap.forEach(doc => {
      allProducts.push({ id: doc.id, ...doc.data() });
    });

    const catParam = getQueryParam("cat");
    const searchParam = getQueryParam("q");

    if (catParam) {
      allProducts = allProducts.filter(p => (p.Category || "").toLowerCase() === catParam.toLowerCase());
      if (titleEl) titleEl.textContent = catParam;
    }

    if (searchParam) {
      activeFilters.search = searchParam;
      if (titleEl) titleEl.textContent = `Search results for "${searchParam}"`;
      if (searchInput) searchInput.value = searchParam;
    }

    attachControls();
    applyFilters();

  } catch (err) {
    console.error("Error loading products:", err);
    container.innerHTML = `<div class="col-12 text-center text-danger">Failed to load products.</div>`;
  }
}

// 6. FILTERING LOGIC
function applyFilters() {
  // [UPDATED] Reset to page 1 whenever filters change
  currentPage = 1; 

  filteredProducts = allProducts.filter(p => {
    let ok = true;
    
    if (activeFilters.search) {
      const pName = (p.Name || "").toLowerCase();
      const query = activeFilters.search.toLowerCase();
      ok = pName.includes(query);
    }

    if (ok && activeFilters.price) {
      const [min, max] = activeFilters.price;
      const price = parseFloat(p.Price || 0);
      if (max === null) ok = price >= min;
      else ok = price >= min && price <= max;
    }

    return ok;
  });

  applySorting();
  renderProducts();
  updateActiveFiltersUI();
}

function applySorting() {
  if (activeFilters.sort === "low-high") {
    filteredProducts.sort((a, b) => (a.Price || 0) - (b.Price || 0));
  } else if (activeFilters.sort === "high-low") {
    filteredProducts.sort((a, b) => (b.Price || 0) - (a.Price || 0));
  }
}

function renderProducts() {
  container.innerHTML = "";

  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
         <h4>No products found.</h4>
         <p>Try clearing filters or using different keywords.</p>
      </div>`;
    if (countEl) countEl.textContent = "0 product(s) found";
    renderPagination(0, 12); // Clear pagination
    return;
  }

  // [UPDATED] Pagination Slicing Logic
  const limit = itemsPerPage ? parseInt(itemsPerPage.value, 10) || 12 : 12;
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  
  const visibleItems = filteredProducts.slice(startIndex, endIndex);

  // Generate HTML
  container.innerHTML = visibleItems.map(p => createProductCard(p)).join("");
  
  if (countEl) countEl.textContent = `${filteredProducts.length} product(s) found`;

  // [UPDATED] Render Pagination Buttons
  renderPagination(filteredProducts.length, limit);
}

// 7. [NEW] PAGINATION RENDERING FUNCTION
function renderPagination(totalItems, limit) {
  if (!paginationContainer) return;
  paginationContainer.innerHTML = ""; // Clear existing

  const totalPages = Math.ceil(totalItems / limit);

  // If only 1 page or no items, hide pagination or show minimal
  if (totalPages <= 1) return;

  // 1. Previous Button
  const prevLi = document.createElement("li");
  prevLi.innerHTML = `
    <a href="#" aria-label="Previous page">
      <i class="bi bi-arrow-left"></i>
      <span class="d-none d-sm-inline">Previous</span>
    </a>
  `;
  if (currentPage === 1) {
    prevLi.classList.add("disabled"); // Optional styling for disabled
    prevLi.style.pointerEvents = "none";
    prevLi.style.opacity = "0.5";
  } else {
    prevLi.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage--;
      renderProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  paginationContainer.appendChild(prevLi);

  // 2. Page Numbers (Smart Logic: 1 ... 4 5 6 ... 10)
  const createPageItem = (page) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = page;
    if (page === currentPage) a.classList.add("active");
    
    a.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = page;
      renderProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    li.appendChild(a);
    paginationContainer.appendChild(li);
  };

  const createEllipsis = () => {
    const li = document.createElement("li");
    li.classList.add("ellipsis");
    li.textContent = "...";
    paginationContainer.appendChild(li);
  };

  // Logic to show limited pages
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) createPageItem(i);
  } else {
    // Always show first
    createPageItem(1);
    
    if (currentPage > 3) createEllipsis();

    // Show neighbors
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) createPageItem(i);

    if (currentPage < totalPages - 2) createEllipsis();

    // Always show last
    createPageItem(totalPages);
  }

  // 3. Next Button
  const nextLi = document.createElement("li");
  nextLi.innerHTML = `
    <a href="#" aria-label="Next page">
      <span class="d-none d-sm-inline">Next</span>
      <i class="bi bi-arrow-right"></i>
    </a>
  `;
  if (currentPage === totalPages) {
    nextLi.style.pointerEvents = "none";
    nextLi.style.opacity = "0.5";
  } else {
    nextLi.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage++;
      renderProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  paginationContainer.appendChild(nextLi);
}

// 8. UI CONTROLS & LISTENERS
function updateActiveFiltersUI() {
  const tags = [];
  if (activeFilters.search) {
    tags.push(`<span class="filter-tag">Search: "${activeFilters.search}" <button class="filter-remove" data-type="search"><i class="bi bi-x"></i></button></span>`);
  }
  if (activeFilters.price) {
    const label = priceRange.options[priceRange.selectedIndex].text;
    tags.push(`<span class="filter-tag">${label} <button class="filter-remove" data-type="price"><i class="bi bi-x"></i></button></span>`);
  }
  
  if(activeFiltersContainer) {
    activeFiltersContainer.innerHTML = tags.join(" ");
    activeFiltersContainer.querySelectorAll(".filter-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.type;
        delete activeFilters[type];
        if(type === 'search' && searchInput) searchInput.value = "";
        if(type === 'price' && priceRange) priceRange.value = "All Prices";
        applyFilters();
      });
    });
  }
}

function attachControls() {
  if (searchBtn) {
    searchBtn.addEventListener("click", () => { 
      activeFilters.search = searchInput.value.trim() || null; 
      applyFilters(); 
    });
  }
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => { 
      if (e.key === "Enter") { 
        activeFilters.search = searchInput.value.trim() || null; 
        applyFilters(); 
      }
    });
  }

  if (priceRange) {
    priceRange.addEventListener("change", () => {
      const v = priceRange.value;
      if (v === "Under $25") activeFilters.price = [0, 25];
      else if (v === "$25 to $50") activeFilters.price = [25, 50];
      else if (v === "$50 to $100") activeFilters.price = [50, 100];
      else if (v === "$100 to $200") activeFilters.price = [100, 200];
      else if (v === "$200 & Above") activeFilters.price = [200, null];
      else delete activeFilters.price;
      applyFilters();
    });
  }

  if (sortBy) {
    sortBy.addEventListener("change", () => {
      const v = sortBy.value;
      if (v === "Price: Low to High") activeFilters.sort = "low-high";
      else if (v === "Price: High to Low") activeFilters.sort = "high-low";
      else delete activeFilters.sort;
      applyFilters();
    });
  }

  if (itemsPerPage) {
    itemsPerPage.addEventListener("change", () => {
      currentPage = 1; // [UPDATED] Reset page when limit changes
      renderProducts();
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      activeFilters = {};
      if (searchInput) searchInput.value = "";
      if (priceRange) priceRange.value = "All Prices";
      if (sortBy) sortBy.value = "Featured";
      applyFilters();
    });
  }
}

// 9. START
window.addEventListener("DOMContentLoaded", initCategoryPage);