(function () {
  const cfg = window.RLS_SUPABASE_CONFIG;
  if (!cfg || !window.supabase) return;
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const register = document.getElementById('membership-register');
  const login = document.getElementById('membership-login');
  if (!register || !login) return;
  const regMsg = document.getElementById('register-message');
  const loginMsg = document.getElementById('login-message');
  const sessionBox = document.getElementById('member-session');
  const membershipGrid = document.querySelector('#membership-process .membership-grid');
  const membershipNote = document.querySelector('#membership-process .community-note');
  const membershipPrivacy = document.querySelector('#membership-process .membership-privacy');
  const sessionText = document.getElementById('member-session-text');
  const profileMsg = document.getElementById('member-profile-message');
  const reportUpload = value => say(profileMsg || loginMsg, value);
  const allowed = ['student','graduate','faculty','researcher','translator','culture','honorary'];
  const maxBytes = 5 * 1024 * 1024;
  const types = ['application/pdf','image/jpeg','image/png','image/webp'];
  const avatarTypes = ['image/jpeg','image/png','image/webp'];
  const lang = document.documentElement.lang;
  const tr = (fa,en,ru) => lang === 'fa' ? fa : lang === 'ru' ? ru : en;
  const say = (el, value) => { if (el) el.textContent = value; };
  const clean = value => String(value || '').trim();

  function profileData(user) {
    const m = user.user_metadata || {};
    return {
      user_id: user.id, full_name: clean(m.full_name),
      display_name: clean(m.display_name) || null,
      category: allowed.includes(m.category) ? m.category : null,
      email: user.email || null, country: clean(m.country) || null,
      city: clean(m.city) || null, institution: clean(m.institution) || null,
      degree: clean(m.degree) || null, specialty: clean(m.specialty) || null,
      bio: clean(m.bio) || null, website_url: clean(m.website_url) || null,
      orcid: clean(m.orcid) || null, membership_status: 'pending',
      is_public: false, reviewed_by: null, reviewed_at: null, review_note: null
    };
  }

  const ownProfileFields = 'user_id,full_name,display_name,category,email,country,city,institution,degree,specialty,bio,avatar_path,website_url,orcid,membership_status,created_at,reviewed_at';

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

  async function showSession(user) {
    if (!user) return;
    // Authentication is already successful. Reveal account actions immediately,
    // independently of the profile lookup, so a profile-read error cannot hide uploads.
    if (membershipGrid) membershipGrid.hidden = true;
    if (membershipNote) membershipNote.hidden = true;
    if (membershipPrivacy) membershipPrivacy.hidden = true;
    sessionBox.hidden = false;
    sessionBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (profileMsg) { profileMsg.textContent = tr('خوش آمدید! به پروفایل اختصاصی خود وارد شده‌اید.','Welcome! You are now in your member profile.','Добро пожаловать! Вы вошли в свой профиль.'); profileMsg.classList.add('membership-success'); }
    sessionText.textContent = tr('ورود موفق بود؛ در حال دریافت وضعیت عضویت…',
      'Signed in; loading membership status…','Вход выполнен; загружается статус членства…') +
      (user.email ? ' · ' + user.email : '');
    try {
      const profile = await ensureProfile(user);
      sessionText.textContent = tr('وضعیت درخواست: ','Application status: ','Статус заявки: ') +
        statusLabel(profile.membership_status) + ' · ' + (user.email || '');
      say(loginMsg, '');
    } catch (error) {
      // Keep the authenticated upload controls visible and explain only the profile issue.
      say(loginMsg, tr('ورود موفق بود؛ دریافت وضعیت عضویت با خطا روبه‌رو شد: ',
        'Signed in, but membership status could not be loaded: ',
        'Вход выполнен, но не удалось загрузить статус членства: ') + (error?.message || String(error)));
    }
  }

  async function uploadAvatar(user, file) {
    if (!file) { reportUpload(tr('ابتدا عکس را انتخاب کنید.','Choose a photo first.','Сначала выберите фотографию.')); return; }
    if (!avatarTypes.includes(file.type) || file.size > maxBytes) {
      reportUpload(tr('عکس باید JPG، PNG یا WebP و حداکثر ۵ مگابایت باشد.','Use a JPG, PNG or WebP image no larger than 5 MB.','Допустимы JPG, PNG или WebP размером до 5 МБ.'));
      return;
    }
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = user.id + '/avatar-' + Date.now() + '.' + ext;
    reportUpload(tr('در حال بارگذاری عکس پروفایل…','Uploading profile photo…','Загрузка фотографии профиля…'));
    const { error: uploadError } = await db.storage.from('rls-member-avatars')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: oldProfile } = await db.from('rls_profiles').select('avatar_path').eq('user_id', user.id).maybeSingle();
    const { error: updateError } = await db.from('rls_profiles').update({ avatar_path: path }).eq('user_id', user.id);
    if (updateError) {
      await db.storage.from('rls-member-avatars').remove([path]);
      throw updateError;
    }
    if (oldProfile?.avatar_path) await db.storage.from('rls-member-avatars').remove([oldProfile.avatar_path]);
    const photoInput = document.getElementById('member-avatar');
    if (photoInput) photoInput.value = '';
    reportUpload(tr('عکس پروفایل ذخیره شد و پس از تأیید عضویت در فهرست عمومی نمایش داده می‌شود.',
      'Profile photo saved. It will appear in the public directory after membership approval.',
      'Фотография сохранена и появится в открытом каталоге после одобрения членства.'));
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
    if (!allowed.includes(category)) { say(regMsg, tr('گروه عضویت معتبر نیست.','Select a valid membership category.','Выберите допустимую категорию.')); return; }
    if (file && file.size && (file.size > maxBytes || !types.includes(file.type))) {
      say(regMsg, tr('فایل باید PDF یا تصویر مجاز و حداکثر ۵ مگابایت باشد.',
        'The file must be an accepted PDF/image and no larger than 5 MB.','Файл должен быть PDF или изображением размером до 5 МБ.'));
      return;
    }
    const metadata = {
      full_name: clean(fd.get('full_name')), display_name: clean(fd.get('display_name')),
      category, country: clean(fd.get('country')), city: clean(fd.get('city')),
      institution: clean(fd.get('institution')), degree: clean(fd.get('degree')),
      specialty: clean(fd.get('specialty')), bio: clean(fd.get('bio')),
      website_url: clean(fd.get('website_url')), orcid: clean(fd.get('orcid'))
    };
    const { data, error } = await db.auth.signUp({
      email: clean(fd.get('email')), password: String(fd.get('password') || ''),
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
        const avatarFile = fd.get('avatar');
        if (avatarFile && avatarFile.size) await uploadAvatar(data.user, avatarFile);
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
      say(regMsg, tr('حساب ساخته شد. ایمیل تأیید را باز کنید؛ سپس از بخش ورود وارد شوید تا درخواست شما ثبت نهایی شود. پوشه هرزنامه را هم بررسی کنید.',
        'Your account was created. Confirm your email, then sign in below to finalize your application. Check your spam folder too.',
        'Учётная запись создана. Подтвердите адрес по ссылке из письма, затем войдите ниже для завершения заявки. Проверьте папку «Спам».'));
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
      const { data, error } = await db.auth.getUser();
      if (error) throw error;
      if (!data?.user) throw new Error(tr('نشست کاربری معتبر نیست؛ خارج شوید و دوباره وارد شوید.',
        'Your session is not valid. Sign out and sign in again.',
        'Сеанс недействителен. Выйдите и войдите снова.'));
      await uploadFn(data.user, input.files?.[0]);
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

  document.getElementById('membership-logout')?.addEventListener('click', async () => {
    await db.auth.signOut();
    sessionBox.hidden = true;
    if (profileMsg) { profileMsg.textContent = ''; profileMsg.classList.remove('membership-success'); }
    if (membershipGrid) membershipGrid.hidden = false;
    if (membershipNote) membershipNote.hidden = false;
    if (membershipPrivacy) membershipPrivacy.hidden = false;
    say(loginMsg, tr('از حساب خارج شدید.','You have signed out.','Вы вышли из системы.'));
  });

  db.auth.getSession().then(({ data, error }) => {
    if (error) { say(loginMsg, tr('بازیابی نشست با خطا روبه‌رو شد: ','Could not restore your session: ','Не удалось восстановить сеанс: ') + error.message); return; }
    if (data?.session?.user) showSession(data.session.user);
  }).catch(error => say(loginMsg, tr('خطا در بازیابی ورود: ','Session restore error: ','Ошибка восстановления сеанса: ') + (error?.message || String(error))));
})();