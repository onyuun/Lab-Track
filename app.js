import { supabaseAdapter, supabaseConfig } from './supabase-adapter.js';

const today = new Date('2026-11-06T00:00:00');
const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const moneylessDate = (date) => fmt.format(new Date(date));
const initials = (name) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const slug = (value) => String(value).toLowerCase().replaceAll(' ', '-');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const users = {
  student: { id: 'u-student-01', name: 'Alex Rivera', email: 'alex.rivera@campus.edu', role: 'Student', department: 'BSECE · 3rd year' },
  faculty: { id: 'u-faculty-01', name: 'Dr. Maya Chen', email: 'maya.chen@campus.edu', role: 'Faculty', department: 'Electrical Engineering' },
  staff: { id: 'u-staff-01', name: 'Jordan Lee', email: 'jordan.lee@campus.edu', role: 'Laboratory Personnel', department: 'Engineering Laboratory' },
  student2: { id: 'u-student-02', name: 'Noah Santos', email: 'noah.santos@campus.edu', role: 'Student', department: 'BSCS · 2nd year' },
};

const equipmentSeed = [
  { id: 'eq-001', name: 'Digital Oscilloscope', category: 'Measuring Instruments', description: '100 MHz dual-channel scope for signal inspection and lab experiments.', total: 4, available: 2, condition: 'Good', status: 'Available', location: 'Bench A · Shelf 02', symbol: '◒' },
  { id: 'eq-002', name: 'Arduino Uno R3 Kit', category: 'Microcontrollers', description: 'Starter microcontroller kit with breadboard, sensors, and jumper wires.', total: 12, available: 8, condition: 'Good', status: 'Available', location: 'Cabinet C · Bin 04', symbol: '▦' },
  { id: 'eq-003', name: 'Raspberry Pi 4 Model B', category: 'Microcontrollers', description: '4GB single-board computer with case, power supply, and microSD card.', total: 6, available: 2, condition: 'Fair', status: 'Available', location: 'Cabinet C · Bin 07', symbol: 'π' },
  { id: 'eq-004', name: 'Fluke Digital Multimeter', category: 'Measuring Instruments', description: 'True RMS handheld multimeter for safe voltage and continuity checks.', total: 8, available: 6, condition: 'Good', status: 'Available', location: 'Bench B · Drawer 01', symbol: '±' },
  { id: 'eq-005', name: 'Soldering Station', category: 'Tools', description: 'Temperature-controlled soldering station with fine and chisel tips.', total: 5, available: 1, condition: 'Fair', status: 'Reserved', location: 'Tool Wall · Row 03', symbol: '∿' },
  { id: 'eq-006', name: 'ESP32 Development Board', category: 'Microcontrollers', description: 'Wi-Fi and Bluetooth capable development board for IoT prototypes.', total: 10, available: 10, condition: 'Good', status: 'Available', location: 'Cabinet C · Bin 09', symbol: '◫' },
  { id: 'eq-007', name: 'Digital Vernier Caliper', category: 'Measuring Instruments', description: 'Precision 150mm caliper with LCD readout for dimensional work.', total: 5, available: 4, condition: 'Good', status: 'Available', location: 'Bench A · Drawer 05', symbol: '⌗' },
  { id: 'eq-008', name: 'Bench Power Supply', category: 'Electronics', description: 'Adjustable DC power supply with dual output and current limiting.', total: 7, available: 0, condition: 'Needs Repair', status: 'Under Maintenance', location: 'Repair Bay · Rack 01', symbol: '↯' },
  { id: 'eq-009', name: 'Logic Analyzer', category: 'Measuring Instruments', description: '16-channel USB logic analyzer for digital protocol debugging.', total: 3, available: 1, condition: 'Good', status: 'Available', location: 'Bench A · Shelf 04', symbol: '▥' },
  { id: 'eq-010', name: 'Network Cable Tester', category: 'Networking', description: 'RJ45/RJ11 cable tester with remote unit for troubleshooting.', total: 5, available: 3, condition: 'Good', status: 'Available', location: 'Network Rack · Drawer 02', symbol: '⌁' },
  { id: 'eq-011', name: 'TP-Link Managed Switch', category: 'Networking', description: '24-port managed gigabit switch for networking lab exercises.', total: 3, available: 1, condition: 'Fair', status: 'Available', location: 'Network Rack · Shelf 01', symbol: '⇄' },
  { id: 'eq-012', name: 'Heat Gun', category: 'Tools', description: 'Variable-temperature heat gun for shrink tubing and rework tasks.', total: 4, available: 4, condition: 'Good', status: 'Available', location: 'Tool Wall · Row 02', symbol: '⌁' },
  { id: 'eq-013', name: 'PCB Rework Mat', category: 'Tools', description: 'ESD-safe silicone work mat with component storage wells.', total: 9, available: 9, condition: 'Good', status: 'Available', location: 'Tool Wall · Row 05', symbol: '▤' },
  { id: 'eq-014', name: 'FPGA Development Board', category: 'Electronics', description: 'Entry-level FPGA board with HDMI, VGA, and GPIO interfaces.', total: 4, available: 2, condition: 'Good', status: 'Available', location: 'Cabinet B · Bin 06', symbol: '◇' },
  { id: 'eq-015', name: 'Thermal Camera', category: 'Electronics', description: 'Compact thermal imaging camera for electronics diagnostics.', total: 2, available: 0, condition: 'Damaged', status: 'Damaged', location: 'Condition Hold · Shelf 01', symbol: '◉' },
];

const requestSeed = [
  { id: 'REQ-1048', requesterId: 'u-student-01', requester: 'Alex Rivera', requesterRole: 'Student', purpose: 'ECE 304 · Signal conditioning lab', borrowDate: '2026-11-08', dueDate: '2026-11-12', status: 'Pending', items: [{ equipmentId: 'eq-001', quantity: 1 }], submittedAt: '2026-11-05', reviewer: null, rejectionReason: null },
  { id: 'REQ-1047', requesterId: 'u-faculty-01', requester: 'Dr. Maya Chen', requesterRole: 'Faculty', purpose: 'Embedded systems workshop', borrowDate: '2026-11-07', dueDate: '2026-11-09', status: 'Approved', items: [{ equipmentId: 'eq-002', quantity: 4 }, { equipmentId: 'eq-006', quantity: 2 }], submittedAt: '2026-11-04', reviewer: 'Jordan Lee', rejectionReason: null },
  { id: 'REQ-1045', requesterId: 'u-student-01', requester: 'Alex Rivera', requesterRole: 'Student', purpose: 'Capstone prototype · autonomous cart', borrowDate: '2026-10-28', dueDate: '2026-11-04', status: 'Overdue', items: [{ equipmentId: 'eq-003', quantity: 1 }, { equipmentId: 'eq-010', quantity: 1 }], submittedAt: '2026-10-25', reviewer: 'Jordan Lee', rejectionReason: null, releasedAt: '2026-10-28', releasedBy: 'Jordan Lee' },
  { id: 'REQ-1042', requesterId: 'u-student-02', requester: 'Noah Santos', requesterRole: 'Student', purpose: 'CS 222 · Network topology exercise', borrowDate: '2026-10-18', dueDate: '2026-10-20', status: 'Returned', items: [{ equipmentId: 'eq-011', quantity: 1 }], submittedAt: '2026-10-15', reviewer: 'Jordan Lee', rejectionReason: null, releasedAt: '2026-10-18', returnedAt: '2026-10-20', returnedCondition: 'Good' },
  { id: 'REQ-1040', requesterId: 'u-student-01', requester: 'Alex Rivera', requesterRole: 'Student', purpose: 'Personal project · IoT air monitor', borrowDate: '2026-10-15', dueDate: '2026-10-18', status: 'Rejected', items: [{ equipmentId: 'eq-003', quantity: 4 }], submittedAt: '2026-10-12', reviewer: 'Jordan Lee', rejectionReason: 'Only two Raspberry Pi boards are available; please revise the quantity.' },
  { id: 'REQ-1038', requesterId: 'u-faculty-01', requester: 'Dr. Maya Chen', requesterRole: 'Faculty', purpose: 'Instrumentation lecture demo', borrowDate: '2026-10-08', dueDate: '2026-10-09', status: 'Returned', items: [{ equipmentId: 'eq-004', quantity: 2 }], submittedAt: '2026-10-05', reviewer: 'Jordan Lee', rejectionReason: null, releasedAt: '2026-10-08', returnedAt: '2026-10-09', returnedCondition: 'Fair' },
  { id: 'REQ-1035', requesterId: 'u-student-02', requester: 'Noah Santos', requesterRole: 'Student', purpose: 'Robotics club build session', borrowDate: '2026-11-06', dueDate: '2026-11-07', status: 'Released', items: [{ equipmentId: 'eq-012', quantity: 1 }, { equipmentId: 'eq-013', quantity: 2 }], submittedAt: '2026-11-03', reviewer: 'Jordan Lee', rejectionReason: null, releasedAt: '2026-11-06', releasedBy: 'Jordan Lee' },
];

