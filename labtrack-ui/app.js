import { supabaseAdapter, supabaseConfig } from './supabase-adapter.js';

const today = new Date();
const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const moneylessDate = (date) => fmt.format(new Date(date));
const initials = (name) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const slug = (value) => String(value).toLowerCase().replaceAll(' ', '-');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const entryPage = document.body.dataset.page || '';


const state = {
  authenticated: false,
  profile: null,
  loading: true,
  error: '',
  page: entryPage || 'dashboard',
  search: '',
  catalogCategory: 'All categories',
  availability: 'All availability',
  prefillEquipment: '',
  modal: null,
  sidebarOpen: false,
  equipment: [], requests: [], conditionLogs: [], incidentReports: [], notifications: [], roleRequests: [], toasts: [],
};

const currentUser = () => state.profile || { id: '', name: '', email: '', role: 'Student', department: '' };
const requesterRole = () => !['staff', 'laboratory personnel', 'admin'].includes(String(currentUser().role).toLowerCase());
const adminRole = () => String(currentUser().role).toLowerCase() === 'admin';
const visibleRequests = () => requesterRole() ? state.requests.filter((request) => request.requesterId === currentUser().id) : state.requests;
const equipmentById = (id) => state.equipment.find((item) => item.id === id);
const requestItemsLabel = (request) => request.items.map((item) => `${equipmentById(item.equipmentId)?.name || 'Equipment'} × ${item.quantity}`).join(', ');
const getAvailabilityLabel = (item) => item.available === 0 ? 'Unavailable' : item.available <= Math.ceil(item.total * .35) ? 'Limited' : 'Available';
const effectiveStatus = (request) => request.status;
const pageLabel = () => ({ dashboard: 'Dashboard', catalog: 'Equipment catalog', request: 'New request', requests: 'My requests', history: 'My history', notifications: 'Notifications', 'staff-dashboard': 'Staff dashboard', queue: 'Request queue', equipment: 'Equipment management', processing: 'Release & return', overdue: 'Overdue monitor', records: 'Records & reports', conditions: 'Condition & incidents', 'admin-approvals': 'Role approvals' }[state.page] || 'Dashboard');

const icon = (name) => ({
  grid: '▦', box: '□', request: '↗', clock: '◷', history: '↻', bell: '◌', dashboard: '⌂', users: '♙', settings: '⚙', search: '⌕', plus: '+', download: '↓', edit: '✎', archive: '⌫', arrow: '→', close: '×', check: '✓', alert: '!', clipboard: '▤', return: '↩', report: '◈', log: '≡', filter: '≡', menu: '☰', lock: '⌑', calendar: '□', location: '⌖', bolt: 'ϟ', eye: '◉'
}[name] || '•');

function statusBadge(status) {
  return `<span class="badge ${slug(status)}">${escapeHtml(status)}</span>`;
}

