// =============================================
//  StudentRecords API — NEXUS Terminal Engine
// =============================================

const API_URL = '/api/students';

// ============ DOM ELEMENTS ============
const $ = id => document.getElementById(id);

const studentsBody = $('studentsBody');
const loader = $('loader');
const addStudentBtn = $('addStudentBtn');
const studentModal = $('studentModal');
const closeModalBtn = $('closeModalBtn');
const cancelBtn = $('cancelBtn');
const studentForm = $('studentForm');
const modalTitle = $('modalTitle');
const deleteModal = $('deleteModal');
const cancelDeleteBtn = $('cancelDeleteBtn');
const confirmDeleteBtn = $('confirmDeleteBtn');
const searchInput = $('searchInput');
const toastContainer = $('toastContainer');
const responseTab = $('responseTab');
const historyTab = $('historyTab');
const responseContent = $('responseContent');
const historyContent = $('historyContent');
const clearTerminal = $('clearTerminal');
const runRequestBtn = $('runRequestBtn');
const clearFormBtn = $('clearFormBtn');
const tableViewBtn = $('tableViewBtn');
const cardViewBtn = $('cardViewBtn');
const tableView = $('tableView');
const cardView = $('cardView');
const requestPanelBody = $('requestPanelBody');
const panelEndpointTitle = $('panelEndpointTitle');

// Form inputs
const studentIdInput = $('studentId');
const nameInput = $('name');
const branchInput = $('branch');
const yearInput = $('year');

// Request builder inputs
const filterBranch = $('filterBranch');
const filterYear = $('filterYear');
const filterSearch = $('filterSearch');
const requestId = $('requestId');
const reqName = $('reqName');
const reqBranch = $('reqBranch');
const reqYear = $('reqYear');

// State
let studentsData = [];
let requestHistory = [];
let requestCount = 0;
let lastMethod = '—';
let deleteTargetId = null;
let currentEndpoint = 'GET_ALL';
let currentView = 'table';

// Endpoint config
const ENDPOINTS = {
    GET_ALL: { method: 'GET', path: '/students', title: 'GET /students — Fetch All', hasFilters: true },
    GET_ONE: { method: 'GET', path: '/students/:id', title: 'GET /students/:id — Fetch One', hasId: true },
    POST: { method: 'POST', path: '/students', title: 'POST /students — Create', hasBody: true },
    PATCH: { method: 'PATCH', path: '/students/:id', title: 'PATCH /students/:id — Update', hasId: true, hasBody: true },
    DELETE: { method: 'DELETE', path: '/students/:id', title: 'DELETE /students/:id — Remove', hasId: true },
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    fetchStudents();
    bindEvents();
    setEndpoint('GET_ALL');
});

function bindEvents() {
    addStudentBtn.addEventListener('click', openAddModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    studentForm.addEventListener('submit', handleFormSubmit);
    studentModal.addEventListener('click', e => { if (e.target === studentModal) closeModal(); });
    deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', confirmDelete);

    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Terminal tabs
    responseTab.addEventListener('click', () => switchTerminalTab('response'));
    historyTab.addEventListener('click', () => switchTerminalTab('history'));
    clearTerminal.addEventListener('click', clearTerminalContent);

    // Endpoint tab clicks
    document.querySelectorAll('.ep-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const map = {
                'ep-get-all': 'GET_ALL',
                'ep-get-one': 'GET_ONE',
                'ep-post': 'POST',
                'ep-patch': 'PATCH',
                'ep-delete': 'DELETE'
            };
            setEndpoint(map[tab.id]);
        });
    });

    // Run request
    runRequestBtn.addEventListener('click', executeRequest);
    clearFormBtn.addEventListener('click', clearRequestForm);

    // View toggle
    tableViewBtn.addEventListener('click', () => setView('table'));
    cardViewBtn.addEventListener('click', () => setView('card'));
}

