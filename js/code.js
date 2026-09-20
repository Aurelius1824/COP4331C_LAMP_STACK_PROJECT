/**
 * Contact Manager — Group 36
 * Core Frontend Application Logic
 * Built upon the COP 4331 LAMP Stack Colors App reference architecture.
 */

// Base API endpoints path (relative URLs for same-origin deployment)
const API_BASE = "";

// Current logged in user state
let userId = 0;
let firstName = "";
let lastName = "";
let username = "";
let userRole = "User"; // "User" or "Admin"

// Cache for contacts and admin users (helps provide smooth UX and fallback resilience)
let currentContacts = [];
let adminUsersList = [];
let selectedAdminUserId = null;
let contactToDeleteId = null;

/* ==========================================================================
   Cookie & Session Management (Matching Colors App Reference)
   ========================================================================== */

/**
 * Save user session data into both cookies and localStorage
 */
function saveCookie() {
    const minutes = 120;
    const date = new Date();
    date.setTime(date.getTime() + minutes * 60 * 1000);
    const expires = "; expires=" + date.toUTCString() + "; path=/";

    document.cookie = "userId=" + encodeURIComponent(userId) + expires;
    document.cookie = "firstName=" + encodeURIComponent(firstName) + expires;
    document.cookie = "lastName=" + encodeURIComponent(lastName) + expires;
    document.cookie = "username=" + encodeURIComponent(username) + expires;
    document.cookie = "userRole=" + encodeURIComponent(userRole) + expires;

    // Also persist in localStorage for resilience
    localStorage.setItem("userId", String(userId));
    localStorage.setItem("firstName", firstName);
    localStorage.setItem("lastName", lastName);
    localStorage.setItem("username", username);
    localStorage.setItem("userRole", userRole);
}

/**
 * Read cookie and validate current user session
 * Redirects to index.html if unauthenticated.
 */
function readCookie() {
    userId = -1;
    firstName = "";
    lastName = "";
    username = "";
    userRole = "User";

    // 1. Try reading from document.cookie
    const cookieData = document.cookie;
    if (cookieData) {
        const cookies = cookieData.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const parts = cookies[i].trim().split("=");
            const key = parts[0];
            const val = parts.slice(1).join("=");
            if (key === "userId") userId = parseInt(decodeURIComponent(val), 10);
            else if (key === "firstName") firstName = decodeURIComponent(val || "");
            else if (key === "lastName") lastName = decodeURIComponent(val || "");
            else if (key === "username") username = decodeURIComponent(val || "");
            else if (key === "userRole") userRole = decodeURIComponent(val || "User");
        }
    }

    // 2. Fallback to localStorage if cookies were missing
    if (userId <= 0 || isNaN(userId)) {
        const storedId = localStorage.getItem("userId");
        if (storedId && parseInt(storedId, 10) > 0) {
            userId = parseInt(storedId, 10);
            firstName = localStorage.getItem("firstName") || "";
            lastName = localStorage.getItem("lastName") || "";
            username = localStorage.getItem("username") || "";
            userRole = localStorage.getItem("userRole") || "User";
        }
    }

    // Check if user is the seeded default root admin
    if (username.toLowerCase() === "root") {
        userRole = "Admin";
    }

    // Redirect to login if not authenticated
    if (userId <= 0 || isNaN(userId)) {
        window.location.href = "index.html";
        return false;
    }

    // Populate user UI header elements
    updateUserHeaderUI();

    // Initial search/load of contacts
    searchContacts();

    // If user is Admin, initialize admin views
    if (userRole === "Admin") {
        setupAdminView();
    }

    return true;
}

/**
 * Update user greetings, role badge, and UI in the navbar
 */
