/* ========== FIREBASE + CLOUDINARY CONFIG ========== */
const firebaseConfig = {
  apiKey: "AIzaSyA6f-crfOeE4e7gDr8gNolAzqIqBsUqg7Y",
  authDomain: "unipick-e-commerce-web-app.firebaseapp.com",
  projectId: "unipick-e-commerce-web-app",
  storageBucket: "unipick-e-commerce-web-app.firebasestorage.app",
  messagingSenderId: "315041934524",
  appId: "1:315041934524:web:ba357dc818f868c19f74b9"
};

const CLOUDINARY_CLOUD_NAME = 'dehtdxria';
const CLOUDINARY_UNSIGNED_UPLOAD_PRESET = 'unipick_profile_photos';

/* ========== IMPORT FIREBASE ========== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, query, orderBy, getDocs,
  addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ========== DOM SELECTORS ========== */
const productsSection = document.getElementById('products');
const ordersSection = document.getElementById('orders');
const usersSection = document.getElementById('users');
const inventorySection = document.getElementById('inventory');
const reportsSection = document.getElementById('reports');

/* Utility: Toast Notification */
function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `custom-toast ${type}`;
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', right: '20px', top: '20px', zIndex: 1500,
    padding: '10px 14px', borderRadius: '8px', color: '#fff',
    background: type === 'error' ? '#d9534f' : '#198754', boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ========== 1. PRODUCTS LOGIC ========== */
async function loadProducts() {
  const tbody = document.querySelector('#products table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>';

  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    updateDashboardCounts({ products: snapshot.size });

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No products available</td></tr>';
      return;
    }

    const rows = [];
    snapshot.forEach(docSnap => rows.push({ id: docSnap.id, ...docSnap.data() }));

    tbody.innerHTML = rows.map(p => `
      <tr data-id="${p.id}">
        <td>
          <div class="d-flex align-items-center gap-3">
            <img src="${p.Image || 'assets/img/no-image.png'}" alt="img" width="50" height="50" style="object-fit:cover;border-radius:6px;">
            <div>
              <div class="fw-semibold">${escapeHtml(p.Name)}</div>
              <small class="text-muted">${escapeHtml(p.Category)}</small>
            </div>
          </div>
        </td>
        <td>${escapeHtml(p.Category)}</td>
        <td>₱${Number(p.Price || 0).toFixed(2)}</td>
        <td><span class="badge ${p.Stock < 10 ? 'bg-danger' : 'bg-success'}">${p.Stock}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary edit-product">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-product">Delete</button>
        </td>
      </tr>
    `).join('');

    // Attach events
    tbody.querySelectorAll('.edit-product').forEach(btn => 
      btn.addEventListener('click', e => openProductModal('edit', e.target.closest('tr').dataset.id))
    );
    tbody.querySelectorAll('.delete-product').forEach(btn => 
      btn.addEventListener('click', e => handleDeleteProduct(e.target.closest('tr').dataset.id))
    );

  } catch (err) { console.error(err); }
}