// ============ ENDPOINT SWITCHING ============
function setEndpoint(key) {
    currentEndpoint = key;
    const ep = ENDPOINTS[key];

    // Update tab active state
    document.querySelectorAll('.ep-tab').forEach(el => el.classList.remove('active'));
    const map = { GET_ALL: 'ep-get-all', GET_ONE: 'ep-get-one', POST: 'ep-post', PATCH: 'ep-patch', DELETE: 'ep-delete' };
    document.getElementById(map[key])?.classList.add('active');

    // Update panel title
    panelEndpointTitle.textContent = ep.title;

    // Show/hide fields
    const filterFields = document.querySelector('.form-row:has(#filterBranch)');
    const searchField = $('searchField');
    const idField = $('idField');
    const bodyFields = $('bodyFields');

    // Hide all first
    if (filterFields) filterFields.style.display = 'none';
    searchField.style.display = 'none';
    idField.style.display = 'none';
    bodyFields.style.display = 'none';

    if (ep.hasFilters) {
        if (filterFields) filterFields.style.display = 'flex';
        searchField.style.display = 'flex';
    }
    if (ep.hasId) idField.style.display = 'flex';
    if (ep.hasBody) bodyFields.style.display = 'block';

    // Update execute button style based on method
    const colors = {
        GET: { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', shadow: 'rgba(34,197,94,0.3)' },
        POST: { bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', shadow: 'rgba(59,130,246,0.3)' },
        PATCH: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', shadow: 'rgba(245,158,11,0.3)' },
        DELETE: { bg: 'linear-gradient(135deg, #e63946, #b81c28)', shadow: 'rgba(230,57,70,0.3)' },
    };
    const c = colors[ep.method];
    runRequestBtn.style.background = c.bg;
    runRequestBtn.style.boxShadow = `0 2px 12px ${c.shadow}`;
}

// ============ REQUEST EXECUTION ============
async function executeRequest() {
    const ep = ENDPOINTS[currentEndpoint];
    runRequestBtn.classList.add('loading');
    runRequestBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> RUNNING...';

    const startTime = performance.now();
    let url = API_URL;
    let options = { method: ep.method, headers: {} };
    let displayPath = ep.path;

    try {
        if (currentEndpoint === 'GET_ALL') {
            const params = new URLSearchParams();
            if (filterBranch.value.trim()) params.set('branch', filterBranch.value.trim());
            if (filterYear.value) params.set('year', filterYear.value);
            if (filterSearch.value.trim()) params.set('search', filterSearch.value.trim());
            const qs = params.toString();
            if (qs) {
                url += '?' + qs;
                displayPath += '?' + qs;
            }
        } else if (ep.hasId) {
            if (!requestId.value.trim()) {
                showToast('Student ID is required', 'error');
                resetRunBtn();
                return;
            }
            url += '/' + requestId.value.trim();
            displayPath = displayPath.replace(':id', requestId.value.trim());
        }

        if (ep.hasBody) {
            const body = {};
            if (reqName.value.trim()) body.name = reqName.value.trim();
            if (reqBranch.value.trim()) body.branch = reqBranch.value.trim();
            if (reqYear.value) body.year = reqYear.value;

            if (currentEndpoint === 'POST' && (!body.name || !body.branch || !body.year)) {
                showToast('Name, branch, and year are required for POST', 'error');
                resetRunBtn();
                return;
            }

            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        const res = await fetch(url, options);
        const elapsed = (performance.now() - startTime).toFixed(1);
        const data = await res.json();

        requestCount++;
        lastMethod = ep.method;
        updateStats();

        // Log to terminal
        logResponse(ep.method, displayPath, res.status, res.statusText, data, elapsed, options.body);

        // Add to history
        addToHistory(ep.method, displayPath, res.status, elapsed);

        // Refresh data if mutation
        if (['POST', 'PATCH', 'DELETE'].includes(ep.method) && res.ok) {
            await fetchStudents();
            showToast(`${ep.method} request successful!`, 'success');
        }

        if (currentEndpoint === 'GET_ALL' && res.ok) {
            studentsData = Array.isArray(data) ? data : [];
            renderStudents();
            showToast(`Fetched ${studentsData.length} records`, 'info');
        }

    } catch (err) {
        logResponse(ep.method, displayPath, 0, 'Network Error', { error: err.message }, '—');
        showToast('Request failed: ' + err.message, 'error');
    }

    resetRunBtn();
}

function resetRunBtn() {
    runRequestBtn.classList.remove('loading');
    runRequestBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> EXECUTE';
}

function clearRequestForm() {
    if (filterBranch) filterBranch.value = '';
    if (filterYear) filterYear.value = '';
    if (filterSearch) filterSearch.value = '';
    if (requestId) requestId.value = '';
    if (reqName) reqName.value = '';
    if (reqBranch) reqBranch.value = '';
    if (reqYear) reqYear.value = '';
}

// ============ API CALLS (for modal CRUD) ============
async function fetchStudents() {
    showLoader(true);
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        studentsData = Array.isArray(data) ? data : [];
        renderStudents();
        updateStats();
        updateLiveRecords();
    } catch (err) {
        showToast('Error fetching students', 'error');
    } finally {
        showLoader(false);
    }
}

async function addStudent(student) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(student)
        });
        if (!res.ok) throw new Error('Failed');
        requestCount++; lastMethod = 'POST';
        await fetchStudents();
        showToast('Student added successfully!');
        closeModal();
        logResponse('POST', '/students', res.status, 'Created', await res.clone().json?.() || student, '—', JSON.stringify(student));
    } catch (err) {
        showToast('Failed to add student', 'error');
    }
}