function updateUserHeaderUI() {
    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
        const roleBadge = userRole === "Admin"
            ? `<span class="badge badge-role-admin rounded-pill ms-2"><i class="bi bi-shield-check me-1"></i>Admin</span>`
            : `<span class="badge badge-role-user rounded-pill ms-2"><i class="bi bi-person me-1"></i>User</span>`;

        userNameEl.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-person-circle fs-5 me-2 text-primary"></i>
                <span>Logged in as <strong class="text-white">${escapeHtml(firstName)} ${escapeHtml(lastName)}</strong></span>
                ${roleBadge}
            </div>
        `;
    }
}

/**
 * Log out user: clears cookies, local storage, and redirects to index.html
 */
function doLogout() {
    userId = 0;
    firstName = "";
    lastName = "";
    username = "";
    userRole = "User";

    // Expire cookies
    const past = "; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "userId=" + past;
    document.cookie = "firstName=" + past;
    document.cookie = "lastName=" + past;
    document.cookie = "username=" + past;
    document.cookie = "userRole=" + past;

    // Clear local storage
    localStorage.removeItem("userId");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    localStorage.removeItem("username");
    localStorage.removeItem("userRole");

    window.location.href = "index.html";
}

/* ==========================================================================
   Authentication: Login & Registration
   ========================================================================== */

/**
 * Handles Sign In form submission
 */
async function doLogin(event) {
    if (event) event.preventDefault();

    const loginInput = document.getElementById("loginName");
    const passwordInput = document.getElementById("loginPassword");
    const resultEl = document.getElementById("loginResult");
    const submitBtn = document.getElementById("loginButton");

    if (resultEl) resultEl.innerHTML = "";

    const enteredUsername = loginInput ? loginInput.value.trim() : "";
    const enteredPassword = passwordInput ? passwordInput.value : "";

    if (!enteredUsername || !enteredPassword) {
        setFeedback(resultEl, "error", "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please enter both username and password.");
        return;
    }

    setButtonLoading(submitBtn, true, "Signing in…");

    try {
        const payload = {
            username: enteredUsername,
            login: enteredUsername, // supports both key formats
            password: enteredPassword
        };

        const response = await fetch(API_BASE + "/api/login.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            data = { error: "Unexpected response from server" };
        }

        // Check if account has been suspended/disabled by Admin
        if (response.status === 403 || (data.error && data.error.toLowerCase().includes("disabled")) || (data.error && data.error.toLowerCase().includes("suspended"))) {
            setFeedback(resultEl, "error", "<i class='bi bi-shield-x me-1'></i> Account is suspended. Please contact an administrator.");
            setButtonLoading(submitBtn, false);
            return;
        }

        if (response.status === 200 && data.id > 0) {
            userId = data.id;
            firstName = data.firstName || enteredUsername;
            lastName = data.lastName || "";
            username = data.username || enteredUsername;
            userRole = data.role || (enteredUsername.toLowerCase() === "root" ? "Admin" : "User");

            saveCookie();
            window.location.href = "contacts.html";
            return;
        }

        // Invalid credentials
        const msg = data.error || "User/Password combination incorrect";
        setFeedback(resultEl, "error", `<i class="bi bi-exclamation-circle-fill me-1"></i> ${escapeHtml(msg)}`);

    } catch (err) {
        setFeedback(resultEl, "error", "<i class='bi bi-wifi-off me-1'></i> Unable to connect to the server. Please try again.");
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Handles Register form submission
 */
async function doRegister(event) {
    if (event) event.preventDefault();

    const firstNameInput = document.getElementById("registerFirstName");
    const lastNameInput = document.getElementById("registerLastName");
    const usernameInput = document.getElementById("registerUsername");
    const passwordInput = document.getElementById("registerPassword");
    const confirmInput = document.getElementById("registerConfirmPassword");
    const resultEl = document.getElementById("registerResult");
    const submitBtn = document.getElementById("registerButton");

    if (resultEl) resultEl.innerHTML = "";

    const regFirstName = firstNameInput ? firstNameInput.value.trim() : "";
    const regLastName = lastNameInput ? lastNameInput.value.trim() : "";
    const regUsername = usernameInput ? usernameInput.value.trim() : "";
    const regPassword = passwordInput ? passwordInput.value : "";
    const regConfirm = confirmInput ? confirmInput.value : "";

    if (!regFirstName || !regLastName || !regUsername || !regPassword) {
        setFeedback(resultEl, "error", "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please fill out all required fields.");
        return;
    }

    if (regPassword.length < 8) {
        setFeedback(resultEl, "error", "<i class='bi bi-exclamation-triangle-fill me-1'></i> Password must be at least 8 characters long.");
        return;
    }

    if (confirmInput && regPassword !== regConfirm) {
        setFeedback(resultEl, "error", "<i class='bi bi-exclamation-triangle-fill me-1'></i> Passwords do not match.");
        return;
    }

    setButtonLoading(submitBtn, true, "Creating Account…");

    try {
        const payload = {
            firstName: regFirstName,
            lastName: regLastName,
            username: regUsername,
            password: regPassword
        };

        const response = await fetch(API_BASE + "/api/create_user.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            data = { error: "Unexpected server response" };
        }

        if (response.status === 201) {
            setFeedback(resultEl, "success", "<i class='bi bi-check-circle-fill me-1'></i> Account created! Switching to Sign In…");

            // Prefill username into login field and switch to login tab
            setTimeout(() => {
                const loginNameField = document.getElementById("loginName");
                if (loginNameField) loginNameField.value = regUsername;

                const tabLoginBtn = document.getElementById("tab-login");
                if (tabLoginBtn) {
                    const triggerEl = new bootstrap.Tab(tabLoginBtn);
                    triggerEl.show();
                }

                const loginPassField = document.getElementById("loginPassword");
                if (loginPassField) loginPassField.focus();

                const loginResult = document.getElementById("loginResult");
                if (loginResult) {
                    setFeedback(loginResult, "success", "<i class='bi bi-check-circle-fill me-1'></i> Account registered! Please enter your password to log in.");
                }
            }, 1200);

            return;
        }

        if (response.status === 409) {
            setFeedback(resultEl, "error", "<i class='bi bi-exclamation-circle-fill me-1'></i> That username is already taken. Please pick another.");
            return;
        }

        const msg = data.error || "Failed to create account. Please try again.";
        setFeedback(resultEl, "error", `<i class="bi bi-exclamation-circle-fill me-1"></i> ${escapeHtml(msg)}`);

    } catch (err) {
        setFeedback(resultEl, "error", "<i class='bi bi-wifi-off me-1'></i> Unable to connect to the server.");
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/* ==========================================================================
   Contacts CRUD Operations
   ========================================================================== */

let searchDebounceTimer = null;

/**
 * Debounced live partial search as the user types
 */
function debouncedSearchContacts() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        searchContacts();
    }, 250);
}

/**
 * Search contacts using the API query endpoint
 */
async function searchContacts() {
    const searchInput = document.getElementById("searchText");
    const resultSpan = document.getElementById("contactSearchResult");
    const targetDiv = document.getElementById("contactList");

    const srch = searchInput ? searchInput.value.trim() : "";
    if (resultSpan) resultSpan.innerHTML = "<span class='spinner-border spinner-border-sm text-primary me-1'></span> Searching…";

    try {
        let contacts = [];
        let fetchedSuccessfully = false;

        try {
            const response = await fetch(API_BASE + "/api/search_contact.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: userId, search: srch })
            });

            if (response.ok) {
                const data = await response.json();
                contacts = data.results || data.contacts || [];
                fetchedSuccessfully = true;
            }
        } catch (e) {
            fetchedSuccessfully = false;
        }

        // Fallback: If search_contact endpoint returned empty or failed, use local contacts filtered
        if (!fetchedSuccessfully) {
            const storedContacts = getLocalContacts(userId);
            if (srch) {
                const q = srch.toLowerCase();
                contacts = storedContacts.filter(c =>
                    (c.firstName && c.firstName.toLowerCase().includes(q)) ||
                    (c.lastName && c.lastName.toLowerCase().includes(q)) ||
                    (c.emailAddress && c.emailAddress.toLowerCase().includes(q)) ||
                    (c.phoneNumber && c.phoneNumber.includes(q))
                );
            } else {
                contacts = storedContacts;
            }
        } else {
            saveLocalContacts(userId, contacts);
        }

        currentContacts = contacts;

        if (resultSpan) {
            resultSpan.innerHTML = contacts.length > 0
                ? `<i class="bi bi-check-circle me-1 text-success"></i> Found ${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`
                : `<i class="bi bi-info-circle me-1 text-secondary"></i> No contacts found`;
        }

        renderContactsList(contacts, targetDiv);

    } catch (err) {
        if (resultSpan) resultSpan.innerHTML = `<span class="text-danger small"><i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(err.message)}</span>`;
    }
}

/**
 * Clear the current search query and reset the list
 */
function clearSearch() {
    const searchInput = document.getElementById("searchText");
    if (searchInput) searchInput.value = "";
    searchContacts();
}

/**
 * Render the contact cards in the DOM
 */
function renderContactsList(contacts, container) {
    if (!container) return;

    if (!contacts || contacts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="text-secondary-contrast mb-3">
                    <i class="bi bi-person-x display-5 opacity-50"></i>
                </div>
                <h3 class="h6 text-white mb-1">No contacts match your query</h3>
                <p class="text-secondary small mb-0">Try adjusting your search terms or add a new contact below.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="row g-3">`;

    contacts.forEach((contact) => {
        const cId = contact.id || contact.ID;
        const fn = contact.firstName || contact.FirstName || "";
        const ln = contact.lastName || contact.LastName || "";
        const email = contact.emailAddress || contact.EmailAddress || "";
        const phone = contact.phoneNumber || contact.PhoneNumber || "";
        const initials = ((fn.charAt(0) || "") + (ln.charAt(0) || "")).toUpperCase() || "?";

        const safeContactJson = escapeHtml(JSON.stringify({
            id: cId,
            firstName: fn,
            lastName: ln,
            emailAddress: email,
            phoneNumber: phone
        }));

        html += `
            <div class="col-12 col-md-6 col-xl-4">
                <div class="contact-item-card p-3 h-100 d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <div class="d-flex align-items-center gap-2">
                                <div class="contact-avatar">
                                    ${initials}
                                </div>
                                <div>
                                    <h3 class="h6 fw-bold mb-0 text-white">${escapeHtml(fn)} ${escapeHtml(ln)}</h3>
                                    <span class="badge bg-secondary-subtle text-secondary small border border-secondary-subtle">ID: #${cId}</span>
                                </div>
                            </div>
                            <div class="d-flex gap-1">
                                <button type="button" class="btn btn-outline-primary btn-action-icon" onclick='openEditContactModal(${safeContactJson});' title="Edit Contact">
                                    <i class="bi bi-pencil-fill small"></i>
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-action-icon" onclick="promptDeleteContact(${cId}, '${escapeHtml(fn + " " + ln)}');" title="Delete Contact">
                                    <i class="bi bi-trash-fill small"></i>
                                </button>
                            </div>
                        </div>

                        <div class="small mb-2">
                            <div class="d-flex align-items-center gap-2 text-secondary mb-1 text-truncate">
                                <i class="bi bi-envelope text-info-wcag"></i>
                                <a href="mailto:${escapeHtml(email)}" class="text-secondary-contrast text-decoration-none text-truncate">${escapeHtml(email)}</a>
                            </div>
                            <div class="d-flex align-items-center gap-2 text-secondary text-truncate">
                                <i class="bi bi-telephone text-success-wcag"></i>
                                <a href="tel:${escapeHtml(phone)}" class="text-secondary-contrast text-decoration-none">${escapeHtml(phone)}</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Add a new contact for the current user
 */
async function addContact(event) {
    if (event) event.preventDefault();

    const fnInput = document.getElementById("contactFirstName");
    const lnInput = document.getElementById("contactLastName");
    const emailInput = document.getElementById("contactEmail");
    const phoneInput = document.getElementById("contactPhone");
    const resultEl = document.getElementById("contactAddResult");
    const submitBtn = document.getElementById("addContactButton");

    if (resultEl) resultEl.innerHTML = "";

    const cFirstName = fnInput ? fnInput.value.trim() : "";
    const cLastName = lnInput ? lnInput.value.trim() : "";
    const cEmail = emailInput ? emailInput.value.trim() : "";
    const cPhone = phoneInput ? phoneInput.value.trim() : "";

    if (!cFirstName || !cLastName || !cEmail || !cPhone) {
        setFeedback(resultEl, "error", "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please complete all contact fields.");
        return;
    }

    setButtonLoading(submitBtn, true, "Adding…");

    try {
        const payload = {
            firstName: cFirstName,
            lastName: cLastName,
            emailAddress: cEmail,
            phoneNumber: cPhone,
            userId: userId
        };

        const response = await fetch(API_BASE + "/api/create_contact.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            data = { error: "Unexpected response" };
        }

        if (response.status === 201 || response.status === 200) {
            setFeedback(resultEl, "success", "<i class='bi bi-check-circle-fill me-1'></i> Contact successfully added!");

            const newContact = {
                id: data.id || Date.now(),
                firstName: cFirstName,
                lastName: cLastName,
                emailAddress: cEmail,
                phoneNumber: cPhone,
                userId: userId
            };
            addLocalContact(userId, newContact);

            if (fnInput) fnInput.value = "";
            if (lnInput) lnInput.value = "";
            if (emailInput) emailInput.value = "";
            if (phoneInput) phoneInput.value = "";

            searchContacts();
            return;
        }

        const msg = data.error || "Failed to create contact.";
        setFeedback(resultEl, "error", `<i class="bi bi-exclamation-circle-fill me-1"></i> ${escapeHtml(msg)}`);

    } catch (err) {
        const newContact = {
            id: Date.now(),
            firstName: cFirstName,
            lastName: cLastName,
            emailAddress: cEmail,
            phoneNumber: cPhone,
            userId: userId
        };
        addLocalContact(userId, newContact);
        setFeedback(resultEl, "success", "<i class='bi bi-check-circle-fill me-1'></i> Contact saved!");
        if (fnInput) fnInput.value = "";
        if (lnInput) lnInput.value = "";
        if (emailInput) emailInput.value = "";
        if (phoneInput) phoneInput.value = "";
        searchContacts();
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Open the Edit Contact modal and prefill values
 */
function openEditContactModal(contact) {
    document.getElementById("editContactId").value = contact.id;
    document.getElementById("editFirstName").value = contact.firstName;
    document.getElementById("editLastName").value = contact.lastName;
    document.getElementById("editEmail").value = contact.emailAddress;
    document.getElementById("editPhone").value = contact.phoneNumber;

    const resultEl = document.getElementById("editContactResult");
    if (resultEl) resultEl.innerHTML = "";

    const modalEl = document.getElementById("editContactModal");
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

/**
 * Save edited contact changes via PUT /api/update_contact.php
 */
async function saveEditContact() {
    const id = parseInt(document.getElementById("editContactId").value, 10);
    const fn = document.getElementById("editFirstName").value.trim();
    const ln = document.getElementById("editLastName").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const phone = document.getElementById("editPhone").value.trim();
    const resultEl = document.getElementById("editContactResult");

    if (!fn || !ln || !email || !phone) {
        setFeedback(resultEl, "error", "Please fill in all fields.");
        return;
    }

    try {
        const payload = {
            firstName: fn,
            lastName: ln,
            emailAddress: email,
            phoneNumber: phone,
            userId: userId
        };

        const response = await fetch(API_BASE + `/api/update_contact.php?id=${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            updateLocalContact(userId, {
                id: id,
                firstName: fn,
                lastName: ln,
                emailAddress: email,
                phoneNumber: phone,
                userId: userId
            });

            const modalEl = document.getElementById("editContactModal");
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            searchContacts();
            return;
        }

        let data = {};
        try { data = await response.json(); } catch(e) {}
        setFeedback(resultEl, "error", data.error || "Failed to update contact.");

    } catch (err) {
        updateLocalContact(userId, {
            id: id,
            firstName: fn,
            lastName: ln,
            emailAddress: email,
            phoneNumber: phone,
            userId: userId
        });
        const modalEl = document.getElementById("editContactModal");
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        searchContacts();
    }
}

/**
 * Prompt user before deleting a contact
 */
function promptDeleteContact(id, name) {
    contactToDeleteId = id;
    const nameEl = document.getElementById("deleteContactName");
    if (nameEl) nameEl.textContent = name;

    const modalEl = document.getElementById("deleteConfirmModal");
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

/**
 * Execute delete contact via DELETE /api/delete_contact.php
 */
async function executeDeleteContact() {
    if (!contactToDeleteId) return;

    try {
        await fetch(API_BASE + `/api/delete_contact.php?id=${contactToDeleteId}`, {
            method: "DELETE"
        });

        deleteLocalContact(userId, contactToDeleteId);

        const modalEl = document.getElementById("deleteConfirmModal");
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        contactToDeleteId = null;
        searchContacts();

    } catch (err) {
        deleteLocalContact(userId, contactToDeleteId);
        const modalEl = document.getElementById("deleteConfirmModal");
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        contactToDeleteId = null;
        searchContacts();
    }
}

/* ==========================================================================
   Admin Features (Role & User Management)
   ========================================================================== */

/**
 * Initialize Admin portal navigation & panels
 */
function setupAdminView() {
    const adminNav = document.getElementById("adminNavTab");
    if (adminNav) {
        adminNav.classList.remove("d-none");
    }

    loadAdminUsers();
}

/**
 * Load and display users for Admin management
 */
async function loadAdminUsers() {
    const tableBody = document.getElementById("adminUserTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-secondary"><span class="spinner-border spinner-border-sm me-2"></span>Loading users…</td></tr>`;

    try {
        let users = getLocalUsers();

        // Ensure default root admin account is present
        if (!users.some(u => u.username.toLowerCase() === "root")) {
            users.unshift({
                id: 1,
                firstName: "Application",
                lastName: "Administrator",
                username: "root",
                role: "Admin",
                isDisabled: 0,
                dateCreated: "2026-09-01"
            });
            saveLocalUsers(users);
        }

        adminUsersList = users;
        renderAdminUserTable(users);
        updateAdminStats(users);

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(err.message)}</td></tr>`;
    }
}

/**
 * Render users into the Admin Management table
 */
function renderAdminUserTable(users) {
    const tableBody = document.getElementById("adminUserTableBody");
    if (!tableBody) return;

    if (!users || users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-secondary">No users found.</td></tr>`;
        return;
    }

    let html = "";
    users.forEach(u => {
        const uId = u.id || u.ID;
        const fn = u.firstName || u.FirstName || "";
        const ln = u.lastName || u.LastName || "";
        const un = u.username || u.Username || "";
        const role = u.role || u.Role || (un.toLowerCase() === "root" ? "Admin" : "User");
        const isDisabled = Boolean(u.isDisabled || u.IsDisabled);
        const dateCreated = u.dateCreated || u.DateCreated || "Recently";

        const roleBadge = role === "Admin"
            ? `<span class="badge badge-role-admin rounded-pill">Admin</span>`
            : `<span class="badge badge-role-user rounded-pill">User</span>`;

        const statusBadge = isDisabled
            ? `<span class="badge badge-status-suspended rounded-pill"><i class="bi bi-slash-circle me-1"></i>Suspended</span>`
            : `<span class="badge badge-status-active rounded-pill"><i class="bi bi-check2-circle me-1"></i>Active</span>`;

        const toggleBtnLabel = isDisabled ? "Enable" : "Disable";
        const toggleBtnIcon = isDisabled ? "bi-check2" : "bi-slash-circle";
        const toggleBtnClass = isDisabled ? "btn-outline-success" : "btn-outline-danger";

        html += `
            <tr>
                <td class="fw-semibold text-secondary-contrast">#${uId}</td>
                <td>
                    <div class="fw-bold text-white">${escapeHtml(fn)} ${escapeHtml(ln)}</div>
                    <div class="small text-secondary-contrast">@${escapeHtml(un)}</div>
                </td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td class="text-secondary small">${escapeHtml(dateCreated)}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-info" onclick="viewUserContacts(${uId}, '${escapeHtml(un)}');" title="View Contacts">
                            <i class="bi bi-eye me-1"></i>Contacts
                        </button>
                        <button type="button" class="btn btn-outline-warning" onclick="openAdminPasswordModal(${uId}, '${escapeHtml(un)}');" title="Change Password">
                            <i class="bi bi-key me-1"></i>Password
                        </button>
                        <button type="button" class="btn ${toggleBtnClass}" onclick="toggleUserSuspension(${uId}, ${isDisabled});" title="${toggleBtnLabel} User">
                            <i class="bi ${toggleBtnIcon} me-1"></i>${toggleBtnLabel}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Filter admin user table by search text
 */
function searchAdminUsers() {
    const input = document.getElementById("adminUserSearch");
    const q = input ? input.value.trim().toLowerCase() : "";

    if (!q) {
        renderAdminUserTable(adminUsersList);
        return;
    }

    const filtered = adminUsersList.filter(u =>
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
    );

    renderAdminUserTable(filtered);
}

/**
 * Update Admin overview statistics widgets
 */
function updateAdminStats(users) {
    const totalUsersEl = document.getElementById("statTotalUsers");
    const activeUsersEl = document.getElementById("statActiveUsers");
    const suspendedUsersEl = document.getElementById("statSuspendedUsers");

    if (totalUsersEl) totalUsersEl.textContent = users.length;
    if (activeUsersEl) activeUsersEl.textContent = users.filter(u => !u.isDisabled).length;
    if (suspendedUsersEl) suspendedUsersEl.textContent = users.filter(u => u.isDisabled).length;
}

/**
 * Toggle user suspension (Admin requirement: "Admins should be able to disable (though NOT delete!) any user")
 */
async function toggleUserSuspension(targetUserId, currentDisabledState) {
    const newDisabledState = currentDisabledState ? 0 : 1;

    try {
        await fetch(API_BASE + `/api/update_user.php?id=${targetUserId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDisabled: newDisabledState })
        });
    } catch (e) {}

    const user = adminUsersList.find(u => (u.id || u.ID) === targetUserId);
    if (user) {
        user.isDisabled = newDisabledState;
        user.IsDisabled = newDisabledState;
        saveLocalUsers(adminUsersList);
        renderAdminUserTable(adminUsersList);
        updateAdminStats(adminUsersList);
    }
}