const conditionLogs = [
  { id: 'LOG-221', equipment: 'Thermal Camera', condition: 'Damaged', status: 'Damaged', note: 'Lens housing cracked during checkout inspection.', updatedBy: 'Jordan Lee', timestamp: 'Nov 05, 2026 · 14:20' },
  { id: 'LOG-220', equipment: 'Bench Power Supply', condition: 'Needs Repair', status: 'Under Maintenance', note: 'Output 2 fluctuates under load; sent to repair bay.', updatedBy: 'Jordan Lee', timestamp: 'Nov 04, 2026 · 09:15' },
  { id: 'LOG-219', equipment: 'Raspberry Pi 4 Model B', condition: 'Fair', status: 'Available', note: 'Returned with minor case scuff; still operational.', updatedBy: 'Jordan Lee', timestamp: 'Nov 03, 2026 · 16:42' },
  { id: 'LOG-218', equipment: 'TP-Link Managed Switch', condition: 'Fair', status: 'Available', note: 'Port 18 cover replaced after return.', updatedBy: 'Jordan Lee', timestamp: 'Oct 30, 2026 · 11:06' },
];

const incidentReports = [
  { type: 'Damaged', equipment: 'Thermal Camera', requester: 'Alex Rivera', when: '1 day ago', note: 'Lens housing cracked during checkout inspection.' },
  { type: 'Missing', equipment: 'USB-C Power Adapter', requester: 'Noah Santos', when: '3 days ago', note: 'Adapter not present in returned kit.' },
];

const entryPage = document.body.dataset.page || '';
const entryRole = document.body.dataset.role || 'student';

const state = {
  authenticated: Boolean(entryPage && entryPage !== 'login'),
  roleKey: entryRole,
  page: entryPage || 'dashboard',
  search: '',
  catalogCategory: 'All categories',
  availability: 'All availability',
  prefillEquipment: '',
  modal: null,
  sidebarOpen: false,
  equipment: structuredClone(equipmentSeed),
  requests: structuredClone(requestSeed),
  toasts: [],
};

const currentUser = () => users[state.roleKey];
const requesterRole = () => state.roleKey !== 'staff';
const visibleRequests = () => requesterRole() ? state.requests.filter((request) => request.requesterId === currentUser().id) : state.requests;
const equipmentById = (id) => state.equipment.find((item) => item.id === id);
const requestItemsLabel = (request) => request.items.map((item) => `${equipmentById(item.equipmentId)?.name || 'Equipment'} × ${item.quantity}`).join(', ');
const getAvailabilityLabel = (item) => item.available === 0 ? 'Unavailable' : item.available <= Math.ceil(item.total * .35) ? 'Limited' : 'Available';
const effectiveStatus = (request) => request.status;
const pageLabel = () => ({ dashboard: 'Dashboard', catalog: 'Equipment catalog', request: 'New request', requests: 'My requests', history: 'My history', notifications: 'Notifications', 'staff-dashboard': 'Staff dashboard', queue: 'Request queue', equipment: 'Equipment management', processing: 'Release & return', overdue: 'Overdue monitor', records: 'Records & reports', conditions: 'Condition & incidents' }[state.page] || 'Dashboard');

const icon = (name) => ({
  grid: '▦', box: '□', request: '↗', clock: '◷', history: '↻', bell: '◌', dashboard: '⌂', users: '♙', settings: '⚙', search: '⌕', plus: '+', download: '↓', edit: '✎', archive: '⌫', arrow: '→', close: '×', check: '✓', alert: '!', clipboard: '▤', return: '↩', report: '◈', log: '≡', filter: '≡', menu: '☰', lock: '⌑', calendar: '□', location: '⌖', bolt: 'ϟ', eye: '◉'
}[name] || '•');

function statusBadge(status) {
  return `<span class="badge ${slug(status)}">${escapeHtml(status)}</span>`;
}

function renderLogin() {
  return `
    <div class="login-screen">
      <section class="login-intro">
        <div class="brand-lockup"><div class="brand-mark">LT</div><div class="brand-name">Lab<span>Track</span></div></div>
        <div class="intro-copy">
          <p class="eyebrow">Laboratory operations · 01</p>
          <h1>Keep every<br /><em>borrowed thing</em><br />accountable.</h1>
          <p>One calm workspace for finding equipment, tracking requests, and closing the loop when it comes back through the lab door.</p>
        </div>
        <div class="mini-signal"><span><i></i> 24/7 inventory clarity</span><span><i></i> Supabase-ready frontend</span></div>
      </section>
      <section class="login-panel">
        <div class="login-card">
          <p class="eyebrow" style="color: var(--teal);">LabTrack workspace</p>
          <h2>Sign in to your lab.</h2>
          <p class="subcopy">Use a demo role below to explore the requester or laboratory personnel experience.</p>
          <form data-form="login">
            <div class="field"><label class="field-label" for="email">Campus email</label><div class="input-with-icon"><input id="email" type="email" value="alex.rivera@campus.edu" /><span class="input-icon">@</span></div></div>
            <div class="field"><label class="field-label" for="password">Password</label><div class="input-with-icon"><input id="password" type="password" value="demo-password" /><span class="input-icon">${icon('lock')}</span></div></div>
            <button class="primary-btn full" type="submit">Continue to LabTrack <span>${icon('arrow')}</span></button>
          </form>
          <div class="login-divider">or use a demo role</div>
          <div class="demo-roles">
            <button class="role-demo" data-demo-role="student"><span class="role-avatar">AR</span><span><strong>Alex Rivera · Student</strong><small>Requester workspace · ECE 3rd year</small></span><span style="margin-left:auto;color:var(--muted)">${icon('arrow')}</span></button>
            <button class="role-demo" data-demo-role="faculty"><span class="role-avatar" style="background:var(--violet-soft);color:var(--violet)">MC</span><span><strong>Dr. Maya Chen · Faculty</strong><small>Requester workspace · Engineering faculty</small></span><span style="margin-left:auto;color:var(--muted)">${icon('arrow')}</span></button>
            <button class="role-demo" data-demo-role="staff"><span class="role-avatar" style="background:var(--amber-soft);color:var(--amber)">JL</span><span><strong>Jordan Lee · Laboratory Personnel</strong><small>Operations workspace · Engineering lab</small></span><span style="margin-left:auto;color:var(--muted)">${icon('arrow')}</span></button>
          </div>
          <p class="login-footnote">Frontend preview · Authentication, RLS, and data persistence will connect through Supabase.</p>
        </div>
      </section>
    </div>`;
}

function navItem(page, label, iconName, active = state.page === page) {
  return `<button class="nav-item ${active ? 'active' : ''}" data-page="${page}"><span class="nav-icon">${icon(iconName)}</span>${label}</button>`;
}

function renderSidebar() {
  if (requesterRole()) {
    return `
      <p class="workspace-label">Requester workspace</p>
      <nav class="nav-list">
        ${navItem('dashboard', 'Dashboard', 'dashboard')}
        ${navItem('catalog', 'Equipment catalog', 'box')}
        ${navItem('request', 'New request', 'request')}
        ${navItem('requests', 'My requests', 'clock')}
        ${navItem('history', 'My history', 'history')}
        ${navItem('notifications', 'Notifications', 'bell')}
      </nav>`;
  }
  return `
    <p class="workspace-label">Operations workspace</p>
    <nav class="nav-list">
      ${navItem('staff-dashboard', 'Overview', 'dashboard')}
      ${navItem('queue', 'Request queue', 'clock')}
      ${navItem('equipment', 'Equipment', 'box')}
      ${navItem('processing', 'Release & return', 'return')}
      ${navItem('overdue', 'Overdue monitor', 'alert')}
      <div class="nav-separator"></div>
      ${navItem('records', 'Records & reports', 'report')}
      ${navItem('conditions', 'Condition log', 'log')}
    </nav>`;
}

function renderMobileDock() {
  const items = requesterRole()
    ? [['dashboard', 'Home', 'dashboard'], ['catalog', 'Catalog', 'box'], ['request', 'Request', 'request'], ['requests', 'Requests', 'clock'], ['notifications', 'Alerts', 'bell']]
    : [['staff-dashboard', 'Overview', 'dashboard'], ['queue', 'Queue', 'clock'], ['equipment', 'Equipment', 'box'], ['processing', 'Desk', 'return'], ['conditions', 'Log', 'log']];
  return `<nav class="mobile-dock" aria-label="Mobile navigation">${items.map(([page, label, iconName]) => `<button class="mobile-dock-item ${state.page === page ? 'active' : ''}" data-page="${page}"><span>${icon(iconName)}</span><small>${label}</small></button>`).join('')}</nav>`;
}