async function updateStudent(id, student) {
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(student)
        });
        if (!res.ok) throw new Error('Failed');
        requestCount++; lastMethod = 'PATCH';
        await fetchStudents();
        showToast('Student updated successfully!');
        closeModal();
    } catch (err) {
        showToast('Failed to update student', 'error');
    }
}

async function deleteStudentById(id) {
    try {
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) {
            row.style.transition = 'all 0.3s ease';
            row.style.transform = 'translateX(-20px)';
            row.style.opacity = '0';
        }
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        requestCount++; lastMethod = 'DELETE';
        setTimeout(async () => {
            await fetchStudents();
            showToast('Student deleted successfully!');
        }, 300);
    } catch (err) {
        showToast('Failed to delete', 'error');
        fetchStudents();
    }
}

// ============ RENDERING ============
function renderStudents() {
    studentsBody.innerHTML = '';
    const emptyState = $('emptyState');

    if (studentsData.length === 0) {
        emptyState.style.display = 'block';
        $('recordCount').textContent = '0';
        if (currentView === 'card') cardView.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No records</p></div>';
        return;
    }

    emptyState.style.display = 'none';
    $('recordCount').textContent = studentsData.length;

    // Table view
    studentsData.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.className = 'row-enter';
        tr.style.animationDelay = `${i * 0.04}s`;
        tr.dataset.id = s.id;
        tr.innerHTML = `
            <td><span class="id-badge">${s.id}</span></td>
            <td class="student-name">${escapeHtml(s.name)}</td>
            <td class="branch-tag">${escapeHtml(s.branch)}</td>
            <td><span class="year-badge">${escapeHtml(String(s.year))}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="openEditModal(${s.id})" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn delete" onclick="openDeleteConfirm(${s.id})" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        studentsBody.appendChild(tr);
    });

    // Card view
    if (currentView === 'card') renderCards();
}

function renderCards() {
    cardView.innerHTML = '';
    studentsData.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'student-card card-enter';
        card.style.animationDelay = `${i * 0.06}s`;
        card.innerHTML = `
            <div class="card-id">#${s.id}</div>
            <div class="card-name">${escapeHtml(s.name)}</div>
            <div class="card-info">
                <span><i class="fa-solid fa-code-branch"></i> ${escapeHtml(s.branch)}</span>
                <span><i class="fa-solid fa-calendar"></i> ${escapeHtml(String(s.year))}</span>
            </div>
            <div class="card-actions">
                <button class="action-btn edit" onclick="openEditModal(${s.id})" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn delete" onclick="openDeleteConfirm(${s.id})" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        cardView.appendChild(card);
    });
}

