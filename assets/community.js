(function () {
  const root = document.querySelector('[data-community]');
  if (!root) return;
  const cfg = window.RLS_SUPABASE_CONFIG;
  const db = cfg && window.supabase ? window.supabase.createClient(cfg.url, cfg.publishableKey) : null;
  const search = root.querySelector('#member-search');
  const category = root.querySelector('#member-category');
  const country = root.querySelector('#member-country');
  const wrap = root.querySelector('.community-members');
  const labels = {
    fa: {student:'دانشجو',graduate:'دانش‌آموخته',faculty:'استاد و عضو هیئت علمی',researcher:'پژوهشگر',translator:'مترجم',culture:'ادبیات و فرهنگ',honorary:'عضو افتخاری'},
    en: {student:'Student',graduate:'Graduate',faculty:'Faculty member',researcher:'Researcher',translator:'Translator',culture:'Literature and culture',honorary:'Honorary member'},
    ru: {student:'Студент',graduate:'Выпускник',faculty:'Преподаватель',researcher:'Исследователь',translator:'Переводчик',culture:'Литература и культура',honorary:'Почётный участник'}
  };
  const lang = document.documentElement.lang || 'en';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cards = [];
  function filter() {
    const q = (search?.value || '').trim().toLocaleLowerCase();
    let shown = 0;
    cards.forEach(card => {
      const ok = (!category?.value || category.value === card.dataset.category) &&
        (!country?.value || country.value === card.dataset.country) &&
        (!q || (card.dataset.search || '').toLocaleLowerCase().includes(q));
      card.hidden = !ok;
      if (ok) shown++;
    });
    const empty = wrap.querySelector('.community-empty');
    if (empty) empty.hidden = shown > 0;
    root.querySelectorAll('[data-category-filter]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.categoryFilter === (category?.value || ''))));
  }
  function initials(name) {
    return String(name || 'RLS').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toLocaleUpperCase();
  }
  async function load() {
    if (!db) {
      wrap.innerHTML = '<div class="community-empty">Member directory is temporarily unavailable.</div>';
      return;
    }
    wrap.innerHTML = '<div class="community-empty">Loading approved members…</div>';
    const { data, error } = await db.from('rls_public_members')
      .select('user_id,display_name,category,country,city,institution,degree,specialty,bio,website_url,orcid')
      .order('display_name', { ascending: true });
    if (error) {
      wrap.innerHTML = '<div class="community-empty">Could not load the member directory. Please try again later.</div>';
      return;
    }
    if (!data || !data.length) {
      wrap.innerHTML = '<div class="community-empty">' +
        (lang === 'fa' ? 'پروفایل اعضا پس از تأیید انجمن در این بخش نمایش داده خواهد شد.' :
         lang === 'ru' ? 'Профили появятся здесь после утверждения заявок.' :
         'Approved member profiles will appear here.') + '</div>';
      return;
    }
    wrap.innerHTML = data.map(m => {
      const name = esc(m.display_name || 'RLS Member');
      const desc = [m.specialty,m.institution,m.city,m.country].filter(Boolean).join(' · ');
      const hay = [m.display_name,m.specialty,m.institution,m.city,m.country,m.bio].filter(Boolean).join(' ');
      const website = m.website_url ? '<a href="' + esc(m.website_url) +
        '" target="_blank" rel="noopener noreferrer">Website</a>' : '';
      return '<article class="community-member" data-category="' + esc(m.category) +
        '" data-country="' + esc(m.country || '') + '" data-search="' + esc(hay) + '">' +
        '<div class="community-avatar">' + esc(initials(m.display_name)) + '</div><h3>' + name +
        '</h3><span class="member-category">' + esc((labels[lang] || labels.en)[m.category] || m.category) +
        '</span><p>' + esc(desc) + '</p>' + website + '</article>';
    }).join('');
    cards = [...wrap.querySelectorAll('.community-member')];
    if (country) {
      const current = country.value;
      const allLabel = lang === 'fa' ? 'همه کشورها' : lang === 'ru' ? 'Все страны' : 'All countries';
      const countries = [...new Set(data.map(m => m.country).filter(Boolean))].sort();
      country.innerHTML = '<option value="">' + allLabel + '</option>' +
        countries.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
      country.value = current;
    }
    filter();
  }
  search?.addEventListener('input', filter);
  category?.addEventListener('change', filter);
  country?.addEventListener('change', filter);
  root.querySelectorAll('[data-category-filter]').forEach(b => b.addEventListener('click', () => {
    if (category) category.value = b.dataset.categoryFilter || '';
    filter();
  }));
  root.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
    if (search) search.value = '';
    if (category) category.value = '';
    if (country) country.value = '';
    filter();
  });
  load();
})();