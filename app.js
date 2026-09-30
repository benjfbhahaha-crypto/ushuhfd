/* ============ BACKEND SETUP ============
 Ilagay ang URL ng backend mo dito. Kapag walang laman, in-memory lang (walang data).
 Inaasahang endpoints (GET list / POST create / PUT update / DELETE remove):
   {API_BASE}/clients  /events  /inventory  /rentals  /payments  /inquiries  /pullsheet
 Inaasahang fields:
   clients:   {id,name,contact,email,address,event,total,paid}
   events:    {id,date,time,client,venue,package,status}
   inventory: {id,name,category,qty,reorder,status}
   rentals:   {id,item,renter,expectedReturn,status}
   pullsheet: {id,item,category,qty,status}
   inquiries: {id}
   user:      {name,role}  (setUser)
*/
const CONFIG = { API_BASE: '' };
const state = { clients: [], events: [], inventory: [], rentals: [], pullsheet: [], inquiries: [], user: { name: '', role: '' } };

const api = {
  async list(r){ if(!CONFIG.API_BASE) return state[r]; const x=await fetch(`${CONFIG.API_BASE}/${r}`); return x.json(); },
  async create(r,o){ if(!CONFIG.API_BASE){o.id=o.id||Date.now();return o;} const x=await fetch(`${CONFIG.API_BASE}/${r}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)}); return x.json(); },
  async update(r,id,o){ if(!CONFIG.API_BASE) return o; const x=await fetch(`${CONFIG.API_BASE}/${r}/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)}); return x.json(); },
  async remove(r,id){ if(!CONFIG.API_BASE) return true; await fetch(`${CONFIG.API_BASE}/${r}/${id}`,{method:'DELETE'}); return true; }
};
async function loadAll(){
  for (const r of ['clients','events','inventory','rentals','pullsheet','inquiries']) {
    try { state[r] = await api.list(r); } catch(e) { console.warn('load failed', r, e); }
  }
  render();
}
/* pwede ring i-push manual: Laetitia.setData({clients:[...], events:[...]}) */
window.Laetitia = { state, setData(d){ Object.assign(state,d); render(); }, reload: loadAll };

