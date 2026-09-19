/* ---------- CLOUDINARY CONFIG ---------- */
const cloudName = "dehtdxria";
const uploadPreset = "unipick_profile_photos"; // <-- your preset

async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset);

  const res = await fetch(url, { method: "POST", body: fd });
  const data = await res.json();
  if (!data || !data.secure_url) {
    console.error("Cloudinary upload response:", data);
    throw new Error("Cloudinary upload failed");
  }
  return data.secure_url;
}

/* ---------- FIREBASE (Auth + Firestore) ---------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  deleteUser,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot // <--- ADDED THIS IMPORT
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6f-crfOeE4e7gDr8gNolAzqIqBsUqg7Y",
  authDomain: "unipick-e-commerce-web-app.firebaseapp.com",
  projectId: "unipick-e-commerce-web-app",
  storageBucket: "unipick-e-commerce-web-app.appspot.com",
  messagingSenderId: "315041934524",
  appId: "1:315041934524:web:ba357dc818f868c19f74b9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- DOM REFERENCES ---------- */
const profileImagePreview = document.getElementById("profileImagePreview");
const profileImageInput = document.getElementById("profileImageInput");
const triggerProfileInput = document.getElementById("triggerProfileInput");

const sidebarEmail = document.getElementById("sidebarEmail");
const sidebarName = document.querySelector(".user-info h4");

const firstNameField = document.getElementById("firstName");
const lastNameField = document.getElementById("lastName");
const emailField = document.getElementById("email");
const phoneField = document.getElementById("phone");

const profileForm = document.getElementById("profileForm");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const passwordForm = document.getElementById("passwordForm");
const currentPasswordField = document.getElementById("currentPassword");
const newPasswordField = document.getElementById("newPassword");
const confirmPasswordField = document.getElementById("confirmPassword");
const savePasswordBtn = document.getElementById("savePasswordBtn");

const deletePasswordField = document.getElementById("deletePassword");
const confirmDeleteAccountBtn = document.getElementById("confirmDeleteAccountBtn");

const logoutBtn = document.getElementById("logoutBtn");

const navLinks = document.querySelectorAll(".account-nav .nav-link");
const tabs = document.querySelectorAll(".account-tab");

let currentUser = null;
let userDocRef = null;

/* ---------- UI: tabs ---------- */
function showTab(targetId) {
  tabs.forEach(t => t.classList.toggle("active-tab", t.id === targetId));
}
navLinks.forEach(btn => {
  btn.addEventListener("click", () => {
    navLinks.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute("data-target");
    showTab(target);
  });
});
showTab("profile-tab");

/* ---------- Avatar preview ---------- */
triggerProfileInput?.addEventListener("click", () => profileImageInput.click());
profileImageInput?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  profileImagePreview.src = URL.createObjectURL(f);
});

/* ---------- Auth state + load profile ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  userDocRef = doc(db, "users", user.uid);

  try {
    // 1. Load User Profile Data
    const snap = await getDoc(userDocRef);
    const data = snap.exists() ? snap.data() : {};

    firstNameField.value = data.firstName || "";
    lastNameField.value = data.lastName || "";
    phoneField.value = data.phone || "";
    emailField.value = user.email || "";

    sidebarEmail.textContent = user.email || "";
    sidebarName.textContent = `${data.firstName || ""} ${data.lastName || ""}`.trim() || (user.displayName || "My Account");

    profileImagePreview.src = data.photoURL || user.photoURL || "assets/img/img/user-placeholder.png";

    // 2. Load User Orders
    loadUserOrders(user.uid);
    
    // 3. Start Notification Listener (NEW)
    listenForNotifications(user);

  } catch (err) {
    console.error("Load profile error:", err);
    alert("Failed to load profile data (see console).");
  }
});

/* ---------- NOTIFICATION LISTENER FUNCTION (NEW) ---------- */
function listenForNotifications(user) {
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
}

