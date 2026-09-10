import { SUPABASE_URL, SUPABASE_ANON_KEY, cmsConfigured } from './cms-config.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const client = cmsConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const resources = {
  products: {
    title: 'المنتجات', description: 'إدارة المنتجات والصور وملفات البيانات الفنية PDF.', table: 'rrr_products', icon: '▦',
    columns: ['المنتج', 'القسم', 'ملف البيانات', 'الحالة', 'الإجراءات'],
    fields: [
      ['name','اسم المنتج','text',true], ['category_id','القسم','category'], ['sku','رقم الصنف SKU','text'],
      ['short_description','وصف مختصر','textarea'], ['description','الوصف الكامل','textarea-wide'], ['price_label','السعر أو عبارة السعر','text'],
      ['image_file','صورة المنتج','image'], ['datasheet_file','ملف بيانات المنتج PDF','pdf'],
      ['is_featured','منتج مميز','checkbox'], ['is_active','ظاهر في الموقع','checkbox']
    ]
  },
  categories: {
    title: 'أقسام المنتجات', description: 'أنشئ أي قسم ورتّب ظهوره في صفحة المنتجات.', table: 'rrr_categories', icon: '▤',
    columns: ['القسم', 'الوصف', 'الترتيب', 'الحالة', 'الإجراءات'],
    fields: [['name','اسم القسم','text',true],['description','الوصف','textarea-wide'],['image_file','صورة القسم','image'],['sort_order','الترتيب','number'],['is_active','ظاهر في الموقع','checkbox']]
  },
  projects: {
    title: 'مشاريعنا', description: 'اعرض المشاريع المنفذة أو التي تم توريد موادها.', table: 'rrr_projects', icon: '◇',
    columns: ['المشروع', 'الفئة', 'الموقع', 'الحالة', 'الإجراءات'],
    fields: [['title','اسم المشروع','text',true],['category','نوع المشروع','text'],['location','الموقع','text'],['summary','وصف المشروع','textarea-wide'],['image_file','صورة المشروع','image'],['sort_order','الترتيب','number'],['is_active','ظاهر في الموقع','checkbox']]
  },
  clients: {
    title: 'عملاؤنا', description: 'أضف الجهات والعملاء الذين ترغب في عرضهم بالموقع.', table: 'rrr_clients', icon: '◎',
    columns: ['العميل', 'القطاع', 'الموقع الإلكتروني', 'الحالة', 'الإجراءات'],
    fields: [['name','اسم العميل','text',true],['sector','القطاع','text'],['description','نبذة','textarea-wide'],['logo_file','شعار العميل','image'],['website_url','الموقع الإلكتروني','url'],['sort_order','الترتيب','number'],['is_active','ظاهر في الموقع','checkbox']]
  },
  suppliers: {
    title: 'الموردون', description: 'إدارة المصنعين والموزعين والعلامات التي تتعامل معها الشركة.', table: 'rrr_suppliers', icon: '◈',
    columns: ['المورد', 'الدولة', 'الموقع الإلكتروني', 'الحالة', 'الإجراءات'],
    fields: [['name','اسم المورد','text',true],['country','الدولة','text'],['description','نبذة','textarea-wide'],['logo_file','شعار المورد','image'],['website_url','الموقع الإلكتروني','url'],['sort_order','الترتيب','number'],['is_active','ظاهر في الموقع','checkbox']]
  }
};

let activeResource = 'products';
let records = [];
let editingRecord = null;
let categories = [];

function notify(message, error = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.className = 'toast', 3200);
}