function setView(view) {
    currentView = view;
    tableView.style.display = view === 'table' ? 'block' : 'none';
    cardView.style.display = view === 'card' ? 'grid' : 'none';
    tableViewBtn.classList.toggle('active', view === 'table');
    cardViewBtn.classList.toggle('active', view === 'card');
    if (view === 'card') renderCards();
}

// ============ SEARCH ============
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
        fetchStudents();
        return;
    }
    const filtered = studentsData.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.branch.toLowerCase().includes(query) ||
        String(s.id).includes(query) ||
        String(s.year).toLowerCase().includes(query)
    );
    const original = studentsData;
    studentsData = filtered;
    renderStudents();
    studentsData = original;
}

// ============ TERMINAL ============
function logResponse(method, path, status, statusText, data, elapsed, body) {
    switchTerminalTab('response');

    const methodColor = {
        GET: 'method-color-get',
        POST: 'method-color-post',
        PATCH: 'method-color-patch',
        DELETE: 'method-color-delete'
    }[method] || '';

    const statusClass = status >= 200 && status < 300 ? 'status-ok' : status >= 400 ? 'status-error' : 'status-ok';
    const statusLabel = status === 201 ? 'status-created' : statusClass;

    const jsonStr = JSON.stringify(data, null, 2);

    const entry = document.createElement('div');
    entry.className = 'terminal-entry fade-in';
    entry.innerHTML = `
        <div>
            <span class="terminal-status ${statusLabel}">${status} ${statusText}</span>
            <span class="terminal-method ${methodColor}">${method}</span>
            <span style="color: var(--text-secondary);">${escapeHtml(path)}</span>
            ${elapsed !== '—' ? `<span style="color:var(--text-muted); margin-left:8px;">${elapsed}ms</span>` : ''}
        </div>
        <div class="terminal-curl">$ curl -X ${method} "http://localhost:3000${escapeHtml(path)}"${body ? ` -H "Content-Type: application/json" -d '${escapeHtml(body)}'` : ''}</div>
        <div class="terminal-json">${syntaxHighlight(jsonStr)}</div>
    `;

    // Remove welcome message
    const welcome = responseContent.querySelector('.terminal-welcome');
    if (welcome) welcome.remove();

    responseContent.appendChild(entry);
    const terminalBody = $('terminalBody');
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

function addToHistory(method, path, status, elapsed) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const methodClass = {
        GET: 'method-get',
        POST: 'method-post',
        PATCH: 'method-patch',
        DELETE: 'method-delete'
    }[method] || '';

    const statusClass = status >= 200 && status < 300 ? 'status-ok' : 'status-error';

    requestHistory.unshift({ time, method, path, status, elapsed, methodClass, statusClass });

    renderHistory();
}

function renderHistory() {
    historyContent.innerHTML = '';
    if (requestHistory.length === 0) {
        historyContent.innerHTML = '<div style="color:var(--text-muted);padding:14px;">No request history yet.</div>';
        return;
    }
    requestHistory.forEach(h => {
        const div = document.createElement('div');
        div.className = 'history-entry';
        div.innerHTML = `
            <span class="history-time">${h.time}</span>
            <span class="history-method ${h.methodClass}">${h.method}</span>
            <span class="history-path">${escapeHtml(h.path)}</span>
            <span class="history-status ${h.statusClass}">${h.status}</span>
            <span style="color:var(--text-muted);font-size:0.6rem;">${h.elapsed}ms</span>
        `;
        historyContent.appendChild(div);
    });
}

function switchTerminalTab(tab) {
    responseTab.classList.toggle('active', tab === 'response');
    historyTab.classList.toggle('active', tab === 'history');
    responseContent.style.display = tab === 'response' ? 'block' : 'none';
    historyContent.style.display = tab === 'history' ? 'block' : 'none';
}

function clearTerminalContent() {
    responseContent.innerHTML = `<div class="terminal-welcome">
        <span class="t-prompt">root@nexus:~$</span> Terminal cleared
        <br><span class="t-prompt">root@nexus:~$</span> <span class="cursor-blink">_</span>
    </div>`;
}