/* ============ HELPERS ============ */
const $ = s => document.querySelector(s);
const ico = (n, c = '') => `<svg class="i ${c}"><use href="#i-${n}"/></svg>`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const peso = n => '₱' + (Number(n) || 0).toLocaleString('en-PH');
const num = v => Number(String(v).replace(/[^\d.-]/g, '')) || 0;
const bal = c => Math.max(0, num(c.total) - num(c.paid));
const isLow = i => num(i.qty) <= num(i.reorder ?? 0) || i.status === 'Low';
const fmtDate = d => { const x = new Date(d); return isNaN(x) ? esc(d) : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
function fill(id, rows, cols, tpl, msg) {
  $(id).innerHTML = rows.length ? rows.map(tpl).join('') : `<tr><td class="empty" colspan="${cols}">${msg}</td></tr>`;
}
const pill = (t, cls = '') => `<span class="pill ${cls}">${esc(t || 'OK')}</span>`;

/* ============ RENDER ============ */
function render() {
  const now = new Date();
  $('#today').innerHTML = ico('cal') + now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ico('chev');
  $('#pullDate').textContent = 'Tomorrow · ' + new Date(now.getTime() + 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const u = state.user; $('#uName').textContent = u.name; $('#uRole').textContent = u.role;
  $('#uInit').textContent = (u.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // stats (computed)
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  $('#sEvents').textContent = state.events.filter(e => { const x = new Date(e.date); return isNaN(x) || x >= t0; }).length;
  $('#sInq').textContent = state.inquiries.length;
  $('#sOut').textContent = state.rentals.length;
  $('#sLow').textContent = state.inventory.filter(isLow).length;
  $('#sBal').textContent = peso(state.clients.reduce((s, c) => s + bal(c), 0));

  const evRow = full => e => `<tr><td>${fmtDate(e.date)}${e.time ? ' ' + esc(e.time) : ''}</td><td class="g">${esc(e.client)}</td><td>${esc(e.venue)}</td><td>${esc(e.package)}</td><td>${pill(e.status)}</td>${full ? '' : '<td><button class="btn" data-m="event">View</button></td>'}</tr>`;
  fill('#dEv', state.events, 6, evRow(false), 'No upcoming events');
  fill('#evT', state.events, 5, evRow(true), 'No events yet');

  const retRow = r => `<tr><td>${esc(r.item)}</td><td>${esc(r.renter)}</td><td>${fmtDate(r.expectedReturn)}</td><td>${pill(r.status)}</td><td><button class="btn" data-m="returned">Mark Returned</button></td></tr>`;
  fill('#dRet', state.rentals, 5, retRow, 'Nothing out on rent');
  fill('#retT', state.rentals, 5, retRow, 'Nothing out on rent');

  fill('#dPull', state.pullsheet, 4, p => `<tr><td><span class="ck">${ico('chk')}</span> ${esc(p.item)}</td><td>${esc(p.category)}</td><td>${esc(p.qty)}</td><td>${pill(p.status || 'Available')}</td></tr>`, 'No items to pull');

  const owing = state.clients.filter(c => bal(c) > 0);
  fill('#dRec', state.clients, 5, c => `<tr><td class="g">${esc(c.name)}</td><td>${fmtDate(c.eventDate || c.date)}</td><td>${peso(c.total)}</td><td>${peso(c.paid)}</td><td class="${bal(c) ? 'r' : 'g'}">${peso(bal(c))}</td></tr>`, 'No receivables');

  fill('#dLow', state.inventory.filter(isLow), 5, i => `<tr><td>${esc(i.name)}</td><td>${esc(i.qty)}</td><td>${esc(i.reorder ?? '')}</td><td>${pill('Low', 'low')}</td><td><button class="btn" data-restock="${esc(i.id)}">Mark Restocked</button></td></tr>`, 'No low stock');

  const q = s => ($(s).value || '').toLowerCase();
  fill('#invT', state.inventory.filter(i => (i.name + i.category).toLowerCase().includes(q('#invQ'))), 5,
    i => `<tr><td>${esc(i.name)}</td><td>${esc(i.category)}</td><td>${esc(i.qty)}</td><td>${pill(isLow(i) ? 'Low' : 'OK', isLow(i) ? 'low' : 'ok')}</td><td><button class="btn" data-restock="${esc(i.id)}">Mark Restocked</button> <button class="btn red" data-del="inventory:${esc(i.id)}">Delete Item</button></td></tr>`, 'No inventory items');

  fill('#clT', state.clients.filter(c => c.name.toLowerCase().includes(q('#clQ'))), 5,
    c => `<tr><td>${esc(c.name)}</td><td>${esc(c.event)}</td><td><b>${peso(c.total)}</b></td><td class="${bal(c) ? 'r' : ''}"><b>${peso(bal(c))}</b></td><td><button class="btn red" data-del="clients:${esc(c.id)}">Delete Client</button></td></tr>`, 'No clients yet');

  fill('#ppT', owing.filter(c => c.name.toLowerCase().includes(q('#ppQ'))), 5,
    c => `<tr><td>${esc(c.name)}</td><td>${esc(c.event)}</td><td>${peso(c.paid)}</td><td class="r">${peso(bal(c))}</td><td><button class="btn">Mark Restocked</button> <button class="btn red" data-m="reminder">Send Reminder</button></td></tr>`, 'No pending payments');

  // booking form dropdowns
  $('#bClient').innerHTML = '<option value="">Select a Client</option>' + state.clients.map(c => `<option>${esc(c.name)}</option>`).join('');
  $('#bPkg').innerHTML = '<option value="">Select Package</option>' + pkgs().map(p => `<option>${esc(p)}</option>`).join('');
  fill('#bItems', state.inventory, 4, i => `<tr><td>${esc(i.name)}</td><td>${esc(i.category)}</td><td><input class="qty" type="number" min="0" data-item="${esc(i.name)}"></td><td><span class="bar ${num(i.qty) > 0 ? '' : 'no'}"></span></td></tr>`, 'No items available');
}
const pkgs = () => [...new Set(state.events.map(e => e.package).filter(Boolean))];

/* ============ NAV ============ */
function go(p) { document.querySelectorAll('.page').forEach(x => x.classList.toggle('on', x.id == p)); document.querySelectorAll('aside a').forEach(a => a.classList.toggle('on', a.dataset.p == p)); }

/* ============ MODALS ============ */
const f = (id, l, t = 'text', ph = '') => `<label>${l}</label><input id="f_${id}" type="${t}" placeholder="${ph}">`;
const sel = (id, l, o) => `<label>${l}</label><select id="f_${id}">${o.length ? o.map(x => `<option>${esc(x)}</option>`).join('') : '<option value="">— none —</option>'}</select>`;
const names = () => state.clients.map(c => c.name);
const items = () => state.inventory.map(i => i.name);
const val = id => ($('#f_' + id) || {}).value || '';

const M = {
  client: { t: 'New Client', h: () => f('name', 'Client Name') + f('contact', 'Contact Number', 'tel') + f('email', 'Email', 'email') + f('address', 'Address'), ok: 'Add Client',
    run: async () => { if (!val('name')) return 0; const o = await api.create('clients', { name: val('name'), contact: val('contact'), email: val('email'), address: val('address'), event: '', total: 0, paid: 0 }); state.clients.push(o); } },
  event: { t: 'New Booking / Event', h: () => sel('client', 'Select a Client', names()) + f('date', 'Event Date', 'date') + f('time', 'Event Time', 'time') + f('venue', 'Venue / Address') + f('package', 'Package') + f('pay', 'Payment / Downpayment', 'number', '₱'), ok: 'Submit Booking',
    run: async () => { if (!val('client') || !val('date')) return 0; const o = await api.create('events', { client: val('client'), date: val('date'), time: val('time'), venue: val('venue'), package: val('package'), status: 'OK' }); state.events.push(o);
      const c = state.clients.find(c => c.name === val('client')); if (c) { c.event = val('package'); c.paid = num(c.paid) + num(val('pay')); } } },
  item: { t: 'Add Inventory Item', h: () => f('name', 'Item Name') + sel('category', 'Category', ['Prop', 'Consumable']) + f('qty', 'Quantity', 'number') + f('reorder', 'Reorder Level', 'number'), ok: 'Add Item',
    run: async () => { if (!val('name')) return 0; const o = await api.create('inventory', { name: val('name'), category: val('category'), qty: num(val('qty')), reorder: num(val('reorder')) }); state.inventory.push(o); } },
  avail: { t: 'Check Date Availability', h: () => f('date', 'Event Date', 'date') + sel('item', 'Item', items()), ok: 'Check',
    run: async () => { const b = state.events.some(e => e.date === val('date')); toast(b ? 'May event na sa date na ito' : 'Available ang date'); return 2; } },
  pull: { t: 'Generate Pull Sheet', h: () => f('date', 'Event Date', 'date') + sel('event', 'Event', state.events.map(e => e.client)), ok: 'Generate', run: async () => { window.print(); return 1; } },
  payment: { t: 'Record Payment', h: () => sel('client', 'Client', names()) + f('amount', 'Amount', 'number', '₱') + sel('method', 'Method', ['Cash', 'GCash', 'Bank Transfer']), ok: 'Save Payment',
    run: async () => { const c = state.clients.find(c => c.name === val('client')); if (!c) return 0; await api.create('payments', { client: c.name, amount: num(val('amount')), method: val('method') }); c.paid = num(c.paid) + num(val('amount')); } },
  reminder: { t: 'Send Reminder', h: () => sel('client', 'Client', names()) + '<label>Message</label><textarea id="f_msg" rows="3">Hello! Friendly reminder about your remaining balance.</textarea>', ok: 'Send', run: async () => 1 },
  returned: { t: 'Mark Returned', h: () => sel('item', 'Item', state.rentals.map(r => r.item)) + f('notes', 'Condition Notes'), ok: 'Confirm Return',
    run: async () => { const i = state.rentals.findIndex(r => r.item === val('item')); if (i < 0) return 0; await api.remove('rentals', state.rentals[i].id); state.rentals.splice(i, 1); } },
  damage: { t: 'Damage / Missing Fee', h: () => sel('item', 'Item', state.rentals.map(r => r.item)) + f('fee', 'Fee Amount', 'number', '₱') + f('notes', 'Notes'), ok: 'Charge Fee', run: async () => { await api.create('payments', { item: val('item'), fee: num(val('fee')), notes: val('notes') }); } },
  deposit: { t: 'Charge Security Deposit', h: () => sel('client', 'Client', names()) + f('amount', 'Amount', 'number', '₱'), ok: 'Charge', run: async () => { await api.create('payments', { client: val('client'), deposit: num(val('amount')) }); } }
};
function openM(k) {
  const m = M[k];
  $('#modal').innerHTML = `<div class="mh"><img src="logo.png" alt=""><h4>${m.t}</h4><button class="x" data-close>×</button></div>${m.h()}<div class="ft"><button class="btn red" data-close>Cancel</button><button class="btn teal" id="okb">${m.ok}</button></div>`;
  $('#ov').classList.add('on');
  $('#okb').onclick = async () => { try { const r = await m.run(); if (r === 0) return toast('Kumpletuhin muna ang required fields'); closeM(); render(); if (r !== 2) toast(m.t + ' — done ✓'); } catch (e) { toast('Error: ' + e.message); } };
}
const closeM = () => $('#ov').classList.remove('on');
function toast(t) { const e = $('#toast'); e.textContent = t; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 2200); }

/* ============ EVENTS ============ */
document.addEventListener('click', async e => {
  const t = e.target, m = t.closest('[data-m]'), p = t.closest('[data-p]'), d = t.closest('[data-del]'), r = t.closest('[data-restock]');
  if (m) openM(m.dataset.m); else if (p) go(p.dataset.p);
  if (t.closest('[data-close]') || t.id == 'ov') closeM();
  if (d) { const [res, id] = d.dataset.del.split(':'); await api.remove(res, id); state[res] = state[res].filter(x => String(x.id) !== id); render(); }
  if (r) { const i = state.inventory.find(x => String(x.id) === r.dataset.restock); if (i) { i.qty = num(i.reorder) + 1; await api.update('inventory', i.id, i); render(); } }
});
$('#delAllInv').onclick = async () => { if (!confirm('Delete all inventory items?')) return; for (const i of state.inventory) await api.remove('inventory', i.id); state.inventory = []; render(); };
$('#delAllCl').onclick = async () => { if (!confirm('Delete all clients?')) return; for (const c of state.clients) await api.remove('clients', c.id); state.clients = []; render(); };
$('#restockAll').onclick = () => { state.inventory.forEach(i => i.qty = Math.max(num(i.qty), num(i.reorder) + 1)); render(); };
$('#bCancel').onclick = () => { ['bDate', 'bTime', 'bVenue', 'bPay'].forEach(i => $('#' + i).value = ''); };
$('#bSubmit').onclick = async () => {
  if (!$('#bClient').value || !$('#bDate').value) return toast('Pumili ng client at date');
  const o = await api.create('events', { client: $('#bClient').value, date: $('#bDate').value, time: $('#bTime').value, venue: $('#bVenue').value, package: $('#bPkg').value, status: 'OK', items: [...document.querySelectorAll('#bItems .qty')].filter(q => num(q.value) > 0).map(q => ({ item: q.dataset.item, qty: num(q.value) })) });
  state.events.push(o); $('#bCancel').click(); render(); toast('Booking submitted ✓');
};
['invQ', 'clQ', 'ppQ'].forEach(i => $('#' + i).addEventListener('input', render));

render();
loadAll();
