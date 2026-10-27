const buildings = ['PHL5', 'ORD1', 'DFW5', 'SMF2', 'IND3'];
const shifts = ['S1', 'S2', 'S4', 'S5'];
const departments = ['IB', 'OB'];
const ibKpis = ['DECANT UPH', 'UNLOADING UPH', 'REMEDY UPH', 'PROBLEM SOLVE UPH', 'IB UPH', 'OTD', 'ULEARNS', 'AXONIFY %'];
const ibKpiPointRanges = {
  'DECANT UPH': { min: 1, max: 5 }, 'UNLOADING UPH': { min: 1, max: 5 },
  'REMEDY UPH': { min: 1, max: 5 }, 'PROBLEM SOLVE UPH': { min: 1, max: 5 },
  'IB UPH': { min: 1, max: 10 }, OTD: { min: 1, max: 10 },
  ULEARNS: { min: 1, max: 5 }, 'AXONIFY %': { min: 1, max: 5 }
};
const obKpis = ['PICK UPH', 'BF UPH', 'BAGGING UPH', 'LOADING UPH', 'OB UPH', 'OTD', 'ULEARNS', 'AXONIFY %'];
const obKpiPointRanges = {
  'PICK UPH': { min: 1, max: 5 }, 'BF UPH': { min: 1, max: 5 },
  'BAGGING UPH': { min: 1, max: 5 }, 'LOADING UPH': { min: 1, max: 5 },
  'OB UPH': { min: 1, max: 10 }, OTD: { min: 1, max: 10 },
  ULEARNS: { min: 1, max: 5 }, 'AXONIFY %': { min: 1, max: 5 }
};
const names = ['PHL5 S1 OB', 'ORD1 S4 IB', 'DFW5 S2 OB', 'SFM2 S1 IB', 'IND3 S5 OB', 'PHL5 S4 IB', 'ORD1 S2 OB', 'DFW5 S5 IB'];