/* ========== 2. ORDERS LOGIC (Updated for Dashboard Pick-ups) ========== */
async function loadOrders() {
  const tbody = document.querySelector('#orders table tbody');
  // We remove the check 'if (!tbody) return;' here because we need the calculation 
  // to run even if the user is currently on the "Dashboard" tab and not the "Orders" tab.

  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    updateDashboardCounts({ orders: snapshot.size });

    let completedPickups = 0;
    const orders = [];

    snapshot.forEach(d => {
      const data = d.data();
      orders.push({ id: d.id, ...data });
      
      // Count "Completed" orders as Pick-ups
      // Adjust the string comparison if your status is "Pick Up" or similar
      if (data.status === 'Completed' || data.status === 'Picked Up') {
        completedPickups++;
      }
    });

    // ---------------------------------------------------------
    // NEW CODE: Update "Pick-ups Completed" on Dashboard
    // ---------------------------------------------------------
    const dashboardPickupCard = document.querySelector('#dashboard .bi-truck.text-info').closest('.card').querySelector('h4');
    if (dashboardPickupCard) {
      dashboardPickupCard.textContent = completedPickups;
    }
    // ---------------------------------------------------------

    // If table exists (we are viewing the page), populate it
    if (tbody) {
      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No orders found</td></tr>';
        return;
      }

      tbody.innerHTML = orders.map(o => {
        const total = o.totals?.total ? Number(o.totals.total).toFixed(2) : "0.00";
        const status = o.status || 'Pending';
        
        return `
        <tr data-id="${o.id}">
          <td>#${o.id.slice(0, 8).toUpperCase()}</td>
          <td>${escapeHtml(o.shippingAddress?.firstName || 'Guest')}</td>
          <td>₱${total} <small class="text-muted">(${o.paymentMethod})</small></td>
          <td><span class="badge ${getStatusBadgeClass(status)}">${status}</span></td>
          <td>
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Action</button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item update-status" href="#" data-status="Processing">Processing</a></li>
                <li><a class="dropdown-item update-status" href="#" data-status="Ready For Pick up">Ready For Pick up</a></li>
                <li><a class="dropdown-item update-status" href="#" data-status="Completed">Completed</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger delete-order" href="#">Delete</a></li>
              </ul>
            </div>
          </td>
        </tr>`;
      }).join('');

      // Attach events
      tbody.querySelectorAll('.update-status').forEach(btn => 
        btn.addEventListener('click', e => updateOrderStatus(e.target.closest('tr').dataset.id, e.target.dataset.status))
      );
      tbody.querySelectorAll('.delete-order').forEach(btn => 
        btn.addEventListener('click', e => handleDeleteOrder(e.target.closest('tr').dataset.id))
      );
    }

  } catch (err) { console.error(err); }
}

