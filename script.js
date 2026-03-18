const STORAGE_KEY = 'ipt_demo_v1';
const AUTH_TOKEN_KEY = 'auth_token';
const UNVERIFIED_EMAIL_KEY = 'unverified_email';

// Initialize DB
window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

let currentUser = null;

function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            window.db = JSON.parse(data);
            // Ensure all keys exist if loading from old version
            if (!window.db.accounts) window.db.accounts = [];
            if (!window.db.departments) window.db.departments = [];
            if (!window.db.employees) window.db.employees = [];
            if (!window.db.requests) window.db.requests = [];
        } catch (e) {
            console.error("Corrupt storage, resetting.", e);
            seedData();
        }
    } else {
        seedData();
    }
}

function seedData() {
    window.db = {
        accounts: [
            {
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'Admin',
                verified: true
            }
        ],
        departments: [
            { id: 'd1', name: 'Engineering', description: 'Software and Hardware' },
            { id: 'd2', name: 'HR', description: 'Human Resources' }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// --- Auth State Management ---
function setAuthState(isAuth, user = null) {
    currentUser = isAuth ? user : null;
    const body = document.body;

    if (isAuth && user) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');

        if (user.role && user.role.toLowerCase() === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }

        // Update Navbar Name
        const navUserName = document.getElementById('nav-user-name');
        if (navUserName) navUserName.innerText = user.username || user.firstName;

    } else {
        body.classList.add('not-authenticated');
        body.classList.remove('authenticated');
        body.classList.remove('is-admin');
    }
}

// --- Profile Page ---
function renderProfile() {
    if (!currentUser) return;

    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileRole = document.getElementById('profile-role');

    if (profileName) profileName.innerText = currentUser.username || `${currentUser.firstName} ${currentUser.lastName}`;
    if (profileEmail) profileEmail.innerText = currentUser.username || currentUser.email;
    if (profileRole) profileRole.innerText = currentUser.role;
}

// --- Routing ---
const ROUTES = {
    '#/': 'home-section',
    '#/login': 'login-section',
    '#/register': 'register-section',
    '#/verify': 'verify-email-section',
    '#/profile': 'profile-section',
    '#/employees': 'employees-section',
    '#/accounts': 'accounts-section',
    '#/departments': 'departments-section',
    '#/requests': 'requests-section'
};

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    let hash = window.location.hash || '#/';
    if (!ROUTES[hash]) hash = '#/';

    // Auth Protection
    const protectedRoutes = ['#/profile', '#/requests', '#/employees', '#/accounts', '#/departments'];
    if (protectedRoutes.includes(hash) && !currentUser) {
        navigateTo('#/login');
        return;
    }

    // Admin Protection
    const adminRoutes = ['#/employees', '#/accounts', '#/departments'];
    if (adminRoutes.includes(hash) && (!currentUser || !currentUser.role || currentUser.role.toLowerCase() !== 'admin')) {
        navigateTo('#/');
        return;
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(sec => sec.classList.remove('active'));

    // Show target page
    const targetId = ROUTES[hash];
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
        // Render specific page content if needed
        if (hash === '#/profile') renderProfile();
        if (hash === '#/employees') renderEmployees();
        if (hash === '#/accounts') renderAccounts();
        if (hash === '#/departments') renderDepartments();
        if (hash === '#/requests') renderRequests();
    }
}

function showSection(sectionId) {
    // Adapter for old calls -> redirect to new routing
    // Find hash for this section
    for (const [key, value] of Object.entries(ROUTES)) {
        if (value === sectionId) {
            navigateTo(key);
            return;
        }
    }
}

window.addEventListener('hashchange', handleRouting);
function getAuthHeader() {
    const token = sessionStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}



window.addEventListener('load', async () => {
    loadFromStorage();

    // Check for existing session
    const token = sessionStorage.getItem('authToken');
    if (token) {
        try {
            // Call /api/profile to get the user role
            const res = await fetch('http://localhost:3000/api/profile', {
                headers: getAuthHeader()
            });
            if (res.ok) {
                const data = await res.json();
                setAuthState(true, data.user);
            } else {
                sessionStorage.removeItem('authToken');
                setAuthState(false);
            }
        } catch (err) {
            console.error('Failed to fetch profile', err);
            setAuthState(false);
        }
    }

    if (!window.location.hash) {
        navigateTo('#/');
    } else {
        handleRouting();
    }
});

function showAlert(containerId, message, type = 'danger') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
    }
}