function getWalmartWeek(date = new Date()) {
  const fiscalYear = date.getMonth() >= 1 ? date.getFullYear() : date.getFullYear() - 1;
  const fiscalStart = new Date(fiscalYear, 1, 1);
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const fiscalWeekOneStart = new Date(fiscalStart);
  fiscalWeekOneStart.setDate(fiscalWeekOneStart.getDate() - ((fiscalWeekOneStart.getDay() + 1) % 7));
  const weekNumber = Math.floor((weekStart - fiscalWeekOneStart) / 604800000) + 1;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return { fiscalYear, weekNumber, weekStart, weekEnd };
}
function formatDate(date) { return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function currentWeekLabel() {
  const week = getWalmartWeek();
  return `Walmart Week ${week.weekNumber} • FY${week.fiscalYear}`;
}

let competitors = buildings.flatMap((building, buildingIndex) => shifts.flatMap((shift, shiftIndex) => departments.map((department, departmentIndex) => {
  const base = 0;
  return { id: `${building}-${shift}-${department}`, building, shift, department, points: base, movement: 0, kpis: department === 'IB' ? ibKpis : obKpis };
})));
const pastWeeks = [
  { week: 'Week 41', winner: 'ORD1 S4 IB', points: 46 },
  { week: 'Week 40', winner: 'PHL5 S1 OB', points: 44 },
  { week: 'Week 39', winner: 'DFW5 S2 OB', points: 43 },
  { week: 'Week 38', winner: 'PHL5 S1 OB', points: 45 }
];
const streaks = [
  { name: 'PHL5 S1 OB', count: 8, gold: 4 }, { name: 'ORD1 S4 IB', count: 6, gold: 2 },
  { name: 'DFW5 S2 OB', count: 5, gold: 2 }, { name: 'SMF2 S1 IB', count: 4, gold: 1 },
  { name: 'IND3 S5 OB', count: 3, gold: 1 }
];

const $ = (selector) => document.querySelector(selector);
function ranked() { return [...competitors].sort((a, b) => b.points - a.points); }
function renderPodium(rows) {
  const podiumOrder = [
    { item: rows[1], rank: 2, label: 'RUNNER UP' },
    { item: rows[0], rank: 1, label: 'CURRENT LEADER' },
    { item: rows[2], rank: 3, label: 'THIRD PLACE' }
  ];
  $('#podium').innerHTML = podiumOrder.map(({ item, rank, label }) => `<article class="podium podium-place-${rank}"><div class="podium-watermark">0${rank}</div><div class="podium-medal"><span>0${rank}</span></div><div class="podium-label">${label}</div><div class="podium-shift">${item.building} ${item.shift} ${item.department}</div><div class="podium-meta">${item.department === 'IB' ? 'Inbound' : 'Outbound'} division</div><div class="podium-score"><strong>${item.points}</strong><small>POINTS</small></div><div class="podium-sheen"></div></article>`).join('');
}
function renderTable() {
  const filter = $('#building-filter').value;
  const rows = ranked().filter(item => filter === 'all' || item.building === filter);
  $('#leaderboard-body').innerHTML = rows.map((item, index) => `<tr><td>${String(index + 1).padStart(2, '0')}</td><td class="shift-name">${item.building} ${item.shift} ${item.department}</td><td>${item.building}</td><td><span class="dept ${item.department.toLowerCase()}">${item.department === 'IB' ? 'Inbound' : 'Outbound'}</span></td><td class="score">${item.points}</td><td class="movement ${item.movement > 0 ? 'up' : item.movement < 0 ? 'down' : ''}">${item.movement > 0 ? '↑ +' + item.movement : item.movement < 0 ? '↓ ' + item.movement : '—'}</td><td><div class="progress" aria-label="${item.points} out of 50 points"><span style="width:${item.points * 2}%"></span></div></td></tr>`).join('');
  if (filter === 'all') renderPodium(rows);
}
function getSnapshots() { return JSON.parse(localStorage.getItem('race-snapshots') || '{}'); }
function saveSnapshots(snapshots) { localStorage.setItem('race-snapshots', JSON.stringify(snapshots)); }
function snapshotFor(week) { return getSnapshots()[String(week)] || null; }
function applySnapshot(week) {
  const snapshot = snapshotFor(week);
  if (!snapshot) return;
  const pointsByShift = new Map(snapshot.rows.map(row => [row.shift, row.points]));
  competitors = competitors.map(item => ({ ...item, points: pointsByShift.get(`${item.building} ${item.shift} ${item.department}`) ?? 0, movement: 0 }));
}
function historicalRank(index, week) {
  const snapshot = snapshotFor(week);
  if (snapshot) {
    const ordered = [...snapshot.rows].sort((a, b) => b.points - a.points || a.order - b.order);
    return ordered.findIndex(row => row.shift === competitors[index].id.replaceAll('-', ' ')) + 1;
  }
  return week === 39 ? index + 1 : null;
}
function renderSnapshotList() {
  const snapshots = getSnapshots();
  const weeks = Object.keys(snapshots).sort((a, b) => Number(a) - Number(b));
  $('#snapshot-list').innerHTML = weeks.length ? weeks.map(week => `<span class="snapshot-chip">WW${week}<small>${snapshots[week].rows.length} shifts saved</small></span>`).join('') : '<span class="muted">No weekly snapshots published yet.</span>';
}
function setImportStatus(message, type = '') { const status = $('#import-status'); status.textContent = message; status.className = `import-status ${type}`; }
let pendingImport = null;
async function inspectImport(file) {
  const week = Number($('#import-week').value);
  if (!file || !week) return;
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const expectedSheet = `WW${week} Points`;
    const sheetName = workbook.SheetNames.includes(expectedSheet) ? expectedSheet : workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const imported = rows.slice(1).map((row, index) => ({ shift: String(row[4] || '').trim(), points: Number(row[18]), order: index + 1 })).filter(row => row.shift);
    const expected = new Set(competitors.map(item => `${item.building} ${item.shift} ${item.department}`));
    const seen = new Set(); const duplicates = []; const invalid = []; const unknown = [];
    imported.forEach(row => { if (seen.has(row.shift)) duplicates.push(row.shift); seen.add(row.shift); if (!Number.isFinite(row.points) || row.points < 0 || row.points > 50) invalid.push(row.shift); if (!expected.has(row.shift)) unknown.push(row.shift); });
    const missing = [...expected].filter(shift => !seen.has(shift));
    pendingImport = { week, sheetName, rows: imported, valid: duplicates.length === 0 && invalid.length === 0 && unknown.length === 0 && missing.length === 0 };
    $('#publish-points').disabled = !pendingImport.valid;
    $('#import-preview').innerHTML = `<table><thead><tr><th>Shift</th><th>Points</th></tr></thead><tbody>${imported.slice(0, 12).map(row => `<tr><td>${row.shift}</td><td>${row.points}</td></tr>`).join('')}</tbody></table>${imported.length > 12 ? '<p class="muted">Showing first 12 rows.</p>' : ''}`;
    const issues = [`${imported.length}/40 rows found`, sheetName === expectedSheet ? '' : `expected ${expectedSheet}, used ${sheetName}`, missing.length ? `${missing.length} missing` : '', duplicates.length ? `${duplicates.length} duplicate` : '', invalid.length ? `${invalid.length} invalid points` : '', unknown.length ? `${unknown.length} unknown shift` : ''].filter(Boolean);
    setImportStatus(issues.join(' • ') + (pendingImport.valid ? ' • Ready to publish.' : ''), pendingImport.valid ? 'success' : 'error');
  } catch (error) { pendingImport = null; $('#publish-points').disabled = true; setImportStatus(`Could not read workbook: ${error.message}`, 'error'); }
}
function publishImport() {
  if (!pendingImport?.valid) return;
  const snapshots = getSnapshots(); snapshots[String(pendingImport.week)] = { sheetName: pendingImport.sheetName, importedAt: new Date().toISOString(), rows: pendingImport.rows }; saveSnapshots(snapshots); applySnapshot(pendingImport.week); renderTable(); renderHistoryMatrix(); renderSnapshotList(); setImportStatus(`WW${pendingImport.week} published successfully.`, 'success');
}