/* ---------- LOAD ORDERS FUNCTION ---------- */
async function loadUserOrders(userId) {
  // ... (Your existing loadUserOrders code remains here) ...
  // (I am omitting the full body of loadUserOrders for brevity since it wasn't changed, 
  //  but in your actual file, keep the existing logic you have for displaying orders.)
  
  const ordersContainer = document.getElementById("orders-list-container");
  if (!ordersContainer) return;

  ordersContainer.innerHTML = '<div class="text-center py-4"><span class="spinner-border text-primary"></span> Loading orders...</div>';

  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      ordersContainer.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-bag-x" style="font-size: 3rem; color: #ccc;"></i>
          <p class="mt-3 text-muted">You haven't placed any orders yet.</p>
          <a href="category.html" class="btn btn-primary btn-sm mt-2">Start Shopping</a>
        </div>
      `;
      return;
    }

    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    orders.sort((a, b) => {
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
      return dateB - dateA;
    });

    ordersContainer.innerHTML = ""; 

    orders.forEach(order => {
      const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : "N/A";
      const total = order.totals?.total ? order.totals.total.toFixed(2) : "0.00";
      const statusClass = getStatusClass(order.status);
      const itemCount = order.items ? order.items.length : 0;

      const cardHtml = `
        <div class="card mb-3 border shadow-sm" id="order-card-${order.id}">
          <div class="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <div>
              <span class="fw-bold text-dark">Order #${order.id.slice(0, 8).toUpperCase()}</span>
              <span class="text-muted small ms-2"><i class="bi bi-calendar3"></i> ${date}</span>
            </div>
            <span class="badge ${statusClass}">${order.status || 'Pending'}</span>
          </div>
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-7">
                <p class="mb-1 text-muted small">Items: <span class="fw-medium text-dark">${itemCount}</span></p>
                <p class="mb-0 text-muted small">Total: <span class="fw-bold text-primary">₱${total}</span></p>
              </div>
              <div class="col-md-5 text-md-end mt-3 mt-md-0 d-flex justify-content-md-end gap-2">
                 <button class="btn btn-outline-danger btn-sm btn-cancel-order" 
                         data-id="${order.id}">
                    <i class="bi bi-x-circle"></i> Cancel
                 </button>
                 <a href="order-confirmation.html?id=${order.id}" class="btn btn-outline-primary btn-sm">
                   View Details
                 </a>
              </div>
            </div>
          </div>
        </div>
      `;
      ordersContainer.insertAdjacentHTML('beforeend', cardHtml);
    });

  } catch (error) {
    console.error("Error loading orders:", error);
    ordersContainer.innerHTML = '<div class="alert alert-danger">Failed to load orders.</div>';
  }
}

function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case 'confirmed': return 'bg-primary';
    case 'processing': return 'bg-info text-dark';
    case 'shipped': return 'bg-warning text-dark';
    case 'delivered': return 'bg-success';
    case 'cancelled': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

/* ---------- Save profile (upload to Cloudinary) ---------- */
profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !userDocRef) { alert("User not yet loaded. Refresh the page."); return; }

  const btn = saveProfileBtn;
  const origHtml = btn ? btn.innerHTML : null;
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...'; }

    const firstName = firstNameField.value.trim();
    const lastName = lastNameField.value.trim();
    const email = emailField.value.trim();
    const phone = phoneField.value.trim();

    const updates = { firstName, lastName, phone };

    if (profileImageInput.files && profileImageInput.files.length > 0) {
      const file = profileImageInput.files[0];
      try {
        const secureUrl = await uploadToCloudinary(file);
        updates.photoURL = secureUrl;
        profileImagePreview.src = secureUrl;
      } catch (err) {
        console.error("Cloudinary upload failed:", err);
        throw new Error("Profile photo upload failed: " + (err.message || ""));
      }
    }

    await setDoc(userDocRef, updates, { merge: true });

    try {
      await updateProfile(currentUser, {
        displayName: `${firstName} ${lastName}`.trim() || currentUser.displayName,
        photoURL: updates.photoURL || currentUser.photoURL || null
      });
    } catch (err) {
      console.warn("updateProfile warning:", err);
    }

    if (email && email !== currentUser.email) {
      const pwd = prompt("Enter your current password to confirm email change:");
      if (!pwd) {
        alert("Email change cancelled.");
      } else {
        try {
          const cred = EmailAuthProvider.credential(currentUser.email, pwd);
          await reauthenticateWithCredential(currentUser, cred);
          await updateEmail(currentUser, email);
          sidebarEmail.textContent = email;
        } catch (err) {
          console.error("Email update error:", err);
          throw new Error("Email update failed: " + (err.message || ""));
        }
      }
    }

    sidebarName.textContent = `${firstName} ${lastName}`.trim() || (currentUser.displayName || "My Account");

    alert("Profile updated successfully.");
  } catch (err) {
    console.error("Save profile failed:", err);
    alert("Failed to save profile: " + (err.message || "See console."));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origHtml || 'Save Changes'; }
  }
});

/* ---------- Change password ---------- */
passwordForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) { alert("User not loaded."); return; }

  const btn = savePasswordBtn;
  const origHtml = btn ? btn.innerHTML : null;
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Updating...'; }

    const currentPass = currentPasswordField.value;
    const newPass = newPasswordField.value;
    const confirmPass = confirmPasswordField.value;

    if (!currentPass || !newPass) { throw new Error("Please fill all password fields."); }
    if (newPass !== confirmPass) { throw new Error("New passwords do not match."); }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPass);

    currentPasswordField.value = "";
    newPasswordField.value = "";
    confirmPasswordField.value = "";

    alert("Password updated successfully.");
  } catch (err) {
    console.error("Password update error:", err);
    alert("Failed to update password: " + (err.message || ""));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origHtml || '<i class="bi bi-shield-lock-fill me-1"></i> Update Password'; }
  }
});

/* ---------- Delete account ---------- */
confirmDeleteAccountBtn?.addEventListener("click", async () => {
  if (!currentUser || !userDocRef) { alert("User not ready."); return; }

  const pass = deletePasswordField.value;
  if (!pass) { alert("Please enter your password to confirm deletion."); return; }

  confirmDeleteAccountBtn.disabled = true;
  const origHtml = confirmDeleteAccountBtn.innerHTML;
  confirmDeleteAccountBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting...';

  try {
    const cred = EmailAuthProvider.credential(currentUser.email, pass);
    await reauthenticateWithCredential(currentUser, cred);

    await deleteDoc(userDocRef).catch(()=>{});
    await deleteUser(currentUser);

    alert("Account deleted.");
    window.location.href = "register.html";
  } catch (err) {
    console.error("Delete account error:", err);
    alert("Failed to delete account: " + (err.message || ""));
  } finally {
    confirmDeleteAccountBtn.disabled = false;
    confirmDeleteAccountBtn.innerHTML = origHtml;
  }
});

/* ---------- Logout ---------- */
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout error:", err);
    alert("Failed to logout: " + (err.message || ""));
  }
});

/* ---------- CANCEL ORDER LOGIC (from previous steps) ---------- */
let orderIdToDelete = null;
const cancelOrderModalEl = document.getElementById('cancelOrderModal');
let cancelOrderModalObj = null; 
if (cancelOrderModalEl) {
  cancelOrderModalObj = new bootstrap.Modal(cancelOrderModalEl);
}

const confirmCancelOrderBtn = document.getElementById('confirmCancelOrderBtn');
const ordersContainer = document.getElementById("orders-list-container");

if (ordersContainer) {
  ordersContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-cancel-order');
    if (btn) {
      orderIdToDelete = btn.getAttribute('data-id');
      if (cancelOrderModalObj) {
        cancelOrderModalObj.show();
      }
    }
  });
}

if (confirmCancelOrderBtn) {
  confirmCancelOrderBtn.addEventListener('click', async () => {
    if (!orderIdToDelete) return;
    const originalText = confirmCancelOrderBtn.innerHTML;
    confirmCancelOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Deleting...';
    confirmCancelOrderBtn.disabled = true;

    try {
      await deleteDoc(doc(db, "orders", orderIdToDelete));
      const cardToRemove = document.getElementById(`order-card-${orderIdToDelete}`);
      if (cardToRemove) {
        cardToRemove.remove();
      }
      if (ordersContainer.children.length === 0) {
        ordersContainer.innerHTML = `
          <div class="text-center py-5">
            <i class="bi bi-bag-x" style="font-size: 3rem; color: #ccc;"></i>
            <p class="mt-3 text-muted">You haven't placed any orders yet.</p>
            <a href="category.html" class="btn btn-primary btn-sm mt-2">Start Shopping</a>
          </div>
        `;
      }
      if (cancelOrderModalObj) {
        cancelOrderModalObj.hide();
      }
    } catch (err) {
      console.error("Error cancelling order:", err);
      alert("Failed to cancel order: " + err.message);
    } finally {
      confirmCancelOrderBtn.innerHTML = originalText;
      confirmCancelOrderBtn.disabled = false;
      orderIdToDelete = null;
    }
  });
}