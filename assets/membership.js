(function () {
  const cfg = window.RLS_SUPABASE_CONFIG;
  if (!cfg || !window.supabase) return;
  const db = window.RLS_SUPABASE_CLIENT || (window.RLS_SUPABASE_CLIENT = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
  const register = document.getElementById('membership-register');
  const login = document.getElementById('membership-login');
  if (!register || !login) return;
  const regMsg = document.getElementById('register-message');
  const loginMsg = document.getElementById('login-message');
  const sessionBox = document.getElementById('member-session');
  const membershipGrid = document.querySelector('#membership-process .membership-grid');
  const membershipNote = document.querySelector('#membership-process .membership-access-column > .community-note:not(#member-authenticated-note)');
  const membershipPrivacy = document.querySelector('#membership-process .membership-privacy');
  const authenticatedNote = document.getElementById('member-authenticated-note');
  const sessionText = document.getElementById('member-session-text');
  const profileMsg = document.getElementById('member-profile-message');
  const profileEntry = document.getElementById('member-profile-entry');
  const profileOpen = document.getElementById('member-profile-open');
  const profileEntryNote = document.getElementById('member-profile-entry-note');
  let memberIsAuthenticated = false;
  const reportUpload = value => say(profileMsg || loginMsg, value);
  const allowed = ['student','graduate','faculty','researcher','translator','culture','honorary'];
  const maxBytes = 5 * 1024 * 1024;
  const types = ['application/pdf','image/jpeg','image/png','image/webp'];
  const avatarTypes = ['image/jpeg','image/png','image/webp'];
  const lang = document.documentElement.lang;
  const tr = (fa,en,ru) => lang === 'fa' ? fa : lang === 'ru' ? ru : en;
  const say = (el, value) => { if (el) el.textContent = value; };
  const clean = value => String(value || '').trim();

  const avatarQueueDbName = 'rls-membership-pending';
  function openAvatarQueue() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error(tr('ذخیره امن عکس در این مرورگر پشتیبانی نمی‌شود. از مرورگر دیگری استفاده کنید.',
          'This browser cannot securely retain the photo while email is confirmed. Please use another browser.',
          'Этот браузер не поддерживает временное сохранение фотографии. Используйте другой браузер.')));
        return;
      }
      const request = window.indexedDB.open(avatarQueueDbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('avatars')) {
          request.result.createObjectStore('avatars');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open the local upload queue.'));
    });
  }

  async function queueAvatar(email, file) {
    const localDb = await openAvatarQueue();
    const key = clean(email).toLowerCase();
    await new Promise((resolve, reject) => {
      const tx = localDb.transaction('avatars', 'readwrite');
      tx.objectStore('avatars').put(file, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save the selected photo.'));
      tx.onabort = () => reject(tx.error || new Error('Saving the selected photo was cancelled.'));
    });
    localDb.close();
  }

  async function readQueuedAvatar(email) {
    const localDb = await openAvatarQueue();
    const key = clean(email).toLowerCase();
    const file = await new Promise((resolve, reject) => {
      const tx = localDb.transaction('avatars', 'readonly');
      const request = tx.objectStore('avatars').get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not retrieve the saved photo.'));
    });
    localDb.close();
    return file;
  }

  async function removeQueuedAvatar(email) {
    const localDb = await openAvatarQueue();
    const key = clean(email).toLowerCase();
    await new Promise((resolve, reject) => {
      const tx = localDb.transaction('avatars', 'readwrite');
      tx.objectStore('avatars').delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not remove the temporary photo.'));
    });
    localDb.close();
  }

  async function completeQueuedAvatar(user) {
    if (!user?.email) return false;
    const file = await readQueuedAvatar(user.email);
    if (!file || !file.size) return false;
    await uploadAvatar(user, file);
    await removeQueuedAvatar(user.email);
    return true;
  }

  function profileData(user) {
    const m = user.user_metadata || {};
    return {
      user_id: user.id, full_name: clean(m.full_name),
      display_name: clean(m.display_name) || null,
      category: allowed.includes(m.category) ? m.category : null,
      email: user.email || null, country: clean(m.country) || null,
      city: clean(m.city) || null, institution: clean(m.institution) || null,
      degree: clean(m.degree) || null, specialty: clean(m.specialty) || null,
      bio: clean(m.bio) || null,
      profile_headline: clean(m.profile_headline) || null,
      memberships: clean(m.memberships) || null,
      activities: clean(m.activities) || null,
      publications: clean(m.publications) || null,
      research_interests: clean(m.research_interests) || null,
      languages: clean(m.languages) || null,
      full_name_en: clean(m.full_name_en) || null,
      full_name_ru: clean(m.full_name_ru) || null,
      display_name_en: clean(m.display_name_en) || null,
      display_name_ru: clean(m.display_name_ru) || null,
      profile_headline_en: clean(m.profile_headline_en) || null,
      profile_headline_ru: clean(m.profile_headline_ru) || null,
      country_en: clean(m.country_en) || null,
      country_ru: clean(m.country_ru) || null,
      city_en: clean(m.city_en) || null,
      city_ru: clean(m.city_ru) || null,
      institution_en: clean(m.institution_en) || null,
      institution_ru: clean(m.institution_ru) || null,
      degree_en: clean(m.degree_en) || null,
      degree_ru: clean(m.degree_ru) || null,
      specialty_en: clean(m.specialty_en) || null,
      specialty_ru: clean(m.specialty_ru) || null,
      bio_en: clean(m.bio_en) || null,
      bio_ru: clean(m.bio_ru) || null,
      memberships_en: clean(m.memberships_en) || null,
      memberships_ru: clean(m.memberships_ru) || null,
      activities_en: clean(m.activities_en) || null,
      activities_ru: clean(m.activities_ru) || null,
      publications_en: clean(m.publications_en) || null,
      publications_ru: clean(m.publications_ru) || null,
      research_interests_en: clean(m.research_interests_en) || null,
      research_interests_ru: clean(m.research_interests_ru) || null,
      languages_en: clean(m.languages_en) || null,
      languages_ru: clean(m.languages_ru) || null,
      website_url: clean(m.website_url) || null,
      orcid: clean(m.orcid) || null, membership_status: 'pending',
      is_public: false, reviewed_by: null, reviewed_at: null, review_note: null
    };
  }

  const ownProfileFields = 'user_id,full_name,display_name,category,email,email_public,phone,phone_public,country,city,institution,degree,specialty,bio,full_name_en,full_name_ru,display_name_en,display_name_ru,profile_headline_en,profile_headline_ru,country_en,country_ru,city_en,city_ru,institution_en,institution_ru,degree_en,degree_ru,specialty_en,specialty_ru,bio_en,bio_ru,memberships_en,memberships_ru,activities_en,activities_ru,publications_en,publications_ru,research_interests_en,research_interests_ru,languages_en,languages_ru,avatar_path,pending_avatar_path,website_url,orcid,profile_headline,memberships,activities,publications,research_interests,languages,membership_status,created_at,reviewed_at';

  async function ensureProfile(user) {
    const { data: existing, error: readError } = await db.from('rls_profiles')
      .select(ownProfileFields).eq('user_id', user.id).maybeSingle();
    if (readError) throw readError;
    if (existing) return existing;
    const profile = profileData(user);
    if (!profile.full_name || !profile.category) {
      throw new Error(tr('اطلاعات درخواست در حساب پیدا نشد. با همان ایمیل ثبت‌نام‌شده وارد شوید.',
        'Application details were not found. Please use the email address used at registration.',
        'Данные заявки не найдены. Войдите с адресом, использованным при регистрации.'));
    }
    const { data, error } = await db.from('rls_profiles').insert(profile)
      .select(ownProfileFields).single();
    if (error) throw error;
    // Notify the administrator only after a new pending profile was created.
    try {
      const { data: sessionData } = await db.auth.getSession();
      if (sessionData.session?.access_token) {
        await db.functions.invoke('notify-membership-request', {
          headers: { Authorization: 'Bearer ' + sessionData.session.access_token },
          body: {}
        });
      }
    } catch (notifyError) {
      console.warn('Membership notification could not be sent:', notifyError);
    }
    return data;
  }

  function statusLabel(status) {
    const labels = {
      pending: tr('در انتظار بررسی مدیر','Awaiting administrator review','Ожидает проверки администратора'),
      approved: tr('عضویت تأیید شده است','Membership approved','Членство одобрено'),
      rejected: tr('درخواست تأیید نشده است','Application not approved','Заявка не одобрена'),
      suspended: tr('عضویت تعلیق شده است','Membership suspended','Членство приостановлено')
    };
    return labels[status] || status;
  }

  function categoryLabel(category) {
    const labels = {
      student: tr('دانشجو','Student','Студент'),
      graduate: tr('دانش‌آموخته','Graduate','Выпускник'),
      faculty: tr('استاد و عضو هیئت علمی','Faculty member','Преподаватель'),
      researcher: tr('پژوهشگر','Researcher','Исследователь'),
      translator: tr('مترجم','Translator','Переводчик'),
      culture: tr('ادبیات و فرهنگ','Literature and culture','Литература и культура'),
      honorary: tr('عضو افتخاری','Honorary member','Почётный участник')
    };
    return labels[category] || category || '—';
  }

  function formatMemberDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const locale = lang === 'fa' ? 'fa-IR' : lang === 'ru' ? 'ru-RU' : 'en-GB';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  }

  function renderMemberProfile(profile, user) {
    const localized = key => lang === 'fa' ? (profile[key] || '') : (profile[key + '_' + lang] || '');
    const name = localized('full_name') || localized('display_name') || user.email || tr('عضو انجمن','RLS member','Участник RLS');
    const nameEl = document.getElementById('member-profile-name');
    const categoryEl = document.getElementById('member-profile-category');
    const categoryCopyEl = document.getElementById('member-profile-category-copy');
    const joinedEl = document.getElementById('member-profile-joined');
    const joinedLabelEl = document.getElementById('member-profile-joined-label');
    const avatarEl = document.getElementById('member-profile-avatar');
    const fallbackEl = document.getElementById('member-profile-avatar-fallback');
    const avatarReviewEl = document.getElementById('member-avatar-review-note');
    const fieldsEl = document.getElementById('member-profile-fields');
    if (nameEl) nameEl.textContent = name;
    if (categoryEl) categoryEl.textContent = categoryLabel(profile.category);
    if (categoryCopyEl) categoryCopyEl.textContent = categoryLabel(profile.category);
    const isApproved = profile.membership_status === 'approved';
    if (joinedLabelEl) joinedLabelEl.textContent = isApproved
      ? tr('تاریخ عضویت','Membership date','Дата вступления')
      : tr('تاریخ ثبت درخواست','Application date','Дата подачи заявки');
    if (joinedEl) joinedEl.textContent = formatMemberDate(isApproved && profile.reviewed_at ? profile.reviewed_at : profile.created_at);

    if (avatarEl && fallbackEl) {
      const initials = String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toLocaleUpperCase();
      fallbackEl.textContent = initials || 'RLS';
      avatarEl.onerror = () => { avatarEl.hidden = true; fallbackEl.hidden = false; };
      const visibleAvatarPath = profile.pending_avatar_path || profile.avatar_path;
      if (visibleAvatarPath) {
        const publicUrl = db.storage.from('rls-member-avatars').getPublicUrl(visibleAvatarPath).data.publicUrl;
        avatarEl.src = publicUrl;
        avatarEl.alt = tr('عکس پروفایل ','Profile photo of ','Фотография профиля ') + name;
        avatarEl.hidden = false;
        fallbackEl.hidden = true;
      } else {
        avatarEl.removeAttribute('src');
        avatarEl.hidden = true;
        fallbackEl.hidden = false;
      }
      if (avatarReviewEl) {
        avatarReviewEl.hidden = !profile.pending_avatar_path;
        avatarReviewEl.textContent = profile.pending_avatar_path
          ? tr('عکس جدید ارسال شده و در انتظار تأیید مدیر است. عکس قبلی تا زمان تأیید در فهرست عمومی باقی می‌ماند.',
            'Your new photo is awaiting administrator approval. Your current public photo remains visible until approval.',
            'Новая фотография ожидает одобрения администратора. Текущая фотография останется в открытом каталоге до подтверждения.')
          : '';
      }
    }

    const editForm = document.getElementById('member-profile-edit');
    if (editForm) {
      ['full_name','display_name','category','profile_headline','phone','country','city','institution','degree','specialty','bio','memberships','activities','publications','research_interests','languages','full_name_en','full_name_ru','display_name_en','display_name_ru','profile_headline_en','profile_headline_ru','country_en','country_ru','city_en','city_ru','institution_en','institution_ru','degree_en','degree_ru','specialty_en','specialty_ru','bio_en','bio_ru','memberships_en','memberships_ru','activities_en','activities_ru','publications_en','publications_ru','research_interests_en','research_interests_ru','languages_en','languages_ru','website_url','orcid'].forEach(key => {
        const input = editForm.elements.namedItem(key);
        if (input) input.value = (['full_name','display_name','profile_headline','country','city','institution','degree','specialty','bio','memberships','activities','publications','research_interests','languages'].includes(key) && lang !== 'fa') ? localized(key) : (profile[key] || '');
      });
      const emailInput = editForm.elements.namedItem('email');
      if (emailInput) emailInput.value = profile.email || user.email || '';
      const phonePublicInput = editForm.elements.namedItem('phone_public');
      if (phonePublicInput) phonePublicInput.checked = !!profile.phone_public;
      const emailPublicInput = editForm.elements.namedItem('email_public');
      if (emailPublicInput) emailPublicInput.checked = !!profile.email_public;
    }

    if (fieldsEl) {
      const fields = [
        ...(profile.email_public ? [[tr('ایمیل','Email','Электронная почта'), profile.email || user.email]] : []),
        [tr('شماره تماس','Phone','Телефон'), profile.phone],
        [tr('کشور','Country','Страна'), localized('country')],
        [tr('شهر','City','Город'), localized('city')],
        [tr('دانشگاه یا مؤسسه','Institution','Учреждение'), localized('institution')],
        [tr('مدرک تحصیلی','Degree','Степень'), localized('degree')],
        [tr('تخصص','Specialty','Специализация'), localized('specialty')],
        [tr('زندگی‌نامه و سوابق','Biography','Биография'), localized('bio')],
        ['ORCID', profile.orcid]
      ].filter(item => clean(item[1]));
      fieldsEl.replaceChildren();
      fields.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'member-profile-field';
        const title = document.createElement('strong');
        title.textContent = label;
        const detail = document.createElement('span');
        detail.textContent = value;
        row.append(title, detail);
        fieldsEl.append(row);
      });
      const website = profile.website_url;
      if (website) {
        try {
          const url = new URL(website);
          if (url.protocol === 'https:' || url.protocol === 'http:') {
            const row = document.createElement('div');
            row.className = 'member-profile-field';
            const title = document.createElement('strong');
            title.textContent = tr('وب‌سایت','Website','Веб-сайт');
            const link = document.createElement('a');
            link.href = url.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = url.hostname;
            row.append(title, link);
            fieldsEl.append(row);
          }
        } catch (_) {}
      }
    }
  }

  async function showSession(user) {
    if (!user) return;
    memberIsAuthenticated = true;
    if (membershipGrid) membershipGrid.hidden = true;
    if (membershipNote) membershipNote.hidden = true;
    if (membershipPrivacy) membershipPrivacy.hidden = true;
    if (authenticatedNote) authenticatedNote.hidden = false;
    sessionBox.hidden = true;
    if (profileEntry) profileEntry.hidden = false;
    if (profileOpen) profileOpen.textContent = tr('ورود به صفحه شخصی','Open my personal page','Открыть личную страницу');
    if (profileEntryNote) profileEntryNote.textContent = tr('حساب شما فعال است؛ برای مشاهده و تنظیم پروفایل کلیک کنید.','You are signed in. Open your personal page to manage your profile.','Вы вошли в систему. Откройте личную страницу для настройки профиля.');
    if (profileMsg) {
      profileMsg.textContent = tr('خوش آمدید! به پروفایل اختصاصی خود وارد شده‌اید.',
        'Welcome! You are now in your member profile.',
        'Добро пожаловать! Вы вошли в свой профиль.');
      profileMsg.classList.add('membership-success');
    }
    sessionText.textContent = tr('ورود موفق بود؛ در حال دریافت مشخصات پروفایل…',
      'Signed in; loading your profile…','Вход выполнен; загружается профиль…') +
      (user.email ? ' · ' + user.email : '');
    try {
      const profile = await ensureProfile(user);
      renderMemberProfile(profile, user);
      sessionText.textContent = tr('وضعیت عضویت: ','Membership status: ','Статус членства: ') +
        statusLabel(profile.membership_status);
      say(loginMsg, '');
    } catch (error) {
      say(loginMsg, tr('ورود موفق بود؛ دریافت پروفایل با خطا روبه‌رو شد: ',
        'Signed in, but the profile could not be loaded: ',
        'Вход выполнен, но не удалось загрузить профиль: ') + (error?.message || String(error)));
    }
  }

  document.getElementById('member-profile-edit')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const original = button?.textContent || '';
    if (button) { button.disabled = true; button.textContent = tr('در حال ذخیره…','Saving…','Сохранение…'); }
    try {
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData?.session?.user;
      if (!user) throw new Error(tr('ابتدا وارد حساب شوید.','Please sign in first.','Сначала войдите в систему.'));
      const { data: currentProfile, error: profileReadError } = await db.from('rls_profiles')
        .select('user_id,membership_status').eq('user_id', user.id).maybeSingle();
      if (profileReadError) throw profileReadError;
      if (!currentProfile) {
        throw new Error(tr('پروفایل این حساب پیدا نشد؛ از حساب خارج شوید و با ایمیل ثبت‌شده برای عضویت دوباره وارد شوید.',
          'No membership profile is linked to this signed-in account. Sign out and use the email address registered for membership.',
          'Профиль участника не связан с этой учётной записью. Выйдите и войдите с адресом, указанным при регистрации.'));
      }
      if (currentProfile.membership_status === 'suspended') {
        throw new Error(tr('عضویت این حساب تعلیق شده و ویرایش اطلاعات تا بررسی مدیر امکان‌پذیر نیست.',
          'This membership is suspended, so profile editing is disabled until an administrator reviews it.',
          'Членство приостановлено; редактирование профиля недоступно до проверки администратором.'));
      }
      const keys = ['full_name','display_name','category','profile_headline','phone','country','city','institution','degree','specialty','bio','memberships','activities','publications','research_interests','languages','full_name_en','full_name_ru','display_name_en','display_name_ru','profile_headline_en','profile_headline_ru','country_en','country_ru','city_en','city_ru','institution_en','institution_ru','degree_en','degree_ru','specialty_en','specialty_ru','bio_en','bio_ru','memberships_en','memberships_ru','activities_en','activities_ru','publications_en','publications_ru','research_interests_en','research_interests_ru','languages_en','languages_ru','website_url','orcid'];
      const payload = {};
      keys.forEach(key => { payload[key] = clean(form.elements.namedItem(key)?.value) || null; });
      if (lang !== 'fa') ['full_name','display_name','profile_headline','country','city','institution','degree','specialty','bio','memberships','activities','publications','research_interests','languages'].forEach(key => { if (!payload[key + '_' + lang]) payload[key + '_' + lang] = payload[key]; });
      payload.phone_public = !!form.elements.namedItem('phone_public')?.checked;
      payload.email_public = !!form.elements.namedItem('email_public')?.checked;
      if (payload.website_url) {
        const url = new URL(payload.website_url);
        if (!['https:','http:'].includes(url.protocol)) throw new Error(tr('نشانی وب‌سایت معتبر نیست.','Enter a valid website URL.','Укажите корректный адрес сайта.'));
      }
      let { data: updated, error } = await db.from('rls_profiles').update(payload)
        .eq('user_id', user.id).select(ownProfileFields).maybeSingle();
      if (error) throw error;
      if (!updated) {
        const { data: refreshed, error: refreshError } = await db.auth.refreshSession();
        if (refreshError) throw refreshError;
        if (!refreshed?.session?.user || refreshed.session.user.id !== user.id) {
          throw new Error(tr('نشست ورود با پروفایل عضویت مطابقت ندارد؛ خارج شوید و دوباره با حساب صحیح وارد شوید.',
            'The active sign-in session does not match this membership profile. Sign out and sign in with the correct account.',
            'Активный сеанс не соответствует профилю участника. Выйдите и войдите в правильную учётную запись.'));
        }
        const retry = await db.from('rls_profiles').update(payload)
          .eq('user_id', user.id).select(ownProfileFields).maybeSingle();
        updated = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      if (!updated) throw new Error(tr('پروفایل خوانده می‌شود، اما پایگاه داده اجازه ثبت تغییرات را نمی‌دهد. لطفاً یک‌بار خارج شوید و دوباره وارد شوید؛ اگر خطا تکرار شد، جزئیات نشست ورود را بررسی می‌کنیم.',
        'The profile is readable, but the database did not accept the update. Sign out and sign in once; if the issue continues, we will inspect the active session details.',
        'Профиль доступен для чтения, но база данных не приняла изменения. Выйдите и войдите снова; если ошибка повторится, проверим параметры сеанса.'));
      renderMemberProfile(updated, user);
      say(profileMsg, tr('اطلاعات پروفایل با موفقیت ذخیره شد.','Profile information saved successfully.','Данные профиля успешно сохранены.'));
    } catch (error) {
      say(profileMsg, tr('ذخیره اطلاعات ناموفق بود: ','Could not save profile: ','Не удалось сохранить профиль: ') + (error?.message || String(error)));
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  });

  async function uploadAvatar(user, file) {
    if (!file) { reportUpload(tr('ابتدا عکس را انتخاب کنید.','Choose a photo first.','Сначала выберите фотографию.')); return; }
    if (!avatarTypes.includes(file.type) || file.size > maxBytes) {
      reportUpload(tr('عکس باید JPG، PNG یا WebP و حداکثر ۵ مگابایت باشد.','Use a JPG, PNG or WebP image no larger than 5 MB.','Допустимы JPG, PNG или WebP размером до 5 МБ.'));
      return;
    }
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = user.id + '/avatar-' + Date.now() + '.' + ext;
    reportUpload(tr('در حال بارگذاری عکس پروفایل…','Uploading profile photo…','Загрузка фотографии профиля…'));
    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.access_token || sessionData.session.user.id !== user.id) {
      throw new Error(tr('نشست ورود در دسترس نیست؛ یک‌بار خارج شوید و دوباره وارد شوید.',
        'The authenticated session is unavailable. Please sign out and sign in again.',
        'Сеанс авторизации недоступен. Выйдите и войдите снова.'));
    }
    const { data: oldProfile, error: readProfileError } = await db.from('rls_profiles')
      .select('pending_avatar_path,membership_status').eq('user_id', user.id).maybeSingle();
    if (readProfileError) throw readProfileError;
    if (!oldProfile) {
      throw new Error(tr('پروفایل عضویت شما در پایگاه داده پیدا نشد. با مدیر انجمن تماس بگیرید.',
        'Your membership profile was not found. Please contact the association administrator.',
        'Профиль участника не найден. Свяжитесь с администратором.'));
    }
    if (oldProfile.membership_status === 'suspended') {
      throw new Error(tr('وضعیت عضویت حساب شما «تعلیق‌شده» است؛ به همین دلیل مجوز ثبت عکس جدید ندارید. ابتدا مدیر باید وضعیت عضویت را بررسی و در صورت لزوم فعال کند.',
        'Your membership is currently suspended, so the database does not allow a new profile photo. The administrator must review and, if appropriate, reactivate your membership first.',
        'Ваше членство приостановлено, поэтому база данных не разрешает загрузку новой фотографии. Сначала администратор должен проверить статус и при необходимости восстановить членство.'));
    }
    const { error: uploadError } = await db.storage.from('rls-member-avatars')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: updatedProfile, error: updateError } = await db.from('rls_profiles')
      .update({ pending_avatar_path: path }).eq('user_id', user.id)
      .select(ownProfileFields).maybeSingle();
    if (updateError || !updatedProfile) {
      await db.storage.from('rls-member-avatars').remove([path]);
      if (updateError) throw updateError;
      throw new Error(tr('تغییر عکس ثبت نشد؛ احتمالاً وضعیت عضویت یا مجوزهای پروفایل اجازهٔ ویرایش نمی‌دهد. عکس قبلی حفظ شده است.',
        'The photo change was not saved. Your membership status or profile permissions may prevent editing. Your previous photo has been preserved.',
        'Изменение фотографии не сохранено. Возможно, статус членства или права профиля запрещают редактирование. Предыдущая фотография сохранена.'));
    }
    if (oldProfile.pending_avatar_path) {
      await db.storage.from('rls-member-avatars').remove([oldProfile.pending_avatar_path]);
    }
    const photoInput = document.getElementById('member-avatar');
    if (photoInput) photoInput.value = '';
    const refreshedProfile = updatedProfile;
    renderMemberProfile(refreshedProfile, user);
    reportUpload(tr('عکس با موفقیت ارسال شد و اکنون در انتظار تأیید مدیر است.',
      'Photo submitted successfully and is now awaiting administrator approval.',
      'Фотография успешно отправлена и ожидает одобрения администратора.'));
  }

  async function uploadEvidence(user, file) {
    if (!file) { reportUpload(tr('ابتدا فایل مدرک را انتخاب کنید.','Choose a document first.','Сначала выберите документ.')); return; }
    if (file.size > maxBytes || !types.includes(file.type)) {
      reportUpload(tr('فایل باید PDF یا تصویر مجاز و حداکثر ۵ مگابایت باشد.',
        'Use a PDF or accepted image no larger than 5 MB.','Допустимы PDF или изображение размером до 5 МБ.'));
      return;
    }
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = user.id + '/evidence-' + Date.now() + '.' + ext;
    reportUpload(tr('در حال بارگذاری امن مدرک…','Uploading document securely…','Безопасная загрузка документа…'));
    const { error: uploadError } = await db.storage.from('rls-members-private')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { error: updateError } = await db.from('rls_profiles')
      .update({ evidence_url: path }).eq('user_id', user.id);
    if (updateError) {
      await db.storage.from('rls-members-private').remove([path]);
      throw updateError;
    }
    reportUpload(tr('مدرک با موفقیت و به‌صورت خصوصی بارگذاری شد.',
      'Document uploaded and stored privately.','Документ загружен в закрытое хранилище.'));
  }

  register.addEventListener('submit', async event => {
    event.preventDefault();
    say(regMsg, tr('در حال ثبت‌نام…','Creating your account…','Создание учётной записи…'));
    const fd = new FormData(register);
    const category = clean(fd.get('category'));
    const file = fd.get('evidence');
    const avatarFile = fd.get('avatar');
    const applicationEmail = clean(fd.get('email'));
    if (!allowed.includes(category)) { say(regMsg, tr('گروه عضویت معتبر نیست.','Select a valid membership category.','Выберите допустимую категорию.')); return; }
    if (!avatarFile || !avatarFile.size) {
      say(regMsg, tr('انتخاب عکس پروفایل برای ثبت‌نام الزامی است.','A profile photo is required to register.','Для регистрации необходимо загрузить фотографию профиля.'));
      return;
    }
    if (!avatarTypes.includes(avatarFile.type) || avatarFile.size > maxBytes) {
      say(regMsg, tr('عکس باید JPG، PNG یا WebP و حداکثر ۵ مگابایت باشد.',
        'Choose a JPG, PNG or WebP photo no larger than 5 MB.',
        'Выберите фотографию JPG, PNG или WebP размером до 5 МБ.'));
      return;
    }
    if (file && file.size && (file.size > maxBytes || !types.includes(file.type))) {
      say(regMsg, tr('فایل باید PDF یا تصویر مجاز و حداکثر ۵ مگابایت باشد.',
        'The file must be an accepted PDF/image and no larger than 5 MB.','Файл должен быть PDF или изображением размером до 5 МБ.'));
      return;
    }
    try {
      // Keep the required photo locally while the user confirms their email.
      await queueAvatar(applicationEmail, avatarFile);
    } catch (queueError) {
      say(regMsg, tr('ذخیره موقت عکس برای تکمیل ثبت‌نام ممکن نشد: ',
        'The selected photo could not be retained until email confirmation: ',
        'Не удалось временно сохранить фотографию для завершения регистрации: ') + (queueError?.message || String(queueError)));
      return;
    }
    const metadata = {
      full_name: clean(fd.get('full_name')), display_name: clean(fd.get('display_name')),
      category, country: clean(fd.get('country')), city: clean(fd.get('city')),
      institution: clean(fd.get('institution')), degree: clean(fd.get('degree')),
      specialty: clean(fd.get('specialty')), bio: clean(fd.get('bio')),
      website_url: clean(fd.get('website_url')), orcid: clean(fd.get('orcid')),
      full_name_en: clean(fd.get('full_name_en')), full_name_ru: clean(fd.get('full_name_ru')),
      display_name_en: clean(fd.get('display_name_en')), display_name_ru: clean(fd.get('display_name_ru')),
      profile_headline_en: clean(fd.get('profile_headline_en')), profile_headline_ru: clean(fd.get('profile_headline_ru')),
      country_en: clean(fd.get('country_en')), country_ru: clean(fd.get('country_ru')),
      city_en: clean(fd.get('city_en')), city_ru: clean(fd.get('city_ru')),
      institution_en: clean(fd.get('institution_en')), institution_ru: clean(fd.get('institution_ru')),
      degree_en: clean(fd.get('degree_en')), degree_ru: clean(fd.get('degree_ru')),
      specialty_en: clean(fd.get('specialty_en')), specialty_ru: clean(fd.get('specialty_ru')),
      bio_en: clean(fd.get('bio_en')), bio_ru: clean(fd.get('bio_ru')),
      memberships_en: clean(fd.get('memberships_en')), memberships_ru: clean(fd.get('memberships_ru')),
      activities_en: clean(fd.get('activities_en')), activities_ru: clean(fd.get('activities_ru')),
      publications_en: clean(fd.get('publications_en')), publications_ru: clean(fd.get('publications_ru')),
      research_interests_en: clean(fd.get('research_interests_en')), research_interests_ru: clean(fd.get('research_interests_ru')),
      languages_en: clean(fd.get('languages_en')), languages_ru: clean(fd.get('languages_ru'))
    };
    if (lang !== 'fa') ['full_name','display_name','profile_headline','country','city','institution','degree','specialty','bio','memberships','activities','publications','research_interests','languages'].forEach(key => { if (!metadata[key + '_' + lang]) metadata[key + '_' + lang] = metadata[key]; });
    const { data, error } = await db.auth.signUp({
      email: applicationEmail, password: String(fd.get('password') || ''),
      options: {
        data: metadata,
        // Return confirmed users to the same live community page, not localhost.
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) { say(regMsg, tr('ثبت‌نام ناموفق بود: ','Registration failed: ','Ошибка регистрации: ') + error.message); return; }
    if (data.session && data.user) {
      try {
        await ensureProfile(data.user);
        if (file && file.size) await uploadEvidence(data.user, file);
        await uploadAvatar(data.user, avatarFile);
        await removeQueuedAvatar(applicationEmail);
        say(regMsg, tr('درخواست شما ثبت شد و در انتظار بررسی مدیر است.',
          'Your application was submitted and is awaiting administrator review.',
          'Заявка отправлена и ожидает проверки администратора.'));
        register.reset();
        await showSession(data.user);
      } catch (err) {
        say(regMsg, tr('حساب ساخته شد، اما تکمیل درخواست ناموفق بود: ',
          'Account created, but application setup failed: ','Учётная запись создана, но заявку не удалось завершить: ') + err.message);
      }
    } else {
      say(regMsg, tr('حساب ساخته شد و عکس شما در این مرورگر نگهداری شده است. ایمیل را تأیید کنید، سپس با همان مرورگر و همان ایمیل وارد شوید تا عکس برای بررسی مدیر ارسال شود. اگر تأیید ایمیل در همین صفحه باز شد، پس از بازگشت وارد شوید.',
        'Your account was created and the photo has been retained in this browser. Confirm your email, then sign in here with the same email so the photo can be sent for administrator review.',
        'Учётная запись создана, фотография сохранена в этом браузере. Подтвердите адрес и войдите здесь с тем же адресом, чтобы отправить фотографию администратору на проверку.'));
    }
  });

  login.addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = login.querySelector('button[type="submit"]');
    const originalLabel = submitButton ? submitButton.textContent : '';
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = tr('در حال ورود…','Signing in…','Выполняется вход…'); }
    say(loginMsg, tr('در حال ورود…','Signing in…','Выполняется вход…'));
    try {
      const fd = new FormData(login);
      const { data, error } = await db.auth.signInWithPassword({
        email: clean(fd.get('email')), password: String(fd.get('password') || '')
      });
      if (error) throw error;
      await showSession(data.user);
      try {
        await completeQueuedAvatar(data.user);
      } catch (avatarError) {
        reportUpload(tr('ورود انجام شد، اما عکس ثبت‌نام هنوز ارسال نشده است: ',
          'Signed in, but the saved signup photo could not be submitted yet: ',
          'Вход выполнен, но фотографию из заявки пока не удалось отправить: ') + (avatarError?.message || String(avatarError)));
      }
      login.reset();
      // Clear the transient "signing in" notice after a successful login.
      say(loginMsg, '');
    } catch (error) {
      say(loginMsg, tr('ورود ناموفق بود: ','Sign-in failed: ','Не удалось войти: ') + (error?.message || String(error)));
    } finally {
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalLabel || tr('ورود','Sign in','Войти'); }
    }
  });

  async function runUpload(buttonId, inputId, uploadFn, successFallback) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!button || !input) {
      reportUpload(tr('کنترل بارگذاری در صفحه پیدا نشد. صفحه را تازه‌سازی کنید.',
        'Upload controls were not found. Please refresh the page.',
        'Элементы загрузки не найдены. Обновите страницу.'));
      return;
    }
    const original = button.textContent;
    button.disabled = true;
    button.textContent = tr('در حال بارگذاری…','Uploading…','Загрузка…');
    reportUpload(tr('در حال آماده‌سازی بارگذاری…','Preparing upload…','Подготовка загрузки…'));
    try {
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData?.session;
      if (!session?.access_token || !session.user) {
        throw new Error(tr('نشست کاربری پیدا نشد؛ دوباره وارد حساب شوید.',
          'No active session was found. Please sign in again.',
          'Активный сеанс не найден. Войдите снова.'));
      }
      await uploadFn(session.user, input.files?.[0]);
    } catch (error) {
      reportUpload(tr('بارگذاری ناموفق بود: ','Upload failed: ','Ошибка загрузки: ') +
        (error?.message || String(error)));
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  document.getElementById('upload-avatar')?.addEventListener('click', () =>
    runUpload('upload-avatar', 'member-avatar', uploadAvatar));
  document.getElementById('upload-evidence')?.addEventListener('click', () =>
    runUpload('upload-evidence', 'member-evidence', uploadEvidence));

  document.getElementById('membership-reset')?.addEventListener('click', async () => {
    const email = clean(login.elements.email.value);
    if (!email) { say(loginMsg, tr('ابتدا ایمیل را در فرم ورود وارد کنید.','Enter your email in the login form first.','Сначала укажите почту в форме входа.')); return; }
    const { error } = await db.auth.resetPasswordForEmail(email);
    say(loginMsg, error ? error.message : tr('اگر حسابی با این ایمیل وجود داشته باشد، پیوند بازیابی ارسال می‌شود.',
      'If an account exists, a recovery link will be sent.','Если учётная запись существует, будет отправлена ссылка для восстановления.'));
  });


  profileOpen?.addEventListener('click', () => {
    if (memberIsAuthenticated) {
      sessionBox.hidden = false;
      sessionBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      login?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      say(loginMsg, tr('برای ورود به صفحه شخصی، ایمیل و گذرواژه خود را وارد کنید.','Sign in with your email and password to open your personal page.','Чтобы открыть личную страницу, введите почту и пароль.'));
      login?.querySelector('input[name="email"]')?.focus({preventScroll:true});
    }
  });
  document.getElementById('membership-logout')?.addEventListener('click', async () => {
    await db.auth.signOut();
    memberIsAuthenticated = false;
    sessionBox.hidden = true;
    if (profileEntry) profileEntry.hidden = false;
    if (profileOpen) profileOpen.textContent = tr('ورود به صفحه شخصی','Open my personal page','Открыть личную страницу');
    if (profileEntryNote) profileEntryNote.textContent = tr('برای ورود، ابتدا با حساب کاربری خود وارد شوید.','Sign in first to access your personal page.','Сначала войдите в систему, чтобы открыть личную страницу.');
    if (profileMsg) { profileMsg.textContent = ''; profileMsg.classList.remove('membership-success'); }
    if (membershipGrid) membershipGrid.hidden = false;
    if (membershipNote) membershipNote.hidden = false;
    if (membershipPrivacy) membershipPrivacy.hidden = false;
    if (authenticatedNote) authenticatedNote.hidden = true;
    say(loginMsg, tr('از حساب خارج شدید.','You have signed out.','Вы вышли из системы.'));
  });

  db.auth.getSession().then(async ({ data, error }) => {
    if (error) { say(loginMsg, tr('بازیابی نشست با خطا روبه‌رو شد: ','Could not restore your session: ','Не удалось восстановить сеанс: ') + error.message); return; }
    if (data?.session?.user) {
      await showSession(data.session.user);
      try {
        await completeQueuedAvatar(data.session.user);
      } catch (avatarError) {
        reportUpload(tr('ورود انجام شد، اما عکس ذخیره‌شده هنوز برای بررسی ارسال نشده است: ',
          'Signed in, but the retained photo has not yet been submitted for review: ',
          'Вход выполнен, но сохранённая фотография ещё не отправлена на проверку: ') + (avatarError?.message || String(avatarError)));
      }
    }
  }).catch(error => say(loginMsg, tr('خطا در بازیابی ورود: ','Session restore error: ','Ошибка восстановления сеанса: ') + (error?.message || String(error))));
})();