// --- CRUD Functions ---

function renderEmployees() {
    const tbody = document.getElementById('employees-table-body');
    if (!tbody) return;

    if (window.db.employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No employees.</td></tr>';
        return;
    }

    tbody.innerHTML = window.db.employees.map(emp => {
        const associatedUser = window.db.accounts.find(u => u.email === emp.email);
        const name = associatedUser ? `${associatedUser.firstName} ${associatedUser.lastName}` : emp.email;

        return `
            <tr>
                <td>${emp.id}</td>
                <td>${name}</td>
                <td>${emp.position}</td>
                <td>${emp.department}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderDepartments() {
    const tbody = document.getElementById('departments-table-body');
    if (!tbody) return;

    if (window.db.departments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No departments.</td></tr>';
        return;
    }

    tbody.innerHTML = window.db.departments.map(dept => `
        <tr>
            <td>${dept.name}</td>
            <td>${dept.description}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editDepartment('${dept.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteDepartment('${dept.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderAccounts() {
    const tbody = document.getElementById('accounts-table-body');
    if (!tbody) return;

    if (window.db.accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No accounts.</td></tr>';
        return;
    }

    tbody.innerHTML = window.db.accounts.map(u => `
        <tr>
            <td>${u.firstName} ${u.lastName}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>${u.verified ? '<span class="text-success">✔</span>' : '<span class="text-danger">✘</span>'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editAccount('${u.id}')">Edit</button>
                <button class="btn btn-sm btn-warning" onclick="resetPassword('${u.id}')">Reset Password</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAccount('${u.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

window.deleteEmployee = function (id) {
    if (confirm('Delete this employee?')) {
        window.db.employees = window.db.employees.filter(e => e.id !== id);
        saveToStorage();
        renderEmployees();
    }
};

window.editDepartment = function (id) {
    const dept = window.db.departments.find(d => d.id === id);
    if (dept) {
        document.getElementById('dept-id').value = dept.id;
        document.getElementById('dept-name').value = dept.name;
        document.getElementById('dept-desc').value = dept.description;

        const modalEl = document.getElementById('departmentModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

window.deleteDepartment = function (id) {
    if (confirm('Delete this department?')) {
        window.db.departments = window.db.departments.filter(d => d.id !== id);
        saveToStorage();
        renderDepartments();
    }
};

window.editAccount = function (id) {
    const acc = window.db.accounts.find(a => a.id == id);
    if (acc) {
        document.getElementById('acc-id').value = acc.id;
        document.getElementById('acc-firstname').value = acc.firstName;
        document.getElementById('acc-lastname').value = acc.lastName;
        document.getElementById('acc-email').value = acc.email;
        document.getElementById('acc-password').value = acc.password;
        document.getElementById('acc-role').value = acc.role;
        document.getElementById('acc-verified').checked = acc.verified;

        const modalEl = document.getElementById('accountModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

window.deleteAccount = function (id) {
    if (id == currentUser.id) {
        alert("You cannot delete your own account.");
        return;
    }
    if (confirm('Delete this account?')) {
        window.db.accounts = window.db.accounts.filter(u => u.id != id);
        saveToStorage();
        renderAccounts();
    }
};

window.resetPassword = function (id) {
    const newPass = prompt("Enter new password (min 6 chars):");
    if (newPass) {
        if (newPass.length < 6) {
            alert("Password too short.");
            return;
        }
        const user = window.db.accounts.find(u => u.id == id);
        if (user) {
            user.password = newPass;
            saveToStorage();
            alert("Password updated.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial renders handled by load/route

    // Clear modals on close
    const departmentModal = document.getElementById('departmentModal');
    if (departmentModal) {
        departmentModal.addEventListener('hidden.bs.modal', () => {
            document.getElementById('department-form').reset();
            document.getElementById('dept-id').value = '';
        });
    }

    const accountModal = document.getElementById('accountModal');
    if (accountModal) {
        accountModal.addEventListener('hidden.bs.modal', () => {
            document.getElementById('account-form').reset();
            document.getElementById('acc-id').value = '';
        });
    }
});

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const firstName = document.getElementById('reg-firstname').value;
        const lastName = document.getElementById('reg-lastname').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        if (password.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        if (window.db.accounts.find(u => u.email === email)) {
            alert('Email already registered!');
            return;
        }

        const newUser = {
            id: Date.now(),
            firstName,
            lastName,
            email,
            password,
            role: 'Admin', // Default as per previous instruction
            verified: false
        };

        window.db.accounts.push(newUser);
        saveToStorage();

        // Phase 3 Requirement: Store unverified email
        localStorage.setItem(UNVERIFIED_EMAIL_KEY, email);

        navigateTo('#/verify');

        // Update display on verify page
        const display = document.getElementById('verify-email-display');
        if (display) display.innerText = email;
    });
}

const btnSimulateVerify = document.getElementById('btn-simulate-verify');
if (btnSimulateVerify) {
    btnSimulateVerify.addEventListener('click', () => {
        const emailToVerify = localStorage.getItem(UNVERIFIED_EMAIL_KEY);
        if (!emailToVerify) {
            alert("No registration to verify.");
            return;
        }

        const user = window.db.accounts.find(u => u.email === emailToVerify);
        if (user) {
            user.verified = true;
            saveToStorage();
            localStorage.removeItem(UNVERIFIED_EMAIL_KEY);

            navigateTo('#/login');
            showAlert('login-alert-placeholder', 'Email verified! You may now log in.', 'success');
        } else {
            alert('User not found.');
        }
    });
}

// Helper to set Verify Display on load if navigated to directly
if (window.location.hash === '#/verify') {
    const display = document.getElementById('verify-email-display');
    const storedEmail = localStorage.getItem(UNVERIFIED_EMAIL_KEY);
    if (display && storedEmail) display.innerText = storedEmail;
}


const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Login form submitted");

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Save token in memory (or sessionStorage for page refresh)
                sessionStorage.setItem('authToken', data.token);
                setAuthState(true, data.user);
                navigateTo('#/profile');
                loginForm.reset();
            } else {
                showAlert('login-alert-placeholder', 'Login failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            showAlert('login-alert-placeholder', 'Network error');
        }
    });
}

const navLogout = document.getElementById('nav-logout');
if (navLogout) {
    navLogout.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthState(false);
        navigateTo('#/'); // Redirect to home
    });
}

const employeeForm = document.getElementById('employee-form');
if (employeeForm) {
    employeeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('emp-id').value;
        const email = document.getElementById('emp-email').value;
        const position = document.getElementById('emp-position').value;
        const department = document.getElementById('emp-dept').value;
        const hireDate = document.getElementById('emp-date').value;

        if (window.db.employees.find(e => e.id === id)) {
            alert('Employee ID already exists!');
            return;
        }

        const newEmployee = { id, email, position, department, hireDate };
        window.db.employees.push(newEmployee);
        saveToStorage();
        renderEmployees();

        const modalEl = document.getElementById('employeeModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        employeeForm.reset();
    });
}

const departmentForm = document.getElementById('department-form');
if (departmentForm) {
    departmentForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('dept-name').value;
        const description = document.getElementById('dept-desc').value;

        const newDept = {
            id: Date.now().toString(),
            name,
            description
        };

        window.db.departments.push(newDept);
        saveToStorage();
        renderDepartments();

        const modalEl = document.getElementById('departmentModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        departmentForm.reset();
    });
}

const accountForm = document.getElementById('account-form');
if (accountForm) {
    accountForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const firstName = document.getElementById('acc-firstname').value;
        const lastName = document.getElementById('acc-lastname').value;
        const email = document.getElementById('acc-email').value;
        const password = document.getElementById('acc-password').value;
        const role = document.getElementById('acc-role').value;
        const verified = document.getElementById('acc-verified').checked;

        if (window.db.accounts.find(u => u.email === email)) {
            alert('Email already exists!');
            return;
        }

        const newUser = {
            id: Date.now(),
            firstName,
            lastName,
            email,
            password,
            role,
            verified
        };

        window.db.accounts.push(newUser);
        saveToStorage();
        renderAccounts();

        const modalEl = document.getElementById('accountModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        accountForm.reset();
    });
}

function renderRequests() {
    const tbody = document.getElementById('requests-table-body');
    const emptyState = document.getElementById('requests-empty-state');
    const tableContainer = document.getElementById('requests-table-container');

    if (!tbody || !emptyState || !tableContainer) return;

    // Filter requests for current user
    const myRequests = window.db.requests.filter(r => r.employeeEmail === currentUser.email);

    if (myRequests.length === 0) {
        emptyState.classList.remove('d-none');
        tableContainer.classList.add('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    tableContainer.classList.remove('d-none');

    tbody.innerHTML = myRequests.map(req => {
        let badgeClass = 'bg-secondary';
        if (req.status === 'Approved') badgeClass = 'bg-success';
        if (req.status === 'Rejected') badgeClass = 'bg-danger';
        if (req.status === 'Pending') badgeClass = 'bg-warning text-dark';

        const itemsList = req.items.map(i => `${i.name} (${i.qty})`).join(', ');

        return `
            <tr>
                <td>${new Date(req.date).toLocaleDateString()}</td>
                <td>${req.type}</td>
                <td>${itemsList}</td>
                <td><span class="badge ${badgeClass}">${req.status}</span></td>
                <td>
                    ${req.status === 'Pending' ? `<button class="btn btn-sm btn-danger" onclick="deleteRequest('${req.id}')">Cancel</button>` : '-'}
                </td>
            </tr>
        `;
    }).join('');
}

window.deleteRequest = function (id) {
    if (confirm('Cancel this request?')) {
        window.db.requests = window.db.requests.filter(r => r.id !== id);
        saveToStorage();
        renderRequests();
    }
};

// --- Employee Department Dropdown ---
const employeeModal = document.getElementById('employeeModal');
if (employeeModal) {
    employeeModal.addEventListener('show.bs.modal', () => {
        const deptSelect = document.getElementById('emp-dept');
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="" disabled selected>Select Department</option>' +
                window.db.departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // Other renders are in handleRouting
    // Init event listeners for dynamic request form
    const itemsContainer = document.getElementById('req-items-container');

    if (itemsContainer) {
        itemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-item-btn')) {
                const row = document.createElement('div');
                row.className = 'row mb-2 g-2 item-row';
                row.innerHTML = `
                    <div class="col-8">
                        <input type="text" class="form-control" name="itemName" placeholder="Item name" required>
                    </div>
                    <div class="col-2">
                        <input type="number" class="form-control" name="itemQty" value="1" min="1" required>
                    </div>
                    <div class="col-2">
                        <button type="button" class="btn btn-outline-danger w-100 remove-item-btn">×</button>
                    </div>
                `;
                itemsContainer.appendChild(row);
            }

            if (e.target.classList.contains('remove-item-btn')) {
                e.target.closest('.item-row').remove();
            }
        });
    }
});


// Note: Existing forms (Register, Login, etc.) ...

const requestForm = document.getElementById('request-form');
if (requestForm) {
    requestForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.getElementById('req-type').value;

        // Collect Items
        const items = [];
        const itemRows = document.querySelectorAll('.item-row');
        itemRows.forEach(row => {
            const name = row.querySelector('[name="itemName"]').value;
            const qty = row.querySelector('[name="itemQty"]').value;
            if (name && qty) {
                items.push({ name, qty });
            }
        });

        if (items.length === 0) {
            alert("Please add at least one item.");
            return;
        }

        const newRequest = {
            id: Date.now(),
            date: new Date().toISOString(),
            employeeEmail: currentUser.email,
            type,
            items,
            status: 'Pending'
        };

        window.db.requests.push(newRequest);
        saveToStorage();
        renderRequests();

        const modalEl = document.getElementById('requestModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        // Reset form
        requestForm.reset();
        // Reset items to single row
        const itemsContainer = document.getElementById('req-items-container');
        itemsContainer.innerHTML = `
            <div class="row mb-2 g-2 item-row">
                <div class="col-8">
                    <input type="text" class="form-control" name="itemName" placeholder="Item name" required>
                </div>
                <div class="col-2">
                    <input type="number" class="form-control" name="itemQty" value="1" min="1" required>
                </div>
                <div class="col-2">
                    <button type="button" class="btn btn-outline-secondary w-100 add-item-btn">+</button>
                </div>
            </div>
        `;
    });
}