function renderLogin() {
  return `<div class="login-screen"><section class="login-intro"><div class="brand-lockup"><div class="brand-mark">LT</div><div class="brand-name">Lab<span>Track</span></div></div><div class="intro-copy"><p class="eyebrow">Laboratory operations</p><h1>Keep every<br /><em>borrowed thing</em><br />accountable.</h1><p>Sign in with your LabTrack account to access live laboratory inventory and borrowing records.</p></div><div class="mini-signal"><span><i></i> Live inventory</span><span><i></i> Supabase connected</span></div></section><section class="login-panel"><div class="login-card"><p class="eyebrow" style="color:var(--teal);">LabTrack workspace</p><h2>Sign in to your lab.</h2><p class="subcopy">Use your account credentials. Your role and access are managed by your institution.</p><div id="auth-feedback" class="auth-feedback" role="status" aria-live="polite" hidden></div><form data-form="login"><div class="field"><label class="field-label" for="email">Email</label><div class="input-with-icon"><input id="email" name="email" type="email" autocomplete="username" required /><span class="input-icon">@</span></div></div><div class="field"><label class="field-label" for="password">Password</label><div class="input-with-icon"><input id="password" name="password" type="password" autocomplete="current-password" required /><span class="input-icon">${icon('lock')}</span></div></div><button class="primary-btn full" type="submit">Sign in <span>${icon('arrow')}</span></button></form><div class="login-divider">New to LabTrack?</div><form data-form="signup"><div class="field"><label class="field-label" for="signup-name">Full name</label><input id="signup-name" name="name" autocomplete="name" required /></div><div class="field"><label class="field-label" for="signup-email">Email</label><input id="signup-email" name="email" type="email" autocomplete="email" required /></div><div class="field"><label class="field-label" for="signup-password">Password</label><input id="signup-password" name="password" type="password" minlength="8" autocomplete="new-password" required /></div><div class="field"><label class="field-label" for="signup-role">Account access</label><select id="signup-role" name="requestedRole"><option value="Student">Student</option><option value="Faculty">Request Faculty access</option><option value="Laboratory Personnel">Request Laboratory Personnel access</option></select><small class="field-hint" style="display:block;margin-top:6px;color:var(--muted);font-size:10px">Faculty and lab access remain Student until an Admin approves the request.</small></div><button class="secondary-btn full" type="submit">Create account</button></form><p class="login-footnote">Staff access is assigned by an administrator. Data access is protected by Supabase RLS.</p></div></section></div>`;
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
      ${adminRole() ? `<div class="nav-separator"></div>${navItem('admin-approvals', 'Role approvals', 'users')}` : ''}
    </nav>`;
}

function renderMobileDock() {
  const items = requesterRole()
    ? [['dashboard', 'Home', 'dashboard'], ['catalog', 'Catalog', 'box'], ['request', 'Request', 'request'], ['requests', 'Requests', 'clock'], ['notifications', 'Alerts', 'bell']]
    : adminRole() ? [['staff-dashboard', 'Overview', 'dashboard'], ['admin-approvals', 'Approvals', 'users'], ['queue', 'Queue', 'clock'], ['equipment', 'Equipment', 'box'], ['conditions', 'Log', 'log']] : [['staff-dashboard', 'Overview', 'dashboard'], ['queue', 'Queue', 'clock'], ['equipment', 'Equipment', 'box'], ['processing', 'Desk', 'return'], ['conditions', 'Log', 'log']];
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
  if (state.page === 'admin-approvals') return adminRole() ? adminApprovalsPage() : `<section class="panel"><div class="empty-state"><h3>Admin access required</h3><p>Only an administrator can review role requests.</p></div></section>`;
  return requesterRole() ? requesterDashboard() : staffDashboard();
}

function adminApprovalsPage() {
  const rows=state.roleRequests||[];
  const body=rows.length?`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Applicant</th><th>Requested access</th><th>Request date</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="table-primary">${escapeHtml(r.display_name||'Unnamed applicant')}</span><span class="table-secondary">${escapeHtml(r.email||'No email on profile')}</span><span class="table-secondary">ID: ${escapeHtml(r.id)}</span></td><td>${statusBadge(r.requested_role)}</td><td>${r.created_at?shortFmt.format(new Date(r.created_at)): '—'}</td><td><div class="approval-actions"><button class="primary-btn" data-approve-role="${escapeHtml(r.id)}">Approve</button><button class="danger-btn" data-reject-role="${escapeHtml(r.id)}">Reject</button></div></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><div class="empty-symbol">${icon('check')}</div><h3>No pending role requests</h3><p>New Faculty and Laboratory Personnel requests will appear here.</p></div>`;
  return `${heading('Role approvals','Review access requests. Applicants keep Student access until approved.',`<button class="secondary-btn" data-action="refresh">Refresh</button>`)}<section class="panel"><div class="panel-head"><div><h2>Pending requests</h2><p>${rows.length} request${rows.length===1?'':'s'} awaiting review</p></div><span class="badge pending">Admin only</span></div>${body}</section>`;
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
  const dueSoon = active.filter((r) => new Date(r.dueDate) >= new Date(new Date().toDateString()) && new Date(r.dueDate) <= new Date(Date.now()+2*86400000)).length;
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
  return `${heading('New borrowing request', 'Tell the lab team what you need and when you’ll bring it back.', `<button class="secondary-btn" data-page="catalog">${icon('box')} Browse catalog</button>`)}<section class="panel"><div class="panel-head"><div><h2>Request details</h2><p>Quantities are checked against the current available inventory.</p></div><span class="badge available">Supabase-ready form</span></div><div class="panel-body"><form class="form-grid" data-form="request"><div class="form-section-title">What do you need?</div><div class="field full-width"><label class="field-label" for="request-equipment">Equipment</label><select id="request-equipment" name="equipmentId">${optionList}</select></div><div class="field"><label class="field-label" for="request-quantity">Quantity</label><input id="request-quantity" name="quantity" type="number" min="1" max="${chosen?.available || 1}" value="1" /><small class="field-hint" style="display:block;margin-top:7px;color:var(--muted);font-size:10px">Available now: <strong id="available-hint">${chosen?.available || 0} units</strong></small></div><div class="field"><label class="field-label" for="request-purpose">Purpose</label><input id="request-purpose" name="purpose" required placeholder="e.g. ECE 304 · signal lab" /></div><div class="form-section-title">When do you need it?</div><div class="field"><label class="field-label" for="borrow-date">Borrow date</label><input id="borrow-date" name="borrowDate" type="date" value="${new Date().toISOString().slice(0,10)}" required /></div><div class="field"><label class="field-label" for="due-date">Expected return date</label><input id="due-date" name="dueDate" type="date" value="${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}" required /></div><div class="field full-width"><label class="field-label" for="request-notes">Notes for the lab team <span style="font-weight:400;color:var(--muted)">(optional)</span></label><textarea id="request-notes" name="notes" placeholder="Add a class, project, or handling note..."></textarea></div><div class="form-actions full-width"><button class="secondary-btn" type="button" data-page="catalog">Cancel</button><button class="primary-btn" type="submit">Submit request ${icon('arrow')}</button></div></form></div></section>`;
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
  const unread=state.notifications.filter(n=>!n.read_at).length;
  return `${heading('Notifications','A live inbox for due dates, approvals, and lab updates.',`<button class="secondary-btn" data-action="mark-read">Mark all read</button>`)}<section class="panel"><div class="panel-head"><div><h2>Inbox</h2><p>${unread} unread message${unread===1?'':'s'}</p></div><span class="badge pending">${unread} unread</span></div><div class="panel-body">${notificationList()}</div></section>`;
}
function notificationList() {
  const list=state.notifications;
  return list.length ? `<div class="activity-list">${list.map(n=>`<div class="activity-row"><span class="activity-dot ${n.type==='danger'?'danger':n.type==='warning'?'warn':''}"></span><div class="activity-copy"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.body)}</span></div><span class="activity-time">${escapeHtml(n.created_at?shortFmt.format(new Date(n.created_at)):'')}</span></div>`).join('')}</div>` : `<div class="empty-state"><h3>No notifications yet</h3><p>Updates about requests and due dates will appear here.</p></div>`;
}

function staffDashboard() {
  const pending = state.requests.filter((r) => r.status === 'Pending').length;
  const borrowed = state.requests.filter((r) => ['Released', 'Overdue'].includes(r.status)).length;
  const overdue = state.requests.filter((r) => r.status === 'Overdue').length;
  const damaged = state.equipment.filter((e) => ['Damaged', 'Missing'].includes(e.status)).length;
  const available = state.equipment.filter((e) => e.available > 0).length;
  const reserved=state.equipment.filter(e=>e.status==='Reserved').length, maintenance=state.equipment.filter(e=>e.status==='Under Maintenance').length;
  const totalUnits=state.equipment.reduce((n,e)=>n+Number(e.total||0),0), availableUnits=state.equipment.reduce((n,e)=>n+Number(e.available||0),0);
  const pct=(n)=>totalUnits?Math.round(100*n/totalUnits):0;
  const todayStr=new Date().toISOString().slice(0,10);
  const todayReleases=state.requests.filter(r=>r.status==='Approved'&&r.borrowDate===todayStr).length;
  const dueToday=state.requests.filter(r=>['Released','Overdue'].includes(r.status)&&r.dueDate===todayStr).length;
  const checkedOut=state.requests.filter(r=>['Released','Overdue'].includes(r.status)).reduce((n,r)=>n+r.items.reduce((m,i)=>m+i.quantity,0),0);
  return `${heading('Operations overview', 'A quick read on requests, inventory health, and what needs a human decision.', `<button class="primary-btn" data-page="queue">${icon('clock')} Open request queue</button>`)}<div class="stats-grid">${statCard('Pending requests', pending, '<strong>Awaiting staff review</strong>', 'clock', 'amber')}${statCard('Currently borrowed', borrowed, 'Across active records', 'box', 'violet')}${statCard('Overdue items', overdue, '<strong>Follow-up required</strong>', 'alert', 'alert')}${statCard('Available equipment', available, `${state.equipment.length} tracked items`, 'check')}</div><div class="health-grid"><section class="panel"><div class="panel-head"><div><h2>Inventory health</h2><p>Quantity and condition snapshot across the equipment room.</p></div><button class="section-link" data-page="equipment">Manage inventory ${icon('arrow')}</button></div><div class="panel-body"><div class="chart"><div class="chart-row"><label>Available</label><div class="bar-track"><div class="bar-fill" style="width:${pct(availableUnits)}%"></div></div><strong>${available}</strong></div><div class="chart-row"><label>Reserved</label><div class="bar-track"><div class="bar-fill" style="width:34%;background:linear-gradient(90deg,var(--amber),#f1c969)"></div></div><strong>${reserved}</strong></div><div class="chart-row"><label>Maintenance</label><div class="bar-track"><div class="bar-fill" style="width:${pct(maintenance)}%;background:linear-gradient(90deg,var(--violet),#b6acec)"></div></div><strong>${maintenance}</strong></div><div class="chart-row"><label>Damaged</label><div class="bar-track"><div class="bar-fill" style="width:${pct(damaged)}%;background:linear-gradient(90deg,var(--coral),#efad99)"></div></div><strong>${damaged}</strong></div></div><div style="display:flex;gap:14px;margin-top:24px;flex-wrap:wrap"><span style="font-size:10px;color:var(--muted)"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--teal);margin-right:5px"></i>Healthy stock</span><span style="font-size:10px;color:var(--muted)"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--coral);margin-right:5px"></i>Needs attention</span></div></div></section><section class="panel"><div class="panel-head"><div><h2>Recent incidents</h2><p>Damage and missing-item reports.</p></div><button class="section-link" data-page="conditions">View log ${icon('arrow')}</button></div><div class="panel-body"><div class="incident-list">${state.incidentReports.map((incident) => `<div class="incident"><div class="incident-icon">${incident.type === 'Missing' ? '?' : icon('alert')}</div><div class="incident-copy"><strong>${incident.type} · ${incident.equipment}</strong><span>${incident.requester} · ${incident.when}</span><span>${incident.note}</span></div></div>`).join('')}</div></div></section></div><div class="dashboard-grid" style="margin-top:18px"><section class="panel"><div class="panel-head"><div><h2>Requests needing attention</h2><p>Oldest open decisions first.</p></div><button class="section-link" data-page="queue">Open queue</button></div><div class="panel-body">${recentRequestsTable(state.requests.filter((r) => ['Pending', 'Approved', 'Overdue'].includes(r.status)).slice(0, 4))}</div></section><section class="panel"><div class="panel-head"><div><h2>Today’s desk</h2><p>Release and return workload.</p></div></div><div class="panel-body"><div class="metric-ribbon" style="padding:0;background:transparent;border:0;display:grid;gap:13px"><div class="metric-ribbon-item"><b>${todayReleases}</b><span>releases due today</span></div><div class="metric-ribbon-item"><b>${dueToday}</b><span>returns due today</span></div><div class="metric-ribbon-item"><b>${checkedOut}</b><span>units checked out</span></div></div></div></section></div>`;
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
  return `${heading('Overdue monitor', 'Follow up on borrowed items that have passed their expected return date.', `<button class="secondary-btn" data-action="export-csv">${icon('download')} Export list</button>`)}<section class="panel"><div class="metric-ribbon"><div class="metric-ribbon-item"><b style="color:var(--coral)">${overdue.length}</b><span>overdue records</span></div><div class="metric-ribbon-item"><b>${overdue.reduce((sum, r) => sum + r.items.reduce((total, item) => total + item.quantity, 0), 0)}</b><span>units outstanding</span></div><div class="metric-ribbon-item"><b>${overdue.length ? (overdue.reduce((sum,r)=>sum+Math.max(0,Math.floor((Date.now()-new Date(`${r.dueDate}T00:00:00`).getTime())/86400000)),0)/overdue.length).toFixed(1)+'d' : '0d'}</b><span>average days overdue</span></div></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Borrower</th><th>Equipment</th><th>Due date</th><th>Days overdue</th><th></th></tr></thead><tbody>${overdue.length ? overdue.map((request) => `<tr><td><span class="table-primary">${escapeHtml(request.requester)}</span><span class="table-secondary">${request.requesterRole} · ${request.id}</span></td><td>${escapeHtml(requestItemsLabel(request))}</td><td>${moneylessDate(request.dueDate)}</td><td><span class="badge overdue">${Math.max(0,Math.floor((Date.now()-new Date(`${request.dueDate}T00:00:00`).getTime())/86400000))} days</span></td><td><button class="secondary-btn" style="padding:7px 10px;font-size:10px" data-action="contact-borrower" data-request-id="${request.id}">Contact</button></td></tr>`).join('') : `<tr><td colspan="5">${emptyProcessing('No overdue borrowings', 'A clear overdue list is a good lab day.')}</td></tr>`}</tbody></table></div></section>`;
}

function recordsPage() {
  return `${heading('Records & reports', 'Searchable borrowing and return history for a transparent lab.', `<button class="primary-btn" data-action="export-csv">${icon('download')} Export CSV</button>`)}<section class="panel"><div class="staff-toolbar"><div class="search-wrap"><input class="search-input" data-records-search placeholder="Search borrower, item, or request ID" /></div><select><option>All statuses</option><option>Pending</option><option>Released</option><option>Returned</option><option>Overdue</option></select><select><option>All dates</option><option>Last 7 days</option><option>This month</option></select><span class="toolbar-spacer"></span><span class="filter-count">${state.requests.length} records</span></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Request</th><th>Borrower</th><th>Equipment</th><th>Borrowed</th><th>Returned</th><th>Status</th></tr></thead><tbody>${state.requests.map((request) => `<tr><td><span class="table-primary">${request.id}</span><span class="table-secondary">${request.purpose}</span></td><td>${escapeHtml(request.requester)}<span class="table-secondary">${request.requesterRole}</span></td><td>${escapeHtml(requestItemsLabel(request))}</td><td>${request.releasedAt ? moneylessDate(request.releasedAt) : '—'}</td><td>${request.returnedAt ? moneylessDate(request.returnedAt) : '—'}</td><td>${statusBadge(request.status)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function conditionsPage() {
  return `${heading('Condition & incidents', 'A timestamped trail for item condition, damage, and missing equipment.', `<button class="primary-btn" data-action="report-incident">${icon('plus')} Report incident</button>`)}<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Condition log</h2><p>Every update keeps the inventory accountable.</p></div><span class="mono" style="font-size:10px;color:var(--muted)">${state.conditionLogs.length} recent entries</span></div><div class="panel-body"><div class="activity-list">${state.conditionLogs.map((log) => `<div class="activity-row"><span class="activity-dot ${log.condition === 'Damaged' ? 'danger' : log.condition === 'Needs Repair' ? 'warn' : ''}"></span><div class="activity-copy"><strong>${escapeHtml(log.equipment)} · ${statusBadge(log.condition)}</strong><span>${escapeHtml(log.note)}</span><span style="font-size:10px;color:var(--muted-2);margin-top:5px">${escapeHtml(log.updatedBy)} · ${escapeHtml(log.timestamp)}</span></div></div>`).join('')}</div></div></section><section class="panel"><div class="panel-head"><div><h2>Incident reports</h2><p>Damage or missing items linked to a borrowing record.</p></div></div><div class="panel-body"><div class="incident-list">${state.incidentReports.map((incident) => `<div class="incident"><div class="incident-icon">${incident.type === 'Missing' ? '?' : icon('alert')}</div><div class="incident-copy"><strong>${incident.type} · ${escapeHtml(incident.equipment)}</strong><span>${escapeHtml(incident.requester)} · ${escapeHtml(incident.when)}</span><span>${escapeHtml(incident.note)}</span></div><button class="icon-action" data-action="open-incident">${icon('arrow')}</button></div>`).join('')}</div><button class="secondary-btn full" style="margin-top:15px" data-action="report-incident">${icon('plus')} Add incident report</button></div></section></div>`;
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
  return modalFrame('Process return', `${request?.id || ''} · ${request?.requester || ''}`, `<form data-form="return" data-request-id="${id}"><div style="padding:13px;border-radius:10px;background:#f8fbfb;margin-bottom:18px;font-size:11px;color:var(--muted)"><strong style="color:var(--ink);display:block;margin-bottom:4px">Items expected</strong>${escapeHtml(requestItemsLabel(request))}</div><div class="form-grid"><div class="field"><label class="field-label" for="return-date">Return date</label><input id="return-date" name="returnedAt" type="date" value="${new Date().toISOString().slice(0,10)}" required /></div><div class="field"><label class="field-label" for="return-condition">Returned condition</label><select id="return-condition" name="condition"><option>Good</option><option>Fair</option><option>Needs Repair</option><option>Damaged</option></select></div><div class="field full-width"><label class="field-label" for="return-note">Check-in note</label><textarea id="return-note" name="note" placeholder="Mention missing accessories, wear, or damage..."></textarea></div></div><div class="form-actions" style="margin-top:4px"><button class="secondary-btn" type="button" data-action="close-modal">Cancel</button><button class="primary-btn" type="submit">${icon('return')} Complete return</button></div></form>`);
}

function equipmentFormModal(id = '') {
  const item = id ? equipmentById(id) : { name: '', category: state.equipment[0]?.category || 'Other', description: '', total: 1, available: 1, condition: 'Good', status: 'Available', location: '', symbol: '□' };
  const title = id ? 'Edit equipment' : 'Add equipment';
  return modalFrame(title, id ? `${item.id} · update inventory details` : 'Add a new item to the lab inventory', `<form data-form="equipment" data-equipment-id="${id}"><div class="form-grid"><div class="field full-width"><label class="field-label">Equipment name</label><input name="name" required value="${escapeHtml(item.name)}" placeholder="e.g. USB Logic Analyzer" /></div><div class="field"><label class="field-label">Category</label><select name="category">${[...new Set([item.category,...state.equipment.map(e=>e.category)].filter(Boolean))].map((cat) => `<option ${cat === item.category ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}</select></div><div class="field"><label class="field-label">Location</label><input name="location" required value="${escapeHtml(item.location)}" placeholder="Cabinet A · Shelf 01" /></div><div class="field"><label class="field-label">Total quantity</label><input name="total" type="number" min="1" value="${item.total}" required /></div><div class="field"><label class="field-label">Available quantity</label><input name="available" type="number" min="0" value="${item.available}" required /></div><div class="field"><label class="field-label">Condition</label><select name="condition">${['Good', 'Fair', 'Needs Repair', 'Damaged'].map((condition) => `<option ${condition === item.condition ? 'selected' : ''}>${condition}</option>`).join('')}</select></div><div class="field"><label class="field-label">Status</label><select name="status">${['Available', 'Reserved', 'Borrowed', 'Under Maintenance', 'Damaged', 'Missing'].map((status) => `<option ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}</select></div><div class="field full-width"><label class="field-label">Description</label><textarea name="description" required>${escapeHtml(item.description)}</textarea></div></div><div class="form-actions" style="margin-top:17px"><button class="secondary-btn" type="button" data-action="close-modal">Cancel</button><button class="primary-btn" type="submit">${id ? 'Save changes' : 'Add equipment'}</button></div></form>`);
}

function incidentModal() {
  return modalFrame('Report an incident', 'Link a damage or missing report to an equipment record.', `<form data-form="incident"><div class="form-grid"><div class="field"><label class="field-label">Equipment</label><select name="equipment">${state.equipment.map((item) => `<option>${escapeHtml(item.name)}</option>`).join('')}</select></div><div class="field"><label class="field-label">Incident type</label><select name="type"><option>Damaged</option><option>Missing</option></select></div><div class="field full-width"><label class="field-label">Notes</label><textarea name="note" required placeholder="Describe what happened and any relevant request ID..."></textarea></div></div><div class="form-actions" style="margin-top:17px"><button class="secondary-btn" type="button" data-action="close-modal">Cancel</button><button class="danger-btn" type="submit">Save incident report</button></div></form>`);
}

function helpModal() {
  return modalFrame('Workspace guide', 'A quick orientation for your LabTrack workspace.', `<div class="activity-list"><div class="activity-row"><span class="activity-dot"></span><div class="activity-copy"><strong>Requesters start in the catalog</strong><span>Find equipment, check the availability label, and submit a request. The timeline on My Requests keeps every handoff visible.</span></div></div><div class="activity-row"><span class="activity-dot warn"></span><div class="activity-copy"><strong>Staff own the handoffs</strong><span>Approve or reject requests, release approved equipment, then process returns and record condition changes.</span></div></div><div class="activity-row"><span class="activity-dot danger"></span><div class="activity-copy"><strong>Your records are live</strong><span>Inventory, requests, and account access are loaded from Supabase. Database policies enforce which records your account can access.</span></div></div></div>`, `<button class="primary-btn" data-action="close-modal">Got it</button>`);
}

function setAuthFeedback(message, type = 'info') {
  const panel=document.querySelector('#auth-feedback');
  if(!panel) return;
  panel.hidden=!message; panel.textContent=message||''; panel.dataset.type=type;
}

function showToast(title, message) {
  state.toasts = [...state.toasts, { title, message, id: Date.now() }].slice(-3);
  render();
  setTimeout(() => { state.toasts = state.toasts.slice(1); render(); }, 3600);
}

function normalizeEquipmentRow(row, index) {
  return {
    id: row.id || `supabase-eq-${index + 1}`,
    name: row.name || row.title || 'Unnamed equipment',
    category: row.category || 'Other',
    description: row.description || 'Equipment record from Supabase.',
    total: Number(row.total ?? row.quantity ?? 0),
    available: Number(row.available ?? row.available_quantity ?? row.quantity ?? 0),
    condition: row.condition || 'Good',
    status: row.status || 'Available',
    location: row.location || 'Lab inventory',
    symbol: row.symbol || '□',
  };
}

function render() {
  document.querySelector('#root').innerHTML = state.loading ? '<main class="empty-state"><h2>Connecting to LabTrack…</h2></main>' : state.authenticated ? renderAppShell() : renderLogin();
}

async function enterWorkspace(session) {
  const profile = session?.profile || null;
  if (!session?.user || !profile) { state.authenticated=false; state.profile=null; state.loading=false; render(); return; }
  state.profile=profile; state.authenticated=true; state.loading=true;
  const isStaff=['staff','laboratory personnel','admin'].includes(String(profile.role).toLowerCase());
  if(adminRole()) state.page = entryPage && entryPage !== 'dashboard' ? entryPage : 'admin-approvals';
  else if(isStaff) state.page = ['staff-dashboard','queue','equipment','processing','overdue','records','conditions'].includes(entryPage)?entryPage:'staff-dashboard';
  else state.page = 'dashboard';
  await hydrateFromSupabase();
}
async function hydrateFromSupabase() {
  try {
    const [equipment, requests, logs, incidents, notifications, roleRequests] = await Promise.all([
      supabaseAdapter.listEquipment(), supabaseAdapter.listRequests({userId:currentUser().id,staff:!requesterRole()}),
      !requesterRole() ? supabaseAdapter.listConditionLogs() : Promise.resolve([]),
      !requesterRole() ? supabaseAdapter.listIncidents() : Promise.resolve([]),
      supabaseAdapter.listNotifications(currentUser().id),
      adminRole() ? supabaseAdapter.listRoleRequests() : Promise.resolve([])
    ]);
    state.equipment=(equipment||[]).map(normalizeEquipmentRow); state.requests=requests||[];
    state.conditionLogs=(logs||[]).map(r=>({id:r.id,equipment:r.equipment?.name||'',condition:r.condition,status:r.status||'',note:r.note||'',updatedBy:r.profiles?.display_name||'',timestamp:r.created_at}));
    state.incidentReports=(incidents||[]).map(r=>({id:r.id,type:r.type,equipment:r.equipment?.name||'',requester:r.profiles?.display_name||'',when:r.created_at,note:r.note||''})); state.notifications=notifications||[]; state.roleRequests=roleRequests||[]; state.error='';
  } catch(error) { state.error=error.message; showToast('Could not load data',error.message); }
  state.loading=false; render();
}
async function restoreSession() {
  try { if(!supabaseAdapter.configured) throw new Error('Supabase is not configured. Check supabase-config.js.'); const result=await supabaseAdapter.getSession(); if(result.data.session) await enterWorkspace(result.data); else {state.loading=false;render();} }
  catch(error){state.loading=false;state.error=error.message;render();setAuthFeedback(`Connection error: ${error.message}`,'error');}
}

function exportCsv() {
  const rows = [['Request ID', 'Borrower', 'Role', 'Equipment', 'Borrow date', 'Due date', 'Status'], ...state.requests.map((request) => [request.id, request.requester, request.requesterRole, requestItemsLabel(request), request.borrowDate, request.dueDate, request.status])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'labtrack-records.csv'; anchor.click(); URL.revokeObjectURL(url);
  showToast('CSV exported', 'Your current borrowing records are ready to download.');
}

async function handleClick(event) {
  const target = event.target.closest('button, [data-open-request], [data-open-equipment], [data-close-modal]');
  if (!target) return;
  if (target.hasAttribute('data-close-modal')) { state.modal = null; render(); return; }
  if (target.dataset.page) { state.page = target.dataset.page; state.sidebarOpen = false; state.modal = null; if (target.dataset.page !== 'request') state.prefillEquipment = ''; render(); return; }

  if (target.dataset.openEquipment) { state.modal = { type: 'equipment', id: target.dataset.openEquipment }; render(); return; }
  if (target.dataset.openRequest) { state.modal = { type: 'request', id: target.dataset.openRequest }; render(); return; }
  if (target.dataset.requestEquipment) { state.modal = null; state.prefillEquipment = target.dataset.requestEquipment; state.page = 'request'; render(); return; }
  if (target.dataset.approveRole) {
    if(!adminRole()) { showToast('Not authorized','Only an Admin can approve role requests.'); return; }
    const row=state.roleRequests.find(r=>r.id===target.dataset.approveRole);
    if(row) { try { await supabaseAdapter.resolveRoleRequest(row.id,{role:row.requested_role,approval_status:'Approved'}); await hydrateFromSupabase(); showToast('Access approved',`${row.display_name||row.email||'Applicant'} is now ${row.requested_role}.`); } catch(error) { showToast('Approval failed',error.message); } }
    return;
  }
  if (target.dataset.rejectRole) {
    if(!adminRole()) { showToast('Not authorized','Only an Admin can reject role requests.'); return; }
    const row=state.roleRequests.find(r=>r.id===target.dataset.rejectRole);
    if(row) { try { await supabaseAdapter.resolveRoleRequest(row.id,{approval_status:'Rejected'}); await hydrateFromSupabase(); showToast('Request rejected',`${row.display_name||row.email||'Applicant'} remains a Student.`); } catch(error) { showToast('Rejection failed',error.message); } }
    return;
  }
  if (target.dataset.cancelRequest) {
    const request = state.requests.find((item) => item.id === target.dataset.cancelRequest);
    if (request) { try { await supabaseAdapter.cancelBorrowRequest(request.id); state.modal=null; await hydrateFromSupabase(); showToast('Request cancelled',`${request.id} is no longer in the review queue.`); } catch(error){showToast('Update failed',error.message);} }
    return;
  }
  if (target.dataset.approveRequest) {
    const request = state.requests.find((item) => item.id === target.dataset.approveRequest);
    if (request) { try { await supabaseAdapter.updateBorrowRequest(request.id,{status:'Approved',reviewer_id:currentUser().id,reviewer_name:currentUser().name}); state.modal=null; await hydrateFromSupabase(); showToast('Request approved',`${request.id} is ready for release.`); } catch(error){showToast('Update failed',error.message);} }
    return;
  }
  if (target.dataset.rejectRequest) { state.modal = { type: 'reject', id: target.dataset.rejectRequest }; render(); return; }
  if (target.dataset.releaseRequest) { const request=state.requests.find(r=>r.id===target.dataset.releaseRequest); if(request){try{await supabaseAdapter.releaseBorrowRequest(request.id); await hydrateFromSupabase(); showToast('Equipment released',`${request.id} is now marked as borrowed.`);}catch(error){showToast('Release failed',error.message);}} return;}
  if (target.dataset.returnRequest) { state.modal = { type: 'return', id: target.dataset.returnRequest }; render(); return; }
  if (target.dataset.editEquipment) { state.modal = { type: 'equipment-form', id: target.dataset.editEquipment }; render(); return; }
  if (target.dataset.archiveEquipment) { const equipment = equipmentById(target.dataset.archiveEquipment); if (equipment) { try { await supabaseAdapter.archiveEquipment(equipment.id); await hydrateFromSupabase(); showToast('Equipment archived',`${equipment.name} was removed from the active catalog.`); } catch(error){showToast('Archive failed',error.message);} } return; }
  if (target.dataset.action === 'add-equipment') { state.modal = { type: 'equipment-form' }; render(); return; }
  if (target.dataset.action === 'report-incident') { state.modal = { type: 'incident' }; render(); return; }
  if (target.dataset.action === 'export-csv') { exportCsv(); return; }
  if (target.dataset.action === 'close-modal') { state.modal = null; render(); return; }
  if (target.dataset.action === 'toggle-sidebar') { state.sidebarOpen = !state.sidebarOpen; render(); return; }
  if (target.dataset.action === 'clear-filters') { state.search = ''; state.catalogCategory = 'All categories'; state.availability = 'All availability'; render(); return; }
  if (target.dataset.action === 'mark-read') { try{await supabaseAdapter.markNotificationsRead(currentUser().id);await hydrateFromSupabase();showToast('Inbox updated','Notifications were marked as read.');}catch(error){showToast('Update failed',error.message);} return; }
  if (target.dataset.action === 'open-help') { state.modal = { type: 'help' }; render(); return; }
  if (target.dataset.action === 'logout') { await supabaseAdapter.signOut(); state.authenticated=false;state.profile=null;state.modal=null;state.loading=false;render();return; }
  if (target.dataset.action === 'contact-borrower') { showToast('Contact workflow unavailable','Connect an email or messaging provider to send borrower reminders.'); return; }
  if (target.dataset.action === 'refresh') { await hydrateFromSupabase(); return; }
  if (target.dataset.action === 'quick-search') { state.search = document.querySelector('[data-quick-search]')?.value || ''; state.page = 'catalog'; render(); return; }
}

async function handleSubmit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.form === 'login') {
    setAuthFeedback('Signing in…','info');
    let result; try { result=await supabaseAdapter.signIn({email:data.email,password:data.password}); } catch(error){setAuthFeedback(`Sign-in failed: ${error.message}`,'error');return;}
    if (result.error) { setAuthFeedback(`Sign-in failed: ${result.error.message || 'Check your email and password.'}`,'error'); return; }
    try { await enterWorkspace(result.data); if(state.authenticated) showToast('Signed in','Your LabTrack account is connected.'); else setAuthFeedback('Sign-in completed, but your profile could not be loaded. Check public.profiles and the auth trigger.','error'); }
    catch(error){setAuthFeedback(`Sign-in succeeded, but the profile could not be loaded: ${error.message}`,'error');}
    return;
  }
  if (form.dataset.form === 'signup') {
    setAuthFeedback('Creating your account…','info');
    try {
      const result=await supabaseAdapter.signUp({email:data.email,password:data.password,metadata:{display_name:data.name,requested_role:data.requestedRole==='Student'?'':data.requestedRole}});
      if(result.error) throw result.error;
      const user=result.data?.user;
      if(!user || (Array.isArray(user.identities) && user.identities.length===0)) {
        setAuthFeedback('No new account was created. This email may already be registered; try signing in or use a different email.','error'); return;
      }
      if(result.data.session) {
        await enterWorkspace(result.data);
        if(state.authenticated) showToast('Account created',data.requestedRole&&data.requestedRole!=='Student'?`Your ${data.requestedRole} request is pending Admin approval; your current role remains Student.`:'Your Student account and profile are ready.');
      } else {
        setAuthFeedback(data.requestedRole&&data.requestedRole!=='Student'?`Account created. Confirm your email. Your ${data.requestedRole} request is pending Admin approval; access stays Student until approval.`:'Account created. Check your email and confirm the address before signing in.','success');
      }
    } catch(error) {
      const message=String(error?.message||error||'Unknown signup error');
      if(/rate.?limit|too many requests|email rate/i.test(message)) {
        setAuthFeedback('Supabase blocked the signup email because its Auth email-sending limit was reached. This is not a profiles-table error. Stop retrying for now; check Authentication → Users in Supabase to see whether the account already exists. For continued testing, configure custom SMTP in Authentication → SMTP.','error');
      } else if(/profiles|profile|trigger/i.test(message)) {
        setAuthFeedback(`The Auth request reached Supabase, but profile creation/lookup failed: ${message}. Check the auth.users trigger and public.profiles schema.`,'error');
      } else {
        setAuthFeedback(`Account creation failed: ${message}`,'error');
      }
    }
    return;
  }

  if (form.dataset.form === 'request') {
    const item = equipmentById(data.equipmentId);
    const quantity = Number(data.quantity);
    if (!item || quantity > item.available) { showToast('Quantity unavailable', `Only ${item?.available || 0} unit(s) are currently available.`); return; }
    try { await supabaseAdapter.createBorrowRequest({request:{purpose:data.purpose,borrow_date:data.borrowDate,due_date:data.dueDate,notes:data.notes||''},items:[{equipment_id:item.id,quantity}]}); await hydrateFromSupabase(); state.page='requests'; render(); showToast('Request submitted','Your request is waiting for staff review.'); } catch(error){showToast('Request failed',error.message);} return;
  }
  if (form.dataset.form === 'reject') {
    const request = state.requests.find((item) => item.id === form.dataset.requestId);
    if (request) { try { await supabaseAdapter.updateBorrowRequest(request.id,{status:'Rejected',reviewer_id:currentUser().id,rejection_reason:data.reason}); state.modal=null; await hydrateFromSupabase(); showToast('Request rejected',`${request.id} was updated.`); } catch(error){showToast('Update failed',error.message);} }
    return;
  }
  if (form.dataset.form === 'return') {
    const request=state.requests.find(r=>r.id===form.dataset.requestId);
    if(request){try{await supabaseAdapter.returnBorrowRequest({id:request.id,returnedAt:data.returnedAt,condition:data.condition,note:data.note}); state.modal=null;await hydrateFromSupabase();showToast('Return processed',`${request.id} is closed with a ${data.condition.toLowerCase()} condition.`);}catch(error){showToast('Return failed',error.message);}}
    return;
  }

  if (form.dataset.form === 'equipment') {
    const row={name:data.name,category:data.category,description:data.description,total:Number(data.total),available:Number(data.available),condition:data.condition,status:data.status,location:data.location};
    try{if(form.dataset.equipmentId)await supabaseAdapter.updateEquipment(form.dataset.equipmentId,row);else await supabaseAdapter.createEquipment(row);state.modal=null;await hydrateFromSupabase();showToast(form.dataset.equipmentId?'Equipment updated':'Equipment added',`${data.name} was saved.`);}catch(error){showToast('Save failed',error.message);} return;
  }

  if (form.dataset.form === 'incident') { try{const eq=state.equipment.find(e=>e.name===data.equipment);await supabaseAdapter.createIncident({equipment_id:eq?.id,type:data.type,note:data.note,reported_by:currentUser().id});state.modal=null;await hydrateFromSupabase();showToast('Incident report saved','The report was saved to the database.');}catch(error){showToast('Save failed',error.message);} }
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

window.labtrack = { supabaseAdapter, supabaseConfig, state };
render();
void restoreSession();