function renderAppShell() {
  const user = currentUser();
  return `
    <div class="app-shell">
      <aside class="sidebar ${state.sidebarOpen ? 'open' : ''}">
        <div class="brand-lockup"><div class="brand-mark">LT</div><div class="brand-name">Lab<span>Track</span></div></div>
        ${renderSidebar()}
        <div class="sidebar-foot"><div class="profile-mini"><div class="avatar">${initials(user.name)}</div><div><div class="profile-name">${escapeHtml(user.name)}</div><div class="profile-role">${escapeHtml(user.role)}</div></div><button class="logout-mini" data-action="logout" title="Sign out">↪</button></div></div>
      </aside>
      <div class="main-column">
        <header class="topbar"><button class="mobile-menu" data-action="toggle-sidebar">${icon('menu')}</button><div class="breadcrumb">LabTrack <span style="color:var(--muted-2);padding:0 8px">/</span> <strong>${pageLabel()}</strong></div><div class="topbar-actions"><button class="top-icon-btn" data-page="notifications" title="Notifications">${icon('bell')}<span class="unread-dot"></span></button><button class="top-icon-btn" data-action="open-help" title="Workspace guide">?</button><div class="top-user"><div class="avatar">${initials(user.name)}</div><div class="profile-copy"><div class="profile-name">${escapeHtml(user.name)}</div><div class="profile-role">${escapeHtml(user.role)}</div></div></div></div></header>
        <main class="content page-${state.page}">${renderPage()}</main>
      </div>
    </div>
    ${renderMobileDock()}
    ${renderModal()}
    <div class="toast-stack">${state.toasts.map((toast) => `<div class="toast"><span class="toast-mark">${icon('check')}</span><div><strong>${escapeHtml(toast.title)}</strong><small>${escapeHtml(toast.message)}</small></div></div>`).join('')}</div>`;
}

function renderPage() {
  if (state.page === 'dashboard') return requesterDashboard();
  if (state.page === 'catalog') return catalogPage();
  if (state.page === 'request') return requestPage();
  if (state.page === 'requests') return requestsPage();
  if (state.page === 'history') return historyPage();
  if (state.page === 'notifications') return notificationsPage();
  if (state.page === 'staff-dashboard') return staffDashboard();
  if (state.page === 'queue') return queuePage();
  if (state.page === 'equipment') return equipmentPage();
  if (state.page === 'processing') return processingPage();
  if (state.page === 'overdue') return overduePage();
  if (state.page === 'records') return recordsPage();
  if (state.page === 'conditions') return conditionsPage();
  return requesterRole() ? requesterDashboard() : staffDashboard();
}

function heading(title, copy, action = '') {
  return `<div class="page-heading"><div><p class="eyebrow" style="color:var(--teal);margin-bottom:10px">${requesterRole() ? 'Requester workspace' : 'Operations workspace'}</p><h1>${title}</h1><p>${copy}</p></div>${action ? `<div class="page-heading-actions">${action}</div>` : ''}</div>`;
}

function statCard(label, value, note, iconName, variant = '') {
  return `<div class="stat-card ${variant}"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon">${icon(iconName)}</span></div><div class="stat-number">${value}</div><div class="stat-note">${note}</div></div>`;
}

function requesterDashboard() {
  const my = visibleRequests();
  const active = my.filter((r) => ['Released', 'Overdue'].includes(r.status));
  const pending = my.filter((r) => r.status === 'Pending').length;
  const overdue = my.filter((r) => r.status === 'Overdue').length;
  const dueSoon = active.filter((r) => r.dueDate === '2026-11-07' || r.dueDate === '2026-11-08').length;
  const recent = my.slice(0, 4);
  return `${heading(`Good morning, ${currentUser().name.split(' ')[0]}.`, `Here’s what needs your attention in the lab today.`, `<button class="primary-btn" data-page="request">${icon('plus')} New borrowing request</button>`)}
    ${overdue ? `<div class="alert-banner"><div class="alert-mark">${icon('alert')}</div><div><strong>You have ${overdue} overdue borrowing${overdue > 1 ? 's' : ''}.</strong><p>Return the equipment or contact the lab team to keep your record in good standing.</p></div><button class="section-link" data-page="history">View borrowing →</button></div>` : ''}
    <div class="stats-grid">${statCard('Active borrowings', active.length, '<strong>1 due tomorrow</strong>', 'box')}${statCard('Pending requests', pending, 'Awaiting staff review', 'clock', 'amber')}${statCard('Due soon', dueSoon, 'Within the next 2 days', 'calendar', 'violet')}${statCard('Available to borrow', state.equipment.filter((e) => getAvailabilityLabel(e) !== 'Unavailable').length, 'Across the catalog', 'check')}</div>
    <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Recent requests</h2><p>Your latest equipment activity and status changes.</p></div><button class="section-link" data-page="requests">View all ${icon('arrow')}</button></div><div class="panel-body">${recentRequestsTable(recent)}</div></section><section class="panel"><div class="panel-head"><div><h2>Quick search</h2><p>Find equipment and check availability.</p></div></div><div class="panel-body"><div class="quick-search"><div class="search-wrap"><input class="search-input" data-quick-search placeholder="Search the catalog..." /></div><button class="primary-btn" data-action="quick-search">Search</button></div><div class="activity-list" style="margin-top:25px"><div class="activity-row"><span class="activity-dot danger"></span><div class="activity-copy"><strong>Thermal Camera is unavailable</strong><span>Marked damaged after the latest inspection.</span></div><span class="activity-time">1d</span></div><div class="activity-row"><span class="activity-dot"></span><div class="activity-copy"><strong>New lab hours this week</strong><span>Equipment desk is open 08:00–17:00, Monday–Friday.</span></div><span class="activity-time">3d</span></div></div></div></section></div>
    <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Upcoming due dates</h2><p>Keep an eye on what needs to come back next.</p></div><button class="section-link" data-page="history">Open history ${icon('arrow')}</button></div><div class="panel-body">${upcomingDueTable(active)}</div></section><section class="panel"><div class="panel-head"><div><h2>Notifications</h2><p>Latest messages from the lab team.</p></div><button class="section-link" data-page="notifications">See all</button></div><div class="panel-body">${notificationList(3)}</div></section></div>`;
}

function recentRequestsTable(requests) {
  if (!requests.length) return `<div class="empty-state"><div class="empty-symbol">${icon('clipboard')}</div><h3>No requests yet</h3><p>Start by finding a piece of equipment in the catalog.</p><button class="primary-btn" data-page="catalog">Browse equipment</button></div>`;
  return `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Request</th><th>Submitted</th><th>Due</th><th>Status</th></tr></thead><tbody>${requests.map((request) => `<tr data-open-request="${request.id}"><td><span class="table-primary">${request.id}</span><span class="table-secondary">${escapeHtml(requestItemsLabel(request))}</span></td><td>${shortFmt.format(new Date(request.submittedAt))}</td><td>${shortFmt.format(new Date(request.dueDate))}</td><td>${statusBadge(request.status)}</td></tr>`).join('')}</tbody></table></div>`;
}

function upcomingDueTable(requests) {
  const due = requests.filter((r) => r.status !== 'Returned');
  if (!due.length) return `<div class="empty-state"><div class="empty-symbol">${icon('check')}</div><h3>Nothing due soon</h3><p>Your active borrowings are all in good shape.</p></div>`;
  return `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Equipment</th><th>Due date</th><th>Condition</th><th></th></tr></thead><tbody>${due.map((request) => `<tr><td><span class="table-primary">${escapeHtml(request.items.map((i) => equipmentById(i.equipmentId)?.name).join(', '))}</span><span class="table-secondary">${request.id}</span></td><td>${shortFmt.format(new Date(request.dueDate))}<span class="table-secondary">${request.status === 'Overdue' ? 'Past due' : 'Keep it moving'}</span></td><td>${statusBadge(request.status === 'Overdue' ? 'Overdue' : 'Good')}</td><td><button class="icon-action" data-open-request="${request.id}">${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>`;
}

function catalogPage() {
  const filtered = state.equipment.filter((item) => {
    const matchesSearch = !state.search || `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(state.search.toLowerCase());
    const matchesCategory = state.catalogCategory === 'All categories' || item.category === state.catalogCategory;
    const availability = getAvailabilityLabel(item);
    const matchesAvailability = state.availability === 'All availability' || availability === state.availability;
    return matchesSearch && matchesCategory && matchesAvailability;
  });
  const categories = ['All categories', ...new Set(state.equipment.map((item) => item.category))];
  return `${heading('Equipment catalog', 'Browse what’s available, then make a request when you’re ready.', `<button class="primary-btn" data-page="request">${icon('plus')} New request</button>`)}<div class="filter-bar"><div class="search-wrap"><input class="search-input" data-catalog-search value="${escapeHtml(state.search)}" placeholder="Search by name or category" /></div><select data-filter-category>${categories.map((category) => `<option ${category === state.catalogCategory ? 'selected' : ''}>${category}</option>`).join('')}</select><select data-filter-availability><option>All availability</option><option ${state.availability === 'Available' ? 'selected' : ''}>Available</option><option ${state.availability === 'Limited' ? 'selected' : ''}>Limited</option><option ${state.availability === 'Unavailable' ? 'selected' : ''}>Unavailable</option></select><span class="filter-count">${filtered.length} of ${state.equipment.length} items</span></div><div class="equipment-grid">${filtered.length ? filtered.map(equipmentCard).join('') : `<div class="panel" style="grid-column:1/-1">${emptyCatalog()}</div>`}</div>`;
}