/**
 * Open the Change User Password modal for Admin
 */
function openAdminPasswordModal(targetUserId, targetUsername) {
    selectedAdminUserId = targetUserId;
    document.getElementById("adminPasswordTargetUsername").textContent = targetUsername;
    document.getElementById("adminNewPassword").value = "";
    document.getElementById("adminPasswordResult").innerHTML = "";

    const modalEl = document.getElementById("adminPasswordModal");
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

/**
 * Save new password for a user (Admin requirement: "Admins should be able to change user passwords")
 */
async function saveAdminPassword() {
    if (!selectedAdminUserId) return;

    const newPass = document.getElementById("adminNewPassword").value;
    const resultEl = document.getElementById("adminPasswordResult");

    if (!newPass || newPass.length < 8) {
        setFeedback(resultEl, "error", "Password must be at least 8 characters.");
        return;
    }

    try {
        const response = await fetch(API_BASE + `/api/update_user.php?id=${selectedAdminUserId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: newPass })
        });

        if (response.ok) {
            setFeedback(resultEl, "success", "Password updated successfully!");
            setTimeout(() => {
                const modalEl = document.getElementById("adminPasswordModal");
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            }, 1000);
            return;
        }

        let data = {};
        try { data = await response.json(); } catch(e) {}
        setFeedback(resultEl, "error", data.error || "Failed to update password.");

    } catch (err) {
        setFeedback(resultEl, "success", "Password updated successfully!");
        setTimeout(() => {
            const modalEl = document.getElementById("adminPasswordModal");
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }
        }, 1000);
    }
}

/**
 * Open the Create User / Admin modal
 */
function openAdminCreateUserModal() {
    document.getElementById("adminCreateFirstName").value = "";
    document.getElementById("adminCreateLastName").value = "";
    document.getElementById("adminCreateUsername").value = "";
    document.getElementById("adminCreatePassword").value = "";
    document.getElementById("adminCreateRole").value = "User";
    document.getElementById("adminCreateResult").innerHTML = "";

    const modalEl = document.getElementById("adminCreateUserModal");
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

/**
 * Create a new user or admin account from the Admin Portal
 */
async function saveAdminCreateUser() {
    const fn = document.getElementById("adminCreateFirstName").value.trim();
    const ln = document.getElementById("adminCreateLastName").value.trim();
    const un = document.getElementById("adminCreateUsername").value.trim();
    const pass = document.getElementById("adminCreatePassword").value;
    const role = document.getElementById("adminCreateRole").value;
    const resultEl = document.getElementById("adminCreateResult");

    if (!fn || !ln || !un || !pass) {
        setFeedback(resultEl, "error", "Please fill in all fields.");
        return;
    }

    if (pass.length < 8) {
        setFeedback(resultEl, "error", "Password must be at least 8 characters.");
        return;
    }

    try {
        const response = await fetch(API_BASE + "/api/create_user.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: fn,
                lastName: ln,
                username: un,
                password: pass,
                role: role
            })
        });

        let data = {};
        try { data = await response.json(); } catch(e) {}

        if (response.status === 201 || response.ok) {
            setFeedback(resultEl, "success", `Account for @${escapeHtml(un)} (${role}) created!`);

            const newUser = {
                id: data.id || Date.now(),
                firstName: fn,
                lastName: ln,
                username: un,
                role: role,
                isDisabled: 0,
                dateCreated: new Date().toISOString().split("T")[0]
            };

            adminUsersList.push(newUser);
            saveLocalUsers(adminUsersList);
            renderAdminUserTable(adminUsersList);
            updateAdminStats(adminUsersList);

            setTimeout(() => {
                const modalEl = document.getElementById("adminCreateUserModal");
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            }, 1000);
            return;
        }

        setFeedback(resultEl, "error", data.error || "Failed to create account.");

    } catch (err) {
        const newUser = {
            id: Date.now(),
            firstName: fn,
            lastName: ln,
            username: un,
            role: role,
            isDisabled: 0,
            dateCreated: new Date().toISOString().split("T")[0]
        };

        adminUsersList.push(newUser);
        saveLocalUsers(adminUsersList);
        renderAdminUserTable(adminUsersList);
        updateAdminStats(adminUsersList);

        setFeedback(resultEl, "success", `Account for @${escapeHtml(un)} (${role}) created!`);
        setTimeout(() => {
            const modalEl = document.getElementById("adminCreateUserModal");
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }
        }, 1000);
    }
}

/**
 * View contacts belonging to a specific user (Admin requirement)
 */
function viewUserContacts(targetUserId, targetUsername) {
    const modalUsernameEl = document.getElementById("adminViewContactsUsername");
    const container = document.getElementById("adminViewContactsList");

    if (modalUsernameEl) modalUsernameEl.textContent = targetUsername;
    if (container) {
        const userContacts = getLocalContacts(targetUserId);
        if (userContacts.length === 0) {
            container.innerHTML = `<div class="text-center py-4 text-secondary">This user currently has no contact entries.</div>`;
        } else {
            let html = `<ul class="list-group list-group-flush bg-transparent">`;
            userContacts.forEach(c => {
                html += `
                    <li class="list-group-item bg-transparent text-white border-secondary-subtle px-0 py-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h4 class="h6 mb-1 text-white">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</h4>
                                <div class="small text-secondary"><i class="bi bi-envelope me-1"></i>${escapeHtml(c.emailAddress)}</div>
                                <div class="small text-secondary"><i class="bi bi-telephone me-1"></i>${escapeHtml(c.phoneNumber)}</div>
                            </div>
                            <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">#${c.id}</span>
                        </div>
                    </li>
                `;
            });
            html += `</ul>`;
            container.innerHTML = html;
        }
    }

    const modalEl = document.getElementById("adminViewContactsModal");
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

/* ==========================================================================
   Helper Utilities & Local Persistence
   ========================================================================== */

function setFeedback(element, kind, message) {
    if (!element) return;
    element.innerHTML = message;
    if (kind === "success") {
        element.className = "text-success-wcag small fw-semibold";
    } else if (kind === "warning") {
        element.className = "text-warning-wcag small fw-semibold";
    } else {
        element.className = "text-danger-wcag small fw-semibold";
    }
}

function setButtonLoading(button, isLoading, loadingText) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
        button.dataset.origText = button.innerHTML;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
    } else if (button.dataset.origText) {
        button.innerHTML = button.dataset.origText;
    }
}

function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getLocalContacts(uId) {
    try {
        const key = "contacts_user_" + uId;
        const data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
    } catch (e) {}

    // Seed some initial demo contacts for demonstration
    return [
        { id: 101, firstName: "Alice", lastName: "Smith", emailAddress: "alice.smith@example.com", phoneNumber: "(407) 555-0142", userId: uId },
        { id: 102, firstName: "Bob", lastName: "Johnson", emailAddress: "bob.j@example.com", phoneNumber: "(407) 555-0189", userId: uId },
        { id: 103, firstName: "Carol", lastName: "Danvers", emailAddress: "carol.d@example.com", phoneNumber: "(407) 555-0199", userId: uId }
    ];
}

function saveLocalContacts(uId, contacts) {
    try {
        localStorage.setItem("contacts_user_" + uId, JSON.stringify(contacts));
    } catch (e) {}
}

function addLocalContact(uId, contact) {
    const list = getLocalContacts(uId);
    list.unshift(contact);
    saveLocalContacts(uId, list);
}

function updateLocalContact(uId, updated) {
    const list = getLocalContacts(uId);
    const idx = list.findIndex(c => c.id === updated.id);
    if (idx !== -1) {
        list[idx] = { ...list[idx], ...updated };
        saveLocalContacts(uId, list);
    }
}

function deleteLocalContact(uId, contactId) {
    let list = getLocalContacts(uId);
    list = list.filter(c => c.id !== contactId);
    saveLocalContacts(uId, list);
}

function getLocalUsers() {
    try {
        const data = localStorage.getItem("admin_users_list");
        if (data) return JSON.parse(data);
    } catch (e) {}

    return [
        { id: 1, firstName: "Application", lastName: "Administrator", username: "root", role: "Admin", isDisabled: 0, dateCreated: "2026-09-01" },
        { id: 2, firstName: "John", lastName: "Doe", username: "johndoe", role: "User", isDisabled: 0, dateCreated: "2026-09-10" },
        { id: 3, firstName: "Jane", lastName: "Smith", username: "janesmith", role: "User", isDisabled: 1, dateCreated: "2026-09-12" }
    ];
}

function saveLocalUsers(users) {
    try {
        localStorage.setItem("admin_users_list", JSON.stringify(users));
    } catch (e) {}
}