function syntaxHighlight(json) {
    return json.replace(/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
        let cls = 'color: var(--amber)'; // number
        if (/^"/.test(match)) {
            cls = match.endsWith(':') ? 'color: var(--red)' : 'color: var(--text-secondary)'; // key or string
        } else if (/true|false/.test(match)) {
            cls = 'color: var(--green)';
        } else if (/null/.test(match)) {
            cls = 'color: var(--red-bright)';
        }
        return `<span style="${cls}">${match}</span>`;
    });
}

// ============ STATS ============
function updateStats() {
    $('totalStudents').textContent = studentsData.length;
    $('totalRequests').textContent = requestCount;
    $('lastMethod').textContent = lastMethod;

    // Animate stat values
    document.querySelectorAll('.nav-stat-val').forEach(el => {
        el.style.transform = 'scale(1.2)';
        el.style.transition = 'transform 0.2s ease';
        setTimeout(() => el.style.transform = 'scale(1)', 200);
    });
}

function updateLiveRecords() {
    const list = $('liveRecordsList');
    list.innerHTML = '';
    studentsData.forEach(s => {
        const div = document.createElement('div');
        div.className = 'live-record';
        div.innerHTML = `
            <span class="live-record-id">${s.id}</span>
            <span class="live-record-name">${escapeHtml(s.name)}</span>
            <span class="live-record-meta">${escapeHtml(String(s.year))}</span>
        `;
        div.addEventListener('click', () => {
            requestId.value = s.id;
            setEndpoint('GET_ONE');
        });
        list.appendChild(div);
    });
}

// ============ MODALS ============
function openAddModal() {
    modalTitle.innerHTML = '<i class="fa-solid fa-user-plus"></i> Add Student';
    studentForm.reset();
    studentIdInput.value = '';
    studentModal.classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 100);
}

function openEditModal(id) {
    const student = studentsData.find(s => s.id === id);
    if (!student) return;

    modalTitle.innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit Student';
    studentIdInput.value = student.id;
    nameInput.value = student.name;
    branchInput.value = student.branch;
    yearInput.value = student.year;

    studentModal.classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 100);
}

function closeModal() {
    studentModal.classList.add('hidden');
}

function openDeleteConfirm(id) {
    deleteTargetId = id;
    deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    deleteTargetId = null;
}

function confirmDelete() {
    if (deleteTargetId !== null) {
        deleteStudentById(deleteTargetId);
        closeDeleteModal();
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    const data = {
        name: nameInput.value.trim(),
        branch: branchInput.value.trim(),
        year: yearInput.value
    };
    const id = studentIdInput.value;

    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    btn.disabled = true;

    const restore = () => { btn.innerHTML = original; btn.disabled = false; };

    if (id) {
        updateStudent(parseInt(id), data).finally(restore);
    } else {
        addStudent(data).finally(restore);
    }
}

// ============ TOAST ============
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    const icons = {
        success: 'fa-solid fa-check-circle',
        error: 'fa-solid fa-circle-exclamation',
        info: 'fa-solid fa-circle-info'
    };

    toast.innerHTML = `<i class="${icons[type] || icons.success}"></i> ${escapeHtml(message)}`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('exiting');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ LOADER ============
function showLoader(show) {
    loader.style.display = show ? 'flex' : 'none';
}

// ============ UTILITIES ============
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// ============ PARTICLE SYSTEM ============
function initParticles() {
    const canvas = $('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height, particles;
    const PARTICLE_COUNT = 60;
    const CONNECTION_DIST = 100;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 1.2 + 0.3,
                opacity: Math.random() * 0.4 + 0.05
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    const alpha = (1 - dist / CONNECTION_DIST) * 0.1;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(230, 57, 70, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        // Particles
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.fillStyle = `rgba(230, 57, 70, ${p.opacity})`;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();
    window.addEventListener('resize', () => { resize(); createParticles(); });
}