function equipmentCard(item) {
  const availability = getAvailabilityLabel(item);
  return `<article class="equipment-card"><div class="equipment-visual"><span class="equipment-symbol">${item.symbol}</span>${statusBadge(availability)}</div><span class="equipment-category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><div class="equipment-meta"><div><span class="meta-label">Available</span><span class="meta-value">${item.available} <span style="font-weight:400;color:var(--muted)">/ ${item.total} units</span></span></div><div><span class="meta-label">Condition</span><span class="meta-value">${escapeHtml(item.condition)}</span></div></div><div class="equipment-card-footer"><span style="font-size:10px;color:var(--muted)">${icon('location')} ${escapeHtml(item.location)}</span><button class="card-link" data-open-equipment="${item.id}">View details ${icon('arrow')}</button></div></article>`;
}

function emptyCatalog() { return `<div class="empty-state"><div class="empty-symbol">${icon('search')}</div><h3>No equipment matched</h3><p>Try another keyword or clear one of the filters.</p><button class="secondary-btn" data-action="clear-filters">Clear filters</button></div>`; }

function requestPage(prefillId = state.prefillEquipment) {
  const available = state.equipment.filter((item) => item.available > 0);
  const chosen = prefillId ? equipmentById(prefillId) : available[0];
  const optionList = available.map((item) => `<option value="${item.id}" ${chosen?.id === item.id ? 'selected' : ''}>${escapeHtml(item.name)} · ${item.available} available</option>`).join('');
  return `${heading('New borrowing request', 'Tell the lab team what you need and when you’ll bring it back.', `<button class="secondary-btn" data-page="catalog">${icon('box')} Browse catalog</button>`)}<section class="panel"><div class="panel-head"><div><h2>Request details</h2><p>Quantities are checked against the current available inventory.</p></div><span class="badge available">Supabase-ready form</span></div><div class="panel-body"><form class="form-grid" data-form="request"><div class="form-section-title">What do you need?</div><div class="field full-width"><label class="field-label" for="request-equipment">Equipment</label><select id="request-equipment" name="equipmentId">${optionList}</select></div><div class="field"><label class="field-label" for="request-quantity">Quantity</label><input id="request-quantity" name="quantity" type="number" min="1" max="${chosen?.available || 1}" value="1" /><small class="field-hint" style="display:block;margin-top:7px;color:var(--muted);font-size:10px">Available now: <strong id="available-hint">${chosen?.available || 0} units</strong></small></div><div class="field"><label class="field-label" for="request-purpose">Purpose</label><input id="request-purpose" name="purpose" required placeholder="e.g. ECE 304 · signal lab" /></div><div class="form-section-title">When do you need it?</div><div class="field"><label class="field-label" for="borrow-date">Borrow date</label><input id="borrow-date" name="borrowDate" type="date" value="2026-11-08" required /></div><div class="field"><label class="field-label" for="due-date">Expected return date</label><input id="due-date" name="dueDate" type="date" value="2026-11-12" required /></div><div class="field full-width"><label class="field-label" for="request-notes">Notes for the lab team <span style="font-weight:400;color:var(--muted)">(optional)</span></label><textarea id="request-notes" name="notes" placeholder="Add a class, project, or handling note..."></textarea></div><div class="form-actions full-width"><button class="secondary-btn" type="button" data-page="catalog">Cancel</button><button class="primary-btn" type="submit">Submit request ${icon('arrow')}</button></div></form></div></section>`;
}

function requestsPage() {
  const requests = visibleRequests();
  return `${heading('My requests', 'Track every request from first review to final return.', `<button class="primary-btn" data-page="request">${icon('plus')} New request</button>`)}<div class="filter-bar"><span class="badge pending">${requests.filter((r) => r.status === 'Pending').length} pending review</span><span class="badge borrowed">${requests.filter((r) => ['Released', 'Overdue'].includes(r.status)).length} active</span><span class="filter-count">${requests.length} total requests</span></div><div class="request-stack">${requests.length ? requests.map(requestCard).join('') : `<section class="panel">${emptyRequests()}</section>`}</div>`;
}

function requestCard(request) {
  const timelineStatus = request.status === 'Rejected' ? 'Rejected' : request.status;
  const steps = ['Pending', 'Approved', 'Released', 'Returned'];
  const order = { Pending: 0, Approved: 1, Released: 2, Overdue: 2, Returned: 3, Rejected: 1, Cancelled: 0 };
  const current = order[timelineStatus] ?? 0;
  return `<article class="request-card"><div class="request-card-top"><div><div class="request-id">${request.id} · submitted ${shortFmt.format(new Date(request.submittedAt))}</div><h3>${escapeHtml(request.purpose)}</h3><p class="request-card-sub">${escapeHtml(requestItemsLabel(request))}</p></div>${statusBadge(request.status)}</div><div class="timeline">${steps.map((step, index) => `<div class="timeline-step ${request.status === 'Rejected' && step === 'Approved' ? 'current' : index < current || (request.status === 'Returned' && index === 3) ? 'done' : index === current ? 'current' : ''}">${step}</div>`).join('')}</div><div class="request-card-bottom"><div class="request-meta"><span>Borrow date<strong>${moneylessDate(request.borrowDate)}</strong></span><span>Expected return<strong>${moneylessDate(request.dueDate)}</strong></span><span>Reviewed by<strong>${request.reviewer || 'Pending review'}</strong></span></div><div style="display:flex;align-items:center;gap:8px">${request.rejectionReason ? `<div class="request-note">${escapeHtml(request.rejectionReason)}</div>` : ''}${request.status === 'Pending' ? `<button class="danger-btn" data-cancel-request="${request.id}">Cancel</button>` : ''}<button class="ghost-btn" data-open-request="${request.id}">Details ${icon('arrow')}</button></div></div></article>`;
}

function emptyRequests() { return `<div class="empty-state"><div class="empty-symbol">${icon('clipboard')}</div><h3>Your request list is clear</h3><p>When you request equipment, the lab team’s review timeline will appear here.</p><button class="primary-btn" data-page="catalog">Browse equipment</button></div>`; }

