import { SUPABASE_URL, SUPABASE_ANON_KEY, cmsConfigured } from './cms-config.js';

if (cmsConfigured && window.supabase) {
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const safeUrl = value => /^https:\/\//i.test(value || '') ? value : '';

  async function loadProfile() {
    const { data } = await client.from('rrr_company_profile').select('*').eq('id','main').maybeSingle();
    if (!data) return;
    document.querySelectorAll('[data-profile]').forEach(element => {
      const value = data[element.dataset.profile];
      if (value) element.textContent = value;
    });
  }

  async function loadHome() {
    const categoryGrid = document.querySelector('#category-grid');
    const productGrid = document.querySelector('#cms-products-grid');
    const projectGrid = document.querySelector('#cms-projects-grid');
    if (categoryGrid) {
      const { data } = await client.from('rrr_categories').select('*').eq('is_active',true).order('sort_order');
      if (data?.length) categoryGrid.innerHTML = data.map((item,index) => `<article class="category-card${index===1?' featured':''}">${safeUrl(item.image_url)?`<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">`:''}<div><span>${String(index+1).padStart(2,'0')}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || '')}</p><a href="#catalog">استعرض المنتجات ←</a></div></article>`).join('');
    }
    if (productGrid) {
      const { data } = await client.from('rrr_products').select('*,rrr_categories(name)').eq('is_active',true).order('sort_order');
      if (data?.length) {
        productGrid.innerHTML = data.map(item => `<article class="cms-product-card">${safeUrl(item.image_url)?`<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">`:'<div class="cms-image-placeholder">R R R</div>'}<div><small>${escapeHtml(item.rrr_categories?.name || 'مواد التشطيب')}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.short_description || '')}</p><div class="cms-card-actions">${item.datasheet_url?`<a href="${escapeHtml(item.datasheet_url)}" target="_blank" rel="noopener">ملف البيانات PDF</a>`:''}<a href="#quote">طلب عرض سعر</a></div></div></article>`).join('');
        document.querySelector('#catalog').hidden = false;
      }
    }
    if (projectGrid) {
      const { data } = await client.from('rrr_projects').select('*').eq('is_active',true).order('sort_order');
      if (data?.length) {
        projectGrid.innerHTML = data.map(item => `<article class="cms-project-card">${safeUrl(item.image_url)?`<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">`:''}<div><small>${escapeHtml(item.category || 'مشاريع التوريد')}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || '')}</p><span>${escapeHtml(item.location || '')}</span></div></article>`).join('');
        document.querySelector('#projects-cms').hidden = false;
      }
    }
  }

  async function loadPartners(type) {
    const grid = document.querySelector(`#cms-${type}-grid`);
    if (!grid) return;
    const table = type === 'clients' ? 'rrr_clients' : 'rrr_suppliers';
    const { data } = await client.from(table).select('*').eq('is_active',true).order('sort_order');
    if (!data?.length) return;
    grid.innerHTML = data.map(item => `<article class="cms-partner-card">${safeUrl(item.logo_url)?`<img src="${escapeHtml(item.logo_url)}" alt="شعار ${escapeHtml(item.name)}">`:'<div class="cms-logo-placeholder">R R R</div>'}<div><small>${escapeHtml(item.sector || item.country || '')}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || '')}</p>${safeUrl(item.website_url)?`<a href="${escapeHtml(item.website_url)}" target="_blank" rel="noopener">الموقع الإلكتروني ←</a>`:''}</div></article>`).join('');
    grid.closest('section').hidden = false;
  }

  loadProfile();
  loadHome();
  loadPartners('clients');
  loadPartners('suppliers');
}