function setMessage(element, message, success = false) {
  element.textContent = message || '';
  element.classList.toggle('success', success);
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'') || `item-${Date.now()}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

async function isAdmin(userId) {
  const { data, error } = await client.from('rrr_admin_users').select('user_id').eq('user_id', userId).maybeSingle();
  return !error && Boolean(data);
}

async function showAdmin(session) {
  if (!(await isAdmin(session.user.id))) {
    await client.auth.signOut();
    setMessage($('#login-message'), 'هذا الحساب لا يملك صلاحية إدارة الموقع.');
    return;
  }
  $('#login-screen').hidden = true;
  $('#admin-shell').hidden = false;
  $('#admin-email').textContent = session.user.email;
  await Promise.all([loadCategories(), loadStats(), openView('dashboard')]);
}

async function init() {
  if (!client) {
    setMessage($('#login-message'), 'لم يكتمل ربط لوحة الإدارة بقاعدة البيانات بعد.');
    $('#login-form button').disabled = true;
    return;
  }
  const { data } = await client.auth.getSession();
  if (data.session) await showAdmin(data.session);
}

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('button', event.currentTarget);
  const form = new FormData(event.currentTarget);
  button.disabled = true;
  button.textContent = 'جارٍ تسجيل الدخول...';
  setMessage($('#login-message'), '');
  const { data, error } = await client.auth.signInWithPassword({email: form.get('email'), password: form.get('password')});
  button.disabled = false;
  button.textContent = 'دخول لوحة الإدارة';
  if (error) return setMessage($('#login-message'), 'بيانات الدخول غير صحيحة أو الحساب غير مفعّل.');
  await showAdmin(data.session);
});

$('#logout-button').addEventListener('click', async () => {
  await client.auth.signOut();
  location.reload();
});

$('#change-password-button').addEventListener('click', () => {
  $('#password-form').reset();
  setMessage($('#password-message'), '');
  $('#password-dialog').showModal();
});
$('#password-close').addEventListener('click', () => $('#password-dialog').close());
$('#password-cancel').addEventListener('click', () => $('#password-dialog').close());
$('#password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const password = form.get('password');
  if (password !== form.get('confirm_password')) return setMessage($('#password-message'), 'كلمتا المرور غير متطابقتين.');
  const button = $('button[type="submit"]', event.currentTarget);
  button.disabled = true;
  const { error } = await client.auth.updateUser({ password });
  button.disabled = false;
  if (error) return setMessage($('#password-message'), 'تعذر حفظ كلمة المرور. استخدم 8 أحرف أو أكثر.');
  $('#password-dialog').close();
  notify('تم تعيين كلمة المرور بنجاح.');
});

$('#mobile-menu').addEventListener('click', () => $('.sidebar').classList.add('open'));
$('#mobile-close').addEventListener('click', () => $('.sidebar').classList.remove('open'));

$('#admin-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-view]');
  if (button) openView(button.dataset.view);
});

$$('[data-quick-add]').forEach(button => button.addEventListener('click', async () => {
  await openView(button.dataset.quickAdd);
  openDialog();
}));

async function openView(view) {
  $$('#admin-nav button').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('.sidebar').classList.remove('open');
  $$('.view').forEach(section => section.classList.remove('active'));
  if (view === 'dashboard') {
    $('#view-dashboard').classList.add('active');
    $('#view-title').textContent = 'نظرة عامة';
    return;
  }
  if (view === 'profile') {
    $('#view-profile').classList.add('active');
    $('#view-title').textContent = 'الملف التعريفي';
    await loadProfile();
    return;
  }
  activeResource = view;
  const config = resources[view];
  $('#view-list').classList.add('active');
  $('#view-title').textContent = config.title;
  $('#view-description').textContent = config.description;
  $('#add-button').textContent = `＋ إضافة ${config.title === 'المنتجات' ? 'منتج' : config.title === 'مشاريعنا' ? 'مشروع' : config.title === 'عملاؤنا' ? 'عميل' : config.title === 'الموردون' ? 'مورد' : 'قسم'}`;
  $('#records-head').innerHTML = `<tr>${config.columns.map(column => `<th>${column}</th>`).join('')}</tr>`;
  await loadRecords();
}

$('#add-button').addEventListener('click', () => openDialog());

async function loadCategories() {
  const { data } = await client.from('rrr_categories').select('id,name').order('sort_order');
  categories = data || [];
}

async function loadStats() {
  const keys = ['products','projects','clients','suppliers'];
  const labels = ['المنتجات','المشاريع','العملاء','الموردون'];
  const counts = await Promise.all(keys.map(key => client.from(resources[key].table).select('*',{count:'exact',head:true})));
  $('#stats-grid').innerHTML = keys.map((key,index) => `<article class="stat-card"><div><strong>${counts[index].count || 0}</strong><span>${labels[index]}</span></div><i>${resources[key].icon}</i></article>`).join('');
}

async function loadRecords() {
  const config = resources[activeResource];
  let query = client.from(config.table).select(activeResource === 'products' ? '*,rrr_categories(name)' : '*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
  const { data, error } = await query;
  if (error) return notify('تعذر تحميل البيانات.', true);
  records = data || [];
  renderRecords();
}

function recordCells(record) {
  const status = `<span class="badge${record.is_active ? '' : ' off'}">${record.is_active ? 'ظاهر' : 'مخفي'}</span>`;
  const image = record.image_url || record.logo_url;
  const title = record.name || record.title;
  const titleCell = `<div class="record-title">${image ? `<img src="${escapeHtml(image)}" alt="">` : ''}<div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(record.sku || '')}</small></div></div>`;
  if (activeResource === 'products') return [titleCell, escapeHtml(record.rrr_categories?.name || 'بدون قسم'), record.datasheet_url ? `<a href="${escapeHtml(record.datasheet_url)}" target="_blank">عرض PDF</a>` : '—', status];
  if (activeResource === 'categories') return [titleCell, escapeHtml(record.description || '—'), record.sort_order ?? 0, status];
  if (activeResource === 'projects') return [titleCell, escapeHtml(record.category || '—'), escapeHtml(record.location || '—'), status];
  return [titleCell, escapeHtml(record.sector || record.country || '—'), record.website_url ? `<a href="${escapeHtml(record.website_url)}" target="_blank">زيارة الموقع</a>` : '—', status];
}

function renderRecords() {
  $('#empty-state').hidden = records.length > 0;
  $('.table-wrap').hidden = records.length === 0;
  $('#records-body').innerHTML = records.map(record => `<tr>${recordCells(record).map(cell => `<td>${cell}</td>`).join('')}<td><div class="row-actions"><button data-edit="${record.id}">تعديل</button><button class="delete" data-delete="${record.id}">حذف</button></div></td></tr>`).join('');
}

$('#records-body').addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit]');
  const remove = event.target.closest('[data-delete]');
  if (edit) openDialog(records.find(record => record.id === edit.dataset.edit));
  if (remove) await deleteRecord(remove.dataset.delete);
});

async function deleteRecord(id) {
  const record = records.find(item => item.id === id);
  if (!confirm(`هل تريد حذف «${record.name || record.title}» نهائيًا؟`)) return;
  const { error } = await client.from(resources[activeResource].table).delete().eq('id', id);
  if (error) return notify('تعذر حذف العنصر.', true);
  notify('تم حذف العنصر.');
  await Promise.all([loadRecords(), loadStats()]);
}

function fieldMarkup([name,label,type,required], record = {}) {
  const value = record[name] ?? '';
  const wide = type.includes('wide') ? ' wide' : '';
  if (type.startsWith('textarea')) return `<label class="${wide}">${label}<textarea name="${name}" rows="4" ${required?'required':''}>${escapeHtml(value)}</textarea></label>`;
  if (type === 'category') return `<label>${label}<select name="${name}"><option value="">بدون قسم</option>${categories.map(item => `<option value="${item.id}" ${item.id===value?'selected':''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>`;
  if (type === 'checkbox') return `<label><span>${label}</span><select name="${name}"><option value="true" ${value !== false?'selected':''}>نعم</option><option value="false" ${value === false?'selected':''}>لا</option></select></label>`;
  if (type === 'image' || type === 'pdf') {
    const currentKey = name.includes('logo') ? 'logo_url' : name.includes('datasheet') ? 'datasheet_url' : 'image_url';
    return `<label class="${wide}">${label}<input name="${name}" type="file" accept="${type==='pdf'?'.pdf':'image/jpeg,image/png,image/webp'}">${record[currentKey] ? `<small><a href="${escapeHtml(record[currentKey])}" target="_blank">عرض الملف الحالي</a></small>` : ''}</label>`;
  }
  return `<label class="${wide}">${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${required?'required':''}></label>`;
}

function openDialog(record = null) {
  editingRecord = record;
  const config = resources[activeResource];
  $('#dialog-eyebrow').textContent = config.title;
  $('#dialog-title').textContent = record ? `تعديل ${record.name || record.title}` : 'إضافة عنصر جديد';
  $('#record-fields').innerHTML = config.fields.map(field => fieldMarkup(field, record || {})).join('');
  setMessage($('#record-message'), '');
  $('#record-dialog').showModal();
}

async function uploadFile(file, folder) {
  if (!file || !file.size) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { error } = await client.storage.from('rrr-assets').upload(path, file, {cacheControl:'3600',upsert:false});
  if (error) throw error;
  return client.storage.from('rrr-assets').getPublicUrl(path).data.publicUrl;
}

$('#record-form').addEventListener('submit', async event => {
  event.preventDefault();
  const saveButton = $('#save-record');
  saveButton.disabled = true;
  saveButton.textContent = 'جارٍ الحفظ...';
  setMessage($('#record-message'), '');
  try {
    const form = new FormData(event.currentTarget);
    const config = resources[activeResource];
    const payload = {};
    for (const [name,,type] of config.fields) {
      if (['image','pdf'].includes(type)) continue;
      if (type === 'checkbox') payload[name] = form.get(name) === 'true';
      else if (type === 'number') payload[name] = Number(form.get(name) || 0);
      else payload[name] = form.get(name) || null;
    }
    if (['products','categories'].includes(activeResource)) payload.slug = editingRecord?.slug || slugify(payload.name);
    $('#upload-progress').hidden = false;
    const imageFile = form.get('image_file') || form.get('logo_file');
    const pdfFile = form.get('datasheet_file');
    const imageUrl = await uploadFile(imageFile, `${activeResource}/images`);
    const pdfUrl = await uploadFile(pdfFile, 'products/datasheets');
    if (imageUrl) payload[activeResource === 'clients' || activeResource === 'suppliers' ? 'logo_url' : 'image_url'] = imageUrl;
    if (pdfUrl) payload.datasheet_url = pdfUrl;
    $('#upload-progress').hidden = true;
    const operation = editingRecord ? client.from(config.table).update(payload).eq('id',editingRecord.id) : client.from(config.table).insert(payload);
    const { error } = await operation;
    if (error) throw error;
    $('#record-dialog').close();
    notify(editingRecord ? 'تم حفظ التعديلات.' : 'تمت الإضافة بنجاح.');
    await Promise.all([loadRecords(), loadStats(), activeResource === 'categories' ? loadCategories() : Promise.resolve()]);
  } catch (error) {
    console.error(error);
    $('#upload-progress').hidden = true;
    setMessage($('#record-message'), 'تعذر الحفظ. تحقق من البيانات وحاول مرة أخرى.');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'حفظ';
  }
});

async function loadProfile() {
  const { data, error } = await client.from('rrr_company_profile').select('*').eq('id','main').single();
  if (error) return notify('تعذر تحميل بيانات الشركة.', true);
  Object.entries(data).forEach(([key,value]) => {
    const field = $(`[name="${key}"]`, $('#profile-form'));
    if (field) field.value = value || '';
  });
}

$('#profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const { error } = await client.from('rrr_company_profile').update(values).eq('id','main');
  if (error) return setMessage($('#profile-message'),'تعذر حفظ بيانات الشركة.');
  setMessage($('#profile-message'),'تم حفظ بيانات الشركة بنجاح.',true);
  notify('تم تحديث الملف التعريفي.');
});

init();