function historyPage() {
  const records = visibleRequests().filter((r) => ['Released', 'Overdue', 'Returned'].includes(r.status));
  return `${heading('My history', 'A personal record of equipment in your hands and what came back.', `<button class="primary-btn" data-page="request">${icon('plus')} Borrow equipment</button>`)}<section class="panel"><div class="panel-head"><div><h2>Borrowing records</h2><p>Return condition is captured by laboratory personnel at check-in.</p></div><span class="mono" style="font-size:10px;color:var(--muted)">${records.length} records</span></div>${records.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Record</th><th>Borrowed</th><th>Due</th><th>Status</th><th>Return condition</th><th></th></tr></thead><tbody>${records.map((record) => `<tr><td><span class="table-primary">${record.id}</span><span class="table-secondary">${escapeHtml(requestItemsLabel(record))}</span></td><td>${moneylessDate(record.borrowDate)}</td><td>${moneylessDate(record.dueDate)}</td><td>${statusBadge(record.status)}</td><td>${record.returnedCondition ? statusBadge(record.returnedCondition) : '<span style="color:var(--muted);font-size:11px">Not returned</span>'}</td><td><button class="icon-action" data-open-request="${record.id}">${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>` : emptyRequests()}</section>`;
}

function notificationsPage() {
  return `${heading('Notifications', 'A quiet inbox for due dates, approvals, and lab updates.', `<button class="secondary-btn" data-action="mark-read">Mark all read</button>`)}<section class="panel"><div class="panel-head"><div><h2>Inbox</h2><p>3 unread messages</p></div><span class="badge pending">3 unread</span></div><div class="panel-body">${notificationList(10, true)}</div></section>`;
}

function notificationList(limit = 3, expanded = false) {
  const list = [
    { title: 'Return reminder', text: 'Raspberry Pi 4 Model B is overdue. Please return it or contact the lab team.', time: 'Today · 08:12', type: 'danger' },
    { title: 'Request approved', text: 'Your request REQ-1035 is approved and ready for release at the equipment desk.', time: 'Nov 05 · 15:40', type: 'success' },
    { title: 'Lab schedule update', text: 'The equipment desk will close at 16:00 on Friday for inventory count.', time: 'Nov 04 · 09:30', type: 'info' },
    { title: 'New equipment available', text: 'ESP32 Development Boards have been restocked. 10 units are available.', time: 'Nov 02 · 13:18', type: 'success' },
  ].slice(0, limit);
  return `<div class="activity-list">${list.map((item) => `<div class="activity-row"><span class="activity-dot ${item.type === 'danger' ? 'danger' : item.type === 'info' ? 'warn' : ''}"></span><div class="activity-copy"><strong>${item.title}</strong><span>${item.text}</span></div><span class="activity-time">${item.time}</span></div>`).join('')}</div>`;
}

function staffDashboard() {
  const pending = state.requests.filter((r) => r.status === 'Pending').length;
  const borrowed = state.requests.filter((r) => ['Released', 'Overdue'].includes(r.status)).length;
  const overdue = state.requests.filter((r) => r.status === 'Overdue').length;
  const damaged = state.equipment.filter((e) => ['Damaged', 'Missing'].includes(e.status)).length;
  const available = state.equipment.filter((e) => e.available > 0).length;
  return `${heading('Operations overview', 'A quick read on requests, inventory health, and what needs a human decision.', `<button class="primary-btn" data-page="queue">${icon('clock')} Open request queue</button>`)}<div class="stats-grid">${statCard('Pending requests', pending, '<strong>Needs review</strong> today', 'clock', 'amber')}${statCard('Currently borrowed', borrowed, 'Across active records', 'box', 'violet')}${statCard('Overdue items', overdue, '<strong>Follow-up required</strong>', 'alert', 'alert')}${statCard('Available equipment', available, `${state.equipment.length} tracked items`, 'check')}</div><div class="health-grid"><section class="panel"><div class="panel-head"><div><h2>Inventory health</h2><p>Quantity and condition snapshot across the equipment room.</p></div><button class="section-link" data-page="equipment">Manage inventory ${icon('arrow')}</button></div><div class="panel-body"><div class="chart"><div class="chart-row"><label>Available</label><div class="bar-track"><div class="bar-fill" style="width:78%"></div></div><strong>${available}</strong></div><div class="chart-row"><label>Reserved</label><div class="bar-track"><div class="bar-fill" style="width:34%;background:linear-gradient(90deg,var(--amber),#f1c969)"></div></div><strong>1</strong></div><div class="chart-row"><label>Maintenance</label><div class="bar-track"><div class="bar-fill" style="width:23%;background:linear-gradient(90deg,var(--violet),#b6acec)"></div></div><strong>1</strong></div><div class="chart-row"><label>Damaged</label><div class="bar-track"><div class="bar-fill" style="width:14%;background:linear-gradient(90deg,var(--coral),#efad99)"></div></div><strong>${damaged}</strong></div></div><div style="display:flex;gap:14px;margin-top:24px;flex-wrap:wrap"><span style="font-size:10px;color:var(--muted)"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--teal);margin-right:5px"></i>Healthy stock</span><span style="font-size:10px;color:var(--muted)"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--coral);margin-right:5px"></i>Needs attention</span></div></div></section><section class="panel"><div class="panel-head"><div><h2>Recent incidents</h2><p>Damage and missing-item reports.</p></div><button class="section-link" data-page="conditions">View log ${icon('arrow')}</button></div><div class="panel-body"><div class="incident-list">${incidentReports.map((incident) => `<div class="incident"><div class="incident-icon">${incident.type === 'Missing' ? '?' : icon('alert')}</div><div class="incident-copy"><strong>${incident.type} · ${incident.equipment}</strong><span>${incident.requester} · ${incident.when}</span><span>${incident.note}</span></div></div>`).join('')}</div></div></section></div><div class="dashboard-grid" style="margin-top:18px"><section class="panel"><div class="panel-head"><div><h2>Requests needing attention</h2><p>Oldest open decisions first.</p></div><button class="section-link" data-page="queue">Open queue</button></div><div class="panel-body">${recentRequestsTable(state.requests.filter((r) => ['Pending', 'Approved', 'Overdue'].includes(r.status)).slice(0, 4))}</div></section><section class="panel"><div class="panel-head"><div><h2>Today’s desk</h2><p>Release and return workload.</p></div></div><div class="panel-body"><div class="metric-ribbon" style="padding:0;background:transparent;border:0;display:grid;gap:13px"><div class="metric-ribbon-item"><b>02</b><span>scheduled releases<br /><small style="color:var(--teal-dark)">Next at 10:30</small></span></div><div class="metric-ribbon-item"><b>01</b><span>returns expected<br /><small style="color:var(--coral)">One overdue</small></span></div><div class="metric-ribbon-item"><b>17</b><span>items checked out<br /><small style="color:var(--muted)">Across 6 borrowers</small></span></div></div></div></section></div>`;
}

function queuePage() {
  const pending = state.requests.filter((r) => ['Pending', 'Approved'].includes(r.status));
  return `${heading('Request queue', 'Review, approve, and prepare equipment for release.', `<button class="secondary-btn" data-action="refresh">${icon('history')} Refresh queue</button>`)}<section class="panel"><div class="metric-ribbon"><div class="metric-ribbon-item"><b>${state.requests.filter((r) => r.status === 'Pending').length}</b><span>pending review</span></div><div class="metric-ribbon-item"><b>${state.requests.filter((r) => r.status === 'Approved').length}</b><span>approved to release</span></div><div class="metric-ribbon-item"><b>${state.requests.filter((r) => r.status === 'Rejected').length}</b><span>rejected this period</span></div></div><div class="staff-toolbar"><div class="search-wrap"><input class="search-input" data-queue-search placeholder="Search requester or request ID" /></div><select><option>All statuses</option><option>Pending</option><option>Approved</option></select><span class="toolbar-spacer"></span><span class="filter-count">${pending.length} in queue</span></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Requester</th><th>Equipment</th><th>Dates</th><th>Purpose</th><th>Status</th><th></th></tr></thead><tbody>${pending.map((request) => `<tr><td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="background:var(--teal-soft);color:var(--teal-dark)">${initials(request.requester)}</div><div><span class="table-primary">${escapeHtml(request.requester)}</span><span class="table-secondary">${request.requesterRole} · ${request.id}</span></div></div></td><td><span class="table-primary">${escapeHtml(request.items.map((i) => equipmentById(i.equipmentId)?.name).join(', '))}</span><span class="table-secondary">${request.items.reduce((sum, i) => sum + i.quantity, 0)} total unit(s)</span></td><td>${shortFmt.format(new Date(request.borrowDate))}<span class="table-secondary">to ${shortFmt.format(new Date(request.dueDate))}</span></td><td style="max-width:180px">${escapeHtml(request.purpose)}</td><td>${statusBadge(request.status)}</td><td><div class="row-actions">${request.status === 'Pending' ? `<button class="icon-action" data-approve-request="${request.id}" title="Approve">${icon('check')}</button><button class="icon-action danger" data-reject-request="${request.id}" title="Reject">${icon('close')}</button>` : `<button class="secondary-btn" style="padding:7px 10px;font-size:10px" data-release-request="${request.id}">Release</button>`}</div></td></tr>`).join('')}</tbody></table></div></section>`;
}

function equipmentPage() {
  return `${heading('Equipment management', 'Maintain the source of truth for every item in the lab.', `<button class="primary-btn" data-action="add-equipment">${icon('plus')} Add equipment</button>`)}<section class="panel"><div class="staff-toolbar"><div class="search-wrap"><input class="search-input" data-equipment-search placeholder="Search equipment or category" /></div><select><option>All statuses</option><option>Available</option><option>Under Maintenance</option><option>Damaged</option></select><span class="toolbar-spacer"></span><span class="filter-count">${state.equipment.length} tracked items</span></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Equipment</th><th>Category</th><th>Inventory</th><th>Condition</th><th>Status</th><th>Location</th><th></th></tr></thead><tbody>${state.equipment.map((item) => `<tr><td><div class="item-cell"><div class="item-thumb">${item.symbol}</div><div><span class="table-primary">${escapeHtml(item.name)}</span><span class="table-secondary">${item.id}</span></div></div></td><td>${escapeHtml(item.category)}</td><td><span class="table-primary">${item.available} available</span><span class="table-secondary">${item.total} total</span></td><td>${statusBadge(item.condition)}</td><td>${statusBadge(item.status)}</td><td style="font-size:11px;color:var(--muted)">${icon('location')} ${escapeHtml(item.location)}</td><td><div class="row-actions"><button class="icon-action" data-edit-equipment="${item.id}" title="Edit">${icon('edit')}</button><button class="icon-action danger" data-archive-equipment="${item.id}" title="Archive">${icon('archive')}</button></div></td></tr>`).join('')}</tbody></table></div></section>`;
}

function processingPage() {
  const ready = state.requests.filter((r) => r.status === 'Approved');
  const borrowed = state.requests.filter((r) => ['Released', 'Overdue'].includes(r.status));
  return `${heading('Release & return', 'Close the loop with a clear handoff at the equipment desk.', `<button class="secondary-btn" data-action="refresh">${icon('history')} Refresh</button>`)}<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Ready for release</h2><p>Approved requests waiting for a staff handoff.</p></div><span class="badge reserved">${ready.length} ready</span></div>${ready.length ? `<div class="panel-body"><div class="request-stack">${ready.map((r) => processingCard(r, 'release')).join('')}</div></div>` : `<div class="panel-body">${emptyProcessing('No approved requests waiting', 'The release desk is caught up for now.')}</div>`}</section><section class="panel"><div class="panel-head"><div><h2>Currently borrowed</h2><p>Return these records at check-in.</p></div><span class="badge borrowed">${borrowed.length} active</span></div>${borrowed.length ? `<div class="panel-body"><div class="request-stack">${borrowed.map((r) => processingCard(r, 'return')).join('')}</div></div>` : `<div class="panel-body">${emptyProcessing('No active borrowings', 'Released equipment will show up here.')}</div>`}</section></div>`;
}

function processingCard(request, action) {
  return `<div class="request-card" style="padding:15px"><div class="request-card-top"><div><div class="request-id">${request.id}</div><h3>${escapeHtml(request.requester)}</h3><p class="request-card-sub">${escapeHtml(requestItemsLabel(request))}</p></div>${statusBadge(request.status)}</div><div class="request-meta" style="margin:15px 0"><span>Due date<strong>${moneylessDate(request.dueDate)}</strong></span><span>Purpose<strong>${escapeHtml(request.purpose)}</strong></span></div><button class="${action === 'release' ? 'primary-btn' : 'secondary-btn'} full" data-${action}-request="${request.id}">${action === 'release' ? icon('check') + ' Mark as released' : icon('return') + ' Process return'}</button></div>`;
}

function emptyProcessing(title, copy) { return `<div class="empty-state"><div class="empty-symbol">${icon('check')}</div><h3>${title}</h3><p>${copy}</p></div>`; }

function overduePage() {
  const overdue = state.requests.filter((r) => r.status === 'Overdue');
  return `${heading('Overdue monitor', 'Follow up on borrowed items that have passed their expected return date.', `<button class="secondary-btn" data-action="export-csv">${icon('download')} Export list</button>`)}<section class="panel"><div class="metric-ribbon"><div class="metric-ribbon-item"><b style="color:var(--coral)">${overdue.length}</b><span>overdue records</span></div><div class="metric-ribbon-item"><b>${overdue.reduce((sum, r) => sum + r.items.reduce((total, item) => total + item.quantity, 0), 0)}</b><span>units outstanding</span></div><div class="metric-ribbon-item"><b>2.6d</b><span>average days overdue</span></div></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Borrower</th><th>Equipment</th><th>Due date</th><th>Days overdue</th><th>Last contact</th><th></th></tr></thead><tbody>${overdue.length ? overdue.map((request) => `<tr><td><span class="table-primary">${escapeHtml(request.requester)}</span><span class="table-secondary">${request.requesterRole} · ${request.id}</span></td><td>${escapeHtml(requestItemsLabel(request))}</td><td>${moneylessDate(request.dueDate)}</td><td><span class="badge overdue">2 days</span></td><td><span style="font-size:11px;color:var(--muted)">Not recorded</span></td><td><button class="secondary-btn" style="padding:7px 10px;font-size:10px" data-action="contact-borrower" data-request-id="${request.id}">Contact</button></td></tr>`).join('') : `<tr><td colspan="6">${emptyProcessing('No overdue borrowings', 'A clear overdue list is a good lab day.')}</td></tr>`}</tbody></table></div></section>`;
}

function recordsPage() {
  return `${heading('Records & reports', 'Searchable borrowing and return history for a transparent lab.', `<button class="primary-btn" data-action="export-csv">${icon('download')} Export CSV</button>`)}<section class="panel"><div class="staff-toolbar"><div class="search-wrap"><input class="search-input" data-records-search placeholder="Search borrower, item, or request ID" /></div><select><option>All statuses</option><option>Pending</option><option>Released</option><option>Returned</option><option>Overdue</option></select><select><option>All dates</option><option>Last 7 days</option><option>This month</option></select><span class="toolbar-spacer"></span><span class="filter-count">${state.requests.length} records</span></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Request</th><th>Borrower</th><th>Equipment</th><th>Borrowed</th><th>Returned</th><th>Status</th></tr></thead><tbody>${state.requests.map((request) => `<tr><td><span class="table-primary">${request.id}</span><span class="table-secondary">${request.purpose}</span></td><td>${escapeHtml(request.requester)}<span class="table-secondary">${request.requesterRole}</span></td><td>${escapeHtml(requestItemsLabel(request))}</td><td>${request.releasedAt ? moneylessDate(request.releasedAt) : '—'}</td><td>${request.returnedAt ? moneylessDate(request.returnedAt) : '—'}</td><td>${statusBadge(request.status)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function conditionsPage() {
  return `${heading('Condition & incidents', 'A timestamped trail for item condition, damage, and missing equipment.', `<button class="primary-btn" data-action="report-incident">${icon('plus')} Report incident</button>`)}<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Condition log</h2><p>Every update keeps the inventory accountable.</p></div><span class="mono" style="font-size:10px;color:var(--muted)">${conditionLogs.length} recent entries</span></div><div class="panel-body"><div class="activity-list">${conditionLogs.map((log) => `<div class="activity-row"><span class="activity-dot ${log.condition === 'Damaged' ? 'danger' : log.condition === 'Needs Repair' ? 'warn' : ''}"></span><div class="activity-copy"><strong>${escapeHtml(log.equipment)} · ${statusBadge(log.condition)}</strong><span>${escapeHtml(log.note)}</span><span style="font-size:10px;color:var(--muted-2);margin-top:5px">${escapeHtml(log.updatedBy)} · ${escapeHtml(log.timestamp)}</span></div></div>`).join('')}</div></div></section><section class="panel"><div class="panel-head"><div><h2>Incident reports</h2><p>Damage or missing items linked to a borrowing record.</p></div></div><div class="panel-body"><div class="incident-list">${incidentReports.map((incident) => `<div class="incident"><div class="incident-icon">${incident.type === 'Missing' ? '?' : icon('alert')}</div><div class="incident-copy"><strong>${incident.type} · ${escapeHtml(incident.equipment)}</strong><span>${escapeHtml(incident.requester)} · ${escapeHtml(incident.when)}</span><span>${escapeHtml(incident.note)}</span></div><button class="icon-action" data-action="open-incident">${icon('arrow')}</button></div>`).join('')}</div><button class="secondary-btn full" style="margin-top:15px" data-action="report-incident">${icon('plus')} Add incident report</button></div></section></div>`;
}

function renderModal() {
  if (!state.modal) return '';
  if (state.modal.type === 'equipment') return equipmentModal(state.modal.id);
  if (state.modal.type === 'request') return requestModal(state.modal.id);
  if (state.modal.type === 'reject') return rejectModal(state.modal.id);
  if (state.modal.type === 'return') return returnModal(state.modal.id);
  if (state.modal.type === 'equipment-form') return equipmentFormModal(state.modal.id);
  if (state.modal.type === 'incident') return incidentModal();
  if (state.modal.type === 'help') return helpModal();
  return '';
}

function modalFrame(title, subtitle, body, footer = '', wide = false) {
  return `<div class="modal-backdrop" data-close-modal><div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><div class="modal-head"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="modal-close" data-action="close-modal">${icon('close')}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-foot">${footer}</div>` : ''}</div></div>`;
}

function equipmentModal(id) {
  const item = equipmentById(id);
  if (!item) return '';
  const availability = getAvailabilityLabel(item);
  return modalFrame('Equipment details', `${item.id} · ${item.location}`, `<div class="detail-hero"><div class="detail-visual">${item.symbol}</div><div class="detail-hero-copy"><span class="equipment-category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></div></div><div class="detail-metrics"><div class="detail-metric"><span>Availability</span><strong>${statusBadge(availability)}</strong></div><div class="detail-metric"><span>Units available</span><strong>${item.available} <span style="font-size:11px;color:var(--muted);font-weight:400">of ${item.total}</span></strong></div><div class="detail-metric"><span>Condition</span><strong>${escapeHtml(item.condition)}</strong></div></div><div style="background:#f8fbfb;border-radius:10px;padding:13px;font-size:11px;color:var(--muted);line-height:1.5"><strong style="color:var(--ink);display:block;margin-bottom:4px">Lab location</strong>${icon('location')} ${escapeHtml(item.location)} · Equipment desk checkout required</div>`, `<button class="secondary-btn" data-action="close-modal">Close</button>${item.available > 0 && requesterRole() ? `<button class="primary-btn" data-request-equipment="${item.id}">${icon('request')} Request this item</button>` : ''}`);
}

function requestModal(id) {
  const request = state.requests.find((item) => item.id === id);
  if (!request) return '';
  return modalFrame(`Request ${request.id}`, `${request.requester} · ${request.requesterRole}`, `<div class="request-card" style="box-shadow:none;padding:0;border:0"><div class="request-card-top"><div><div class="request-id">${request.id} · submitted ${shortFmt.format(new Date(request.submittedAt))}</div><h3>${escapeHtml(request.purpose)}</h3><p class="request-card-sub">${escapeHtml(requestItemsLabel(request))}</p></div>${statusBadge(request.status)}</div><div class="timeline">${['Pending', 'Approved', 'Released', 'Returned'].map((step, index) => `<div class="timeline-step ${index < ({ Pending: 0, Approved: 1, Released: 2, Overdue: 2, Returned: 3, Rejected: 1 }[request.status] ?? 0) || request.status === 'Returned' && index === 3 ? 'done' : index === ({ Pending: 0, Approved: 1, Released: 2, Overdue: 2, Returned: 3, Rejected: 1 }[request.status] ?? 0) ? 'current' : ''}">${step}</div>`).join('')}</div><div class="request-meta" style="margin-top:20px"><span>Borrow date<strong>${moneylessDate(request.borrowDate)}</strong></span><span>Expected return<strong>${moneylessDate(request.dueDate)}</strong></span><span>Reviewed by<strong>${request.reviewer || 'Pending review'}</strong></span></div>${request.rejectionReason ? `<div class="request-note" style="margin-top:18px">${escapeHtml(request.rejectionReason)}</div>` : ''}</div>`, `<button class="secondary-btn" data-action="close-modal">Close</button>${request.status === 'Pending' && request.requesterId === currentUser().id ? `<button class="danger-btn" data-cancel-request="${request.id}">Cancel request</button>` : ''}`);
}

function rejectModal(id) {
  const request = state.requests.find((item) => item.id === id);
  return modalFrame('Reject request', `${request?.id || ''} · this reason will be visible to the requester`, `<form data-form="reject" data-request-id="${id}"><div class="field"><label class="field-label" for="rejection-reason">Reason <span style="font-weight:400;color:var(--muted)">(optional but helpful)</span></label><textarea id="rejection-reason" name="reason" required placeholder="Explain what needs to change or why the request cannot be fulfilled..."></textarea></div><div style="padding:12px;border-radius:9px;background:var(--amber-soft);color:#8b651e;font-size:11px;line-height:1.45">Rejecting returns the requested inventory to the available pool and notifies the requester.</div><div class="form-actions" style="margin-top:19px"><button class="secondary-btn" type="button" data-action="close-modal">Keep reviewing</button><button class="danger-btn" type="submit">Reject request</button></div></form>`);
}

function returnModal(id) {
  const request = state.requests.find((item) => item.id === id);
  return modalFrame('Process return', `${request?.id || ''} · ${request?.requester || ''}`, `<form data-form="return" data-request-id="${id}"><div style="padding:13px;border-radius:10px;background:#f8fbfb;margin-bottom:18px;font-size:11px;color:var(--muted)"><strong style="color:var(--ink);display:block;margin-bottom:4px">Items expected</strong>${escapeHtml(requestItemsLabel(request))}</div><div class="form-grid"><div class="field"><label class="field-label" for="return-date">Return date</label><input id="return-date" name="returnedAt" type="date" value="2026-11-06" required /></div><div class="field"><label class="field-label" for="return-condition">Returned condition</label><select id="return-condition" name="condition"><option>Good</option><option>Fair</option><option>Needs Repair</option><option>Damaged</option></select></div><div class="field full-width"><label class="field-label" for="return-note">Check-in note</label><textarea id="return-note" name="note" placeholder="Mention missing accessories, wear, or damage..."></textarea></div></div><div class="form-actions" style="margin-top:4px"><button class="secondary-btn" type="button" data-action="close-modal">Cancel</button><button class="primary-btn" type="submit">${icon('return')} Complete return</button></div></form>`);
}

function equipmentFormModal(id = '') {
  const item = id ? equipmentById(id) : { name: '', category: 'Electronics', description: '', total: 1, available: 1, condition: 'Good', status: 'Available', location: '', symbol: '□' };
  const title = id ? 'Edit equipment' : 'Add equipment';
  return modalFrame(title, id ? `${item.id} · update inventory details` : 'Add a new item to the lab inventory', `<form data-form="equipment" data-equipment-id="${id}"><div class="form-grid"><div class="field full-width"><label class="field-label">Equipment name</label><input name="name" required value="${escapeHtml(item.name)}" placeholder="e.g. USB Logic Analyzer" /></div><div class="field"><label class="field-label">Category</label><select name="category">${['Electronics', 'Measuring Instruments', 'Microcontrollers', 'Tools', 'Networking'].map((cat) => `<option ${cat === item.category ? 'selected' : ''}>${cat}</option>`).join('')}</select></div><div class="field"><label class="field-label">Location</label><input name="location" required value="${escapeHtml(item.location)}" placeholder="Cabinet A · Shelf 01" /></div><div class="field"><label class="field-label">Total quantity</label><input name="total" type="number" min="1" value="${item.total}" required /></div><div class="field"><label class="field-label">Available quantity</label><input name="available" type="number" min="0" value="${item.available}" required /></div><div class="field"><label class="field-label">Condition</label><select name="condition">${['Good', 'Fair', 'Needs Repair', 'Damaged'].map((condition) => `<option ${condition === item.condition ? 'selected' : ''}>${condition}</option>`).join('')}</select></div><div class="field"><label class="field-label">Status</label><select name="status">${['Available', 'Reserved', 'Borrowed', 'Under Maintenance', 'Damaged', 'Missing'].map((status) => `<option ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}</select></div><div class="field full-width"><label class="field-label">Description</label><textarea name="description" required>${escapeHtml(item.description)}</textarea></div></div><div class="form-actions" style="margin-top:17px"><button class="secondary-btn" type="button" data-action="close-modal">Cancel</button><button class="primary-btn" type="submit">${id ? 'Save changes' : 'Add equipment'}</button></div></form>`);
}

function incidentModal() {
  return modalFrame('Report an incident', 'Link a damage or missing report to an equipment record.', `<form data-form="incident"><div class="form-grid"><div class="field"><label class="field-label">Equipment</label><select name="equipment">${state.equipment.map((item) => `<option>${escapeHtml(item.name)}</option>`).join('')}</select></div><div class="field"><label class="field-label">Incident type</label><select name="type"><option>Damaged</option><option>Missing</option></select></div><div class="field full-width"><label class="field-label">Notes</label><textarea name="note" required placeholder="Describe what happened and any relevant request ID..."></textarea></div></div><div class="form-actions" style="margin-top:17px"><button class="secondary-btn" type="button" data-action="close-modal">Cancel</button><button class="danger-btn" type="submit">Save incident report</button></div></form>`);
}

function helpModal() {
  return modalFrame('Workspace guide', 'A quick orientation for the LabTrack frontend preview.', `<div class="activity-list"><div class="activity-row"><span class="activity-dot"></span><div class="activity-copy"><strong>Requesters start in the catalog</strong><span>Find equipment, check the availability label, and submit a request. The timeline on My Requests keeps every handoff visible.</span></div></div><div class="activity-row"><span class="activity-dot warn"></span><div class="activity-copy"><strong>Staff own the handoffs</strong><span>Approve or reject requests, release approved equipment, then process returns and record condition changes.</span></div></div><div class="activity-row"><span class="activity-dot danger"></span><div class="activity-copy"><strong>Supabase is the next layer</strong><span>This preview uses local mock state. The adapter boundary and README describe where Auth, RLS, atomic quantity updates, and scheduled overdue checks connect.</span></div></div></div>`, `<button class="primary-btn" data-action="close-modal">Got it</button>`);
}

function showToast(title, message) {
  state.toasts = [...state.toasts, { title, message, id: Date.now() }].slice(-3);
  render();
  setTimeout(() => { state.toasts = state.toasts.slice(1); render(); }, 3600);
}

function render() {
  document.querySelector('#root').innerHTML = state.authenticated ? renderAppShell() : renderLogin();
}

function startDemo(roleKey) {
  state.roleKey = roleKey;
  state.authenticated = true;
  state.page = roleKey === 'staff' ? 'staff-dashboard' : 'dashboard';
  state.modal = null;
  render();
  showToast(`Signed in as ${users[roleKey].role}`, `Demo session ready for ${users[roleKey].name}.`);
}

function exportCsv() {
  const rows = [['Request ID', 'Borrower', 'Role', 'Equipment', 'Borrow date', 'Due date', 'Status'], ...state.requests.map((request) => [request.id, request.requester, request.requesterRole, requestItemsLabel(request), request.borrowDate, request.dueDate, request.status])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'labtrack-records.csv'; anchor.click(); URL.revokeObjectURL(url);
  showToast('CSV exported', 'Your current borrowing records are ready to download.');
}

function handleClick(event) {
  const target = event.target.closest('button, [data-open-request], [data-open-equipment], [data-close-modal]');
  if (!target) return;
  if (target.hasAttribute('data-close-modal')) { state.modal = null; render(); return; }
  if (target.dataset.page) { state.page = target.dataset.page; state.sidebarOpen = false; state.modal = null; if (target.dataset.page !== 'request') state.prefillEquipment = ''; render(); return; }
  if (target.dataset.demoRole) { startDemo(target.dataset.demoRole); return; }
  if (target.dataset.openEquipment) { state.modal = { type: 'equipment', id: target.dataset.openEquipment }; render(); return; }
  if (target.dataset.openRequest) { state.modal = { type: 'request', id: target.dataset.openRequest }; render(); return; }
  if (target.dataset.requestEquipment) { state.modal = null; state.prefillEquipment = target.dataset.requestEquipment; state.page = 'request'; render(); return; }
  if (target.dataset.cancelRequest) {
    const request = state.requests.find((item) => item.id === target.dataset.cancelRequest);
    if (request) { request.status = 'Cancelled'; state.modal = null; render(); showToast('Request cancelled', `${request.id} is no longer in the review queue.`); }
    return;
  }
  if (target.dataset.approveRequest) {
    const request = state.requests.find((item) => item.id === target.dataset.approveRequest);
    if (request) { request.status = 'Approved'; request.reviewer = currentUser().name; state.modal = null; render(); showToast('Request approved', `${request.id} is ready for release.`); }
    return;
  }
  if (target.dataset.rejectRequest) { state.modal = { type: 'reject', id: target.dataset.rejectRequest }; render(); return; }
  if (target.dataset.releaseRequest) { const request = state.requests.find((item) => item.id === target.dataset.releaseRequest); if (request) { request.status = 'Released'; request.releasedAt = '2026-11-06'; request.releasedBy = currentUser().name; request.items.forEach((entry) => { const equipment = equipmentById(entry.equipmentId); if (equipment) { equipment.available = Math.max(0, equipment.available - entry.quantity); equipment.status = equipment.available ? 'Borrowed' : 'Borrowed'; } }); render(); showToast('Equipment released', `${request.id} is now marked as borrowed.`); } return; }
  if (target.dataset.returnRequest) { state.modal = { type: 'return', id: target.dataset.returnRequest }; render(); return; }
  if (target.dataset.editEquipment) { state.modal = { type: 'equipment-form', id: target.dataset.editEquipment }; render(); return; }
  if (target.dataset.archiveEquipment) { const equipment = equipmentById(target.dataset.archiveEquipment); if (equipment) { state.equipment = state.equipment.filter((item) => item.id !== equipment.id); render(); showToast('Equipment archived', `${equipment.name} was removed from the active catalog.`); } return; }
  if (target.dataset.action === 'add-equipment') { state.modal = { type: 'equipment-form' }; render(); return; }
  if (target.dataset.action === 'report-incident') { state.modal = { type: 'incident' }; render(); return; }
  if (target.dataset.action === 'export-csv') { exportCsv(); return; }
  if (target.dataset.action === 'close-modal') { state.modal = null; render(); return; }
  if (target.dataset.action === 'toggle-sidebar') { state.sidebarOpen = !state.sidebarOpen; render(); return; }
  if (target.dataset.action === 'clear-filters') { state.search = ''; state.catalogCategory = 'All categories'; state.availability = 'All availability'; render(); return; }
  if (target.dataset.action === 'mark-read') { showToast('Inbox cleared', 'All visible notifications are marked as read.'); return; }
  if (target.dataset.action === 'open-help') { state.modal = { type: 'help' }; render(); return; }
  if (target.dataset.action === 'logout') { state.authenticated = false; state.modal = null; render(); return; }
  if (target.dataset.action === 'contact-borrower') { showToast('Follow-up queued', 'A reminder message is ready for the borrower.'); return; }
  if (target.dataset.action === 'refresh') { showToast('Queue refreshed', 'The mock workspace is already up to date.'); return; }
  if (target.dataset.action === 'quick-search') { state.search = document.querySelector('[data-quick-search]')?.value || ''; state.page = 'catalog'; render(); return; }
}

function handleSubmit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.form === 'login') { startDemo(state.roleKey); return; }
  if (form.dataset.form === 'request') {
    const item = equipmentById(data.equipmentId);
    const quantity = Number(data.quantity);
    if (!item || quantity > item.available) { showToast('Quantity unavailable', `Only ${item?.available || 0} unit(s) are currently available.`); return; }
    const nextId = `REQ-${1050 + state.requests.length}`;
    state.requests.unshift({ id: nextId, requesterId: currentUser().id, requester: currentUser().name, requesterRole: currentUser().role, purpose: data.purpose, borrowDate: data.borrowDate, dueDate: data.dueDate, status: 'Pending', items: [{ equipmentId: item.id, quantity }], submittedAt: '2026-11-06', reviewer: null, rejectionReason: null });
    state.page = 'requests'; render(); showToast('Request submitted', `${nextId} is now waiting for staff review.`); return;
  }
  if (form.dataset.form === 'reject') {
    const request = state.requests.find((item) => item.id === form.dataset.requestId);
    if (request) { request.status = 'Rejected'; request.reviewer = currentUser().name; request.rejectionReason = data.reason; state.modal = null; render(); showToast('Request rejected', `${request.id} was updated with the review reason.`); }
    return;
  }
  if (form.dataset.form === 'return') {
    const request = state.requests.find((item) => item.id === form.dataset.requestId);
    if (request) { request.status = 'Returned'; request.returnedAt = data.returnedAt; request.returnedCondition = data.condition; request.receivedBy = currentUser().name; request.items.forEach((entry) => { const equipment = equipmentById(entry.equipmentId); if (equipment && data.condition !== 'Damaged') { equipment.available += entry.quantity; equipment.status = 'Available'; } }); state.modal = null; render(); showToast('Return processed', `${request.id} is closed with a ${data.condition.toLowerCase()} condition.`); }
    return;
  }
  if (form.dataset.form === 'equipment') {
    if (form.dataset.equipmentId) {
      const equipment = equipmentById(form.dataset.equipmentId);
      if (equipment) Object.assign(equipment, { name: data.name, category: data.category, description: data.description, total: Number(data.total), available: Number(data.available), condition: data.condition, status: data.status, location: data.location });
      showToast('Equipment updated', `${data.name} now reflects the latest inventory details.`);
    } else {
      state.equipment.push({ id: `eq-${String(state.equipment.length + 1).padStart(3, '0')}`, name: data.name, category: data.category, description: data.description, total: Number(data.total), available: Number(data.available), condition: data.condition, status: data.status, location: data.location, symbol: '□' });
      showToast('Equipment added', `${data.name} is now in the active catalog.`);
    }
    state.modal = null; render(); return;
  }
  if (form.dataset.form === 'incident') { state.modal = null; render(); showToast('Incident report saved', 'The condition log will keep this report attached to the workspace.'); }
}

function handleInput(event) {
  if (event.target.matches('[data-catalog-search]')) { state.search = event.target.value; render(); const input = document.querySelector('[data-catalog-search]'); input?.focus(); input?.setSelectionRange(state.search.length, state.search.length); }
  if (event.target.matches('[data-filter-category]')) { state.catalogCategory = event.target.value; render(); }
  if (event.target.matches('[data-filter-availability]')) { state.availability = event.target.value; render(); }
  if (event.target.matches('#request-equipment')) { const item = equipmentById(event.target.value); const quantity = document.querySelector('#request-quantity'); if (quantity) { quantity.max = item.available; quantity.value = Math.min(Number(quantity.value), item.available); } const hint = document.querySelector('#available-hint'); if (hint) hint.textContent = `${item.available} units`; }
}

document.addEventListener('click', handleClick);
document.addEventListener('submit', handleSubmit);
document.addEventListener('input', handleInput);
document.addEventListener('change', handleInput);

// Make the future backend boundary visible during development without requiring credentials.
window.labtrack = { supabaseAdapter, supabaseConfig, state };
render();