/* ========== 3. INVENTORY LOGIC (Updated for Dashboard Count) ========== */
async function loadInventory() {
  // 1. Calculate Inventory Data
  const q = query(collection(db, 'products'));
  const snapshot = await getDocs(q);
  
  let totalStockValue = 0;
  let lowStockItems = [];
  const LOW_STOCK_THRESHOLD = 10;

  snapshot.forEach(doc => {
    const p = doc.data();
    const price = Number(p.Price) || 0;
    const stock = Number(p.Stock) || 0;
    
    totalStockValue += (price * stock);
    
    if (stock <= LOW_STOCK_THRESHOLD) {
      lowStockItems.push({ name: p.Name, stock: stock, id: doc.id });
    }
  });

  // ---------------------------------------------------------
  // NEW CODE: Update "Low-stock Alerts" on Dashboard
  // ---------------------------------------------------------
  const dashboardLowStockCard = document.querySelector('#dashboard .bi-exclamation-triangle.text-danger').closest('.card').querySelector('h4');
  if (dashboardLowStockCard) {
    dashboardLowStockCard.textContent = lowStockItems.length;
  }
  // ---------------------------------------------------------

  if (!inventorySection) return;
  
  const container = inventorySection.querySelector('.card-body');
  
  // Generate Inventory UI (Same as before)
  let html = `
    <div class="row g-4 mb-4">
      <div class="col-md-6">
        <div class="p-3 border rounded bg-light text-center">
          <h6 class="text-muted">Total Inventory Value</h6>
          <h3 class="text-primary fw-bold">₱${totalStockValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>
      </div>
      <div class="col-md-6">
         <div class="p-3 border rounded bg-light text-center">
          <h6 class="text-muted">Low Stock Items (< ${LOW_STOCK_THRESHOLD})</h6>
          <h3 class="text-danger fw-bold">${lowStockItems.length}</h3>
        </div>
      </div>
    </div>
    
    <h5 class="mt-4 mb-3 text-danger"><i class="bi bi-exclamation-triangle"></i> Low Stock Alerts</h5>
  `;

  if (lowStockItems.length === 0) {
    html += `<div class="alert alert-success">All products are well stocked!</div>`;
  } else {
    html += `
      <div class="table-responsive">
        <table class="table table-bordered table-hover">
          <thead class="table-light"><tr><th>Product Name</th><th>Current Stock</th><th>Action</th></tr></thead>
          <tbody>
            ${lowStockItems.map(item => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td class="fw-bold text-danger">${item.stock}</td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="document.querySelector('[data-target=products]').click()">Restock</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  container.innerHTML = html;
}

/* ========== 4. REPORTS LOGIC (Updated to update Dashboard Total Sales) ========== */
async function loadReports() {
  // 1. Calculate Revenue (This part remains the same)
  const q = query(collection(db, 'orders'));
  const snapshot = await getDocs(q);

  let totalRevenue = 0;
  let completedOrders = 0;
  let categoryCounts = {};

  snapshot.forEach(doc => {
    const o = doc.data();
    // Only count revenue for valid orders (excluding cancelled)
    if (o.status !== 'cancelled') {
      const orderTotal = o.totals?.total ? Number(o.totals.total) : 0;
      totalRevenue += orderTotal;
      completedOrders++;

      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(item => {
          const cat = item.Category || 'Uncategorized';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + item.quantity;
        });
      }
    }
  });

  // ---------------------------------------------------------
  // NEW CODE: Update the "Total Sales" card on the main Dashboard
  // ---------------------------------------------------------
  const dashboardSalesCard = document.querySelector('#dashboard .bi-graph-up.text-primary').closest('.card').querySelector('h4');
  if (dashboardSalesCard) {
    dashboardSalesCard.textContent = '₱' + totalRevenue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  // ---------------------------------------------------------

  // 2. Render Reports Section (Only if reports section exists in DOM)
  if (!reportsSection) return;

  const avgOrderValue = completedOrders > 0 ? (totalRevenue / completedOrders) : 0;
  
  // Convert category counts to sorted array
  const sortedCategories = Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  const maxCount = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  // Build Report UI
  const html = `
    <div class="row g-4 mb-4">
      <div class="col-md-4">
        <div class="p-3 border rounded bg-white shadow-sm text-center">
          <h6 class="text-muted">Total Revenue</h6>
          <h3 class="text-success fw-bold">₱${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-3 border rounded bg-white shadow-sm text-center">
          <h6 class="text-muted">Completed Orders</h6>
          <h3 class="text-dark fw-bold">${completedOrders}</h3>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-3 border rounded bg-white shadow-sm text-center">
          <h6 class="text-muted">Avg. Order Value</h6>
          <h3 class="text-primary fw-bold">₱${avgOrderValue.toFixed(2)}</h3>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-white fw-bold">Top Selling Categories</div>
          <div class="card-body">
            ${sortedCategories.length === 0 ? '<p class="text-muted">No sales data yet.</p>' : ''}
            ${sortedCategories.map(([cat, count]) => {
              const percentage = Math.round((count / maxCount) * 100);
              return `
                <div class="mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span>${cat}</span>
                    <small class="fw-bold">${count} sold</small>
                  </div>
                  <div class="progress" style="height: 10px;">
                    <div class="progress-bar bg-primary" role="progressbar" style="width: ${percentage}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const targetDiv = reportsSection.querySelector('.card-body') || reportsSection;
  // Ensure we keep the header if we are replacing innerHTML of the section
  if(targetDiv === reportsSection) {
      reportsSection.innerHTML = `<h2 class="fw-bold mb-4" style="color:#001c6e;">Reports & Analytics</h2>` + html;
  } else {
      targetDiv.innerHTML = html;
  }
}

/* ========== USERS LOGIC ========== */
async function loadUsers() {
  const tbody = document.querySelector('#users table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loading...</td></tr>';
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    updateDashboardCounts({ users: snapshot.size });
    if (snapshot.empty) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No users</td></tr>'; return; }
    
    const rows = [];
    snapshot.forEach(d => rows.push({id: d.id, ...d.data()}));
    
    tbody.innerHTML = rows.map(u => `
      <tr data-id="${u.id}">
        <td><small class="text-muted">${u.id.slice(0,6)}...</small></td>
        <td>
           <div class="d-flex align-items-center gap-2">
             <img src="${u.photoURL || 'assets/img/user-placeholder.png'}" width="32" height="32" class="rounded-circle">
             <div class="fw-bold">${escapeHtml(u.displayName || u.firstName)}</div>
           </div>
        </td>
        <td>${escapeHtml(u.email)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger delete-user">Delete</button>
        </td>
      </tr>
    `).join('');
    
    tbody.querySelectorAll('.delete-user').forEach(btn => 
      btn.addEventListener('click', e => handleDeleteUser(e.target.closest('tr').dataset.id))
    );
  } catch(e) { console.error(e); }
}

/* ========== SHARED ACTIONS ========== */
async function handleDeleteOrder(id) {
  if(!confirm('Delete order?')) return;
  await deleteDoc(doc(db, 'orders', id));
  toast('Order deleted'); loadOrders(); loadReports(); // Refresh reports too
}

async function handleDeleteProduct(id) {
  if(!confirm('Delete product?')) return;
  await deleteDoc(doc(db, 'products', id));
  toast('Product deleted'); loadProducts(); loadInventory(); // Refresh inventory
}

async function handleDeleteUser(id) {
  if(!confirm('Delete user?')) return;
  await deleteDoc(doc(db, 'users', id));
  toast('User deleted'); loadUsers();
}

/* ========== ORDER ACTIONS (UPDATED WITH NOTIFICATIONS) ========== */
async function updateOrderStatus(orderId, newStatus) {
  const originalBtnText = document.activeElement.innerText; // Optional UI nicety
  
  try {
    // 1. Get the Order Document (We need the userId to know who to notify)
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      toast('Order not found', 'error');
      return;
    }
    
    const orderData = orderSnap.data();
    const customerId = orderData.userId; // The user to notify

    // 2. Update the Status in Firestore
    await updateDoc(orderRef, { status: newStatus });

    // 3. Send Notification Logic
    // We only send notifications for specific statuses
    if (customerId && (newStatus === "Ready For Pick up" || newStatus === "Completed")) {
      
      let title = "";
      let message = "";
      const orderNumber = orderId.slice(0, 8).toUpperCase();

      if (newStatus === "Ready For Pick up") {
        title = "Order Ready for Pickup!";
        message = `Good news! Your order #${orderNumber} is ready for pick up.`;
      } else if (newStatus === "Completed") {
        title = "Order Completed";
        message = `Your order #${orderNumber} has been completed. Thank you for shopping with us!`;
      }

      // Add to 'notifications' collection
      await addDoc(collection(db, "notifications"), {
        userId: customerId,       // Target specific user
        orderId: orderId,         // Link to order
        title: title,
        message: message,
        isRead: false,            // Mark as unread initially
        createdAt: serverTimestamp(),
        type: 'order_update'
      });
      
      console.log(`Notification sent to User ${customerId}`);
    }

    toast(`Order marked as ${newStatus}`);
    await loadOrders(); // Refresh the table to show new status color
    
  } catch (err) {
    console.error("Error updating status:", err);
    toast('Failed to update status', 'error');
  }
}

function updateDashboardCounts(counts) {
  const cards = document.querySelectorAll('#dashboard .card h4');
  if (counts.products !== undefined && cards[0]) cards[0].textContent = counts.products;
  if (counts.orders !== undefined && cards[1]) cards[1].textContent = counts.orders;
  if (counts.users !== undefined && cards[2]) {
     // Overwriting the 3rd card to show Users count instead of "Paid/Unpaid"
     const title = cards[2].parentNode.querySelector('h6');
     if(title) title.textContent = "Total Users";
     cards[2].textContent = counts.users; 
  }
}

/* ========== MODAL & UPLOAD HELPERS ========== */
function getProductModal() {
  if (document.getElementById('productModal')) return document.getElementById('productModal');
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="productModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;align-items:center;justify-content:center;">
      <div class="bg-white p-4 rounded shadow" style="width:600px;max-width:90%;">
        <h5>Product Details</h5>
        <form id="productForm" class="row g-3 mt-1">
          <input type="hidden" name="id">
          <div class="col-6"><label>Name</label><input name="Name" class="form-control" required></div>
          <div class="col-6"><label>Category</label><input name="Category" class="form-control" required></div>
          <div class="col-6"><label>Price</label><input type="number" name="Price" class="form-control" required></div>
          <div class="col-6"><label>Stock</label><input type="number" name="Stock" class="form-control" required></div>
          <div class="col-12"><label>Image</label><input type="file" id="p_file" class="form-control mb-1"><input name="Image" class="form-control" placeholder="URL"></div>
          <div class="col-12"><label>Description</label><textarea name="Description" class="form-control"></textarea></div>
          <div class="col-12 text-end">
            <button type="button" class="btn btn-secondary me-2" onclick="document.getElementById('productModal').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);
  document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
  return document.getElementById('productModal');
}

async function openProductModal(mode, id) {
  const m = getProductModal();
  m.style.display = 'flex';
  const f = document.getElementById('productForm');
  f.reset();
  f.elements['id'].value = id || '';
  if (mode === 'edit' && id) {
    const d = (await getDoc(doc(db, 'products', id))).data();
    f.elements['Name'].value = d.Name;
    f.elements['Category'].value = d.Category;
    f.elements['Price'].value = d.Price;
    f.elements['Stock'].value = d.Stock;
    f.elements['Image'].value = d.Image;
    f.elements['Description'].value = d.Description;
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const f = e.target;
  const id = f.elements['id'].value;
  const data = {
    Name: f.elements['Name'].value,
    Category: f.elements['Category'].value,
    Price: Number(f.elements['Price'].value),
    Stock: Number(f.elements['Stock'].value),
    Image: f.elements['Image'].value,
    Description: f.elements['Description'].value,
    updatedAt: serverTimestamp()
  };

  const file = document.getElementById('p_file').files[0];
  if (file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_UNSIGNED_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {method:'POST', body:fd});
    data.Image = (await res.json()).secure_url;
  }

  if (id) await updateDoc(doc(db, 'products', id), data);
  else { data.createdAt = serverTimestamp(); await addDoc(collection(db, 'products'), data); }
  
  document.getElementById('productModal').style.display='none';
  toast('Saved!'); loadProducts(); loadInventory();
}

function getStatusBadgeClass(s) {
  s = s?.toLowerCase();
  if(s==='confirmed'||s==='delivered') return 'bg-success';
  if(s==='pending') return 'bg-secondary';
  if(s==='shipped') return 'bg-primary';
  if(s==='cancelled') return 'bg-danger';
  return 'bg-light text-dark border';
}

function escapeHtml(s) { return s ? String(s).replace(/</g,'&lt;') : ''; }

/* ========== INIT ========== */
(async function init() {
  // Add Add Product Button
  if(productsSection) {
     const t = productsSection.querySelector('table');
     if(t) t.insertAdjacentHTML('beforebegin', '<div class="text-end mb-3"><button class="btn btn-primary btn-sm" onclick="openProductModal(\'add\')">+ Add Product</button></div>');
     window.openProductModal = openProductModal; // Expose to global
  }

  // Reload buttons
  if(ordersSection) ordersSection.querySelector('.card-body').insertAdjacentHTML('afterbegin', '<div class="text-end mb-2"><button class="btn btn-sm btn-light border" onclick="loadOrders()"><i class="bi bi-arrow-clockwise"></i></button></div>');
  
  window.loadOrders = loadOrders; // Expose

  await Promise.all([loadProducts(), loadOrders(), loadUsers(), loadInventory(), loadReports()]);
  console.log('Admin Dashboard Ready');
})();