function renderHistoryMatrix() {
  const weeks = Array.from({ length: 15 }, (_, index) => 38 + index);
  const filter = $('#history-building-filter').value;
  const rows = competitors.filter(item => filter === 'all' || item.building === filter);
  $('#history-matrix-head').innerHTML = `<tr><th>Order</th><th>Shift</th>${weeks.map(week => `<th class="${week === 39 ? 'current-week' : ''}">WW${week}</th>`).join('')}</tr>`;
  $('#history-matrix-body').innerHTML = rows.map(item => {
    const index = competitors.indexOf(item);
    const cells = weeks.map((week, weekIndex) => {
      const rank = historicalRank(index, week);
      const previousRank = weekIndex === 0 ? rank : historicalRank(index, weeks[weekIndex - 1]);
      const movement = rank === null || previousRank === null ? '<span class="muted">—</span>' : rank < previousRank ? '<span class="movement-up">↑</span>' : rank > previousRank ? '<span class="movement-down">↓</span>' : '<span class="muted">—</span>';
      const rankClass = rank !== null && rank <= 3 ? `rank-${rank}` : '';
      return `<td class="${week === 39 ? 'current-week' : ''}"><span class="rank-cell ${rankClass}">${rank === null ? '—' : String(rank).padStart(2, '0')}</span> ${movement}</td>`;
    }).join('');
    return `<tr><td>${String(index + 1).padStart(2, '0')}</td><td>${item.building} ${item.shift} ${item.department}</td>${cells}</tr>`;
  }).join('');
}
function renderHistory() {
  renderHistoryMatrix();
  $('#gold-leader-list').innerHTML = [...streaks].sort((a, b) => b.gold - a.gold || b.count - a.count).map((item, index) => `<div class="gold-leader-row"><span class="gold-leader-rank">${index + 1}</span><strong>${item.name}</strong><span class="gold-leader-count">${item.gold}<small>gold medals</small></span><span class="gold-dot">●</span></div>`).join('');
}
function renderCalendar() {
  const week = getWalmartWeek();
  const label = currentWeekLabel();
  $('#week-label').textContent = label;
  $('#hero-week').textContent = label;
  $('#week-label').title = `${formatDate(week.weekStart)} – ${formatDate(week.weekEnd)} • Saturday–Friday`;
}
function populateBuildings() {
  buildings.forEach(building => {
    $('#building-filter').insertAdjacentHTML('beforeend', `<option value="${building}">${building}</option>`);
    $('#history-building-filter').insertAdjacentHTML('beforeend', `<option value="${building}">${building}</option>`);
  });
}
function showView(view) {
  document.body.dataset.view = view;
  document.querySelectorAll('.nav-link').forEach(link => {
    const active = link.dataset.view === view;
    link.classList.toggle('active', active);
    link.setAttribute('aria-current', active ? 'page' : 'false');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function initializeNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      showView(link.dataset.view);
      history.replaceState(null, '', link.getAttribute('href'));
    });
  });
  $('#live-leaderboard-button').addEventListener('click', event => {
    event.preventDefault();
    showView('leaderboard');
    history.replaceState(null, '', '#leaderboard');
  });
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  $('#theme-toggle').setAttribute('aria-pressed', String(dark));
  $('#theme-toggle').setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  $('.theme-label').textContent = dark ? 'Light mode' : 'Dark mode';
}
function initializeTheme() {
  const saved = localStorage.getItem('race-theme');
  const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(preferred);
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('race-theme', next);
  applyTheme(next);
}
$('#building-filter').addEventListener('change', renderTable);
$('#history-building-filter').addEventListener('change', renderHistoryMatrix);
$('#points-file').addEventListener('change', event => inspectImport(event.target.files[0]));
$('#import-week').addEventListener('change', () => inspectImport($('#points-file').files[0]));
$('#publish-points').addEventListener('click', publishImport);
$('#theme-toggle').addEventListener('click', toggleTheme);
initializeNavigation();
showView('home');
populateBuildings(); initializeTheme(); applySnapshot(39); renderCalendar(); renderTable(); renderHistory(); renderSnapshotList();
