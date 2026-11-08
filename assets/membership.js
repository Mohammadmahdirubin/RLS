(function () {
  const cfg = window.RLS_SUPABASE_CONFIG;
  if (!cfg || !window.supabase) return;
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey);
  const register = document.getElementById('membership-register');
  const login = document.getElementById('membership-login');
  if (!register || !login) return;
  const regMsg = document.getElementById('register-message');
  const loginMsg = document.getElementById('login-message');
  const sessionBox = document.getElementById('member-session');
  const sessionText = document.getElementById('member-session-text');
  const allowed = ['student','graduate','faculty','researcher','translator','culture','honorary'];
  const maxBytes = 5 * 1024 * 1024;
  const types = ['application/pdf','image/jpeg','image/png','image/webp'];
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

  async function ensureProfile(user) {
    const { data: existing, error: readError } = await db.from('rls_profiles')
      .select('user_id,membership_status').eq('user_id', user.id).maybeSingle();
    if (readError) throw readError;
    if (existing) return existing;
    const profile = profileData(user);
    if (!profile.full_name || !profile.category) {
      throw new Error(tr('اطلاعات درخواست در حساب پیدا نشد. با همان ایمیل ثبت‌نام‌شده وارد شوید.',
        'Application details were not found. Please use the email address used at registration.',
        'Данные заявки не найдены. Войдите с адресом, использованным при регистрации.'));
    }
    const { data, error } = await db.from('rls_profiles').insert(profile)
      .select('user_id,membership_status').single();
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
    try {
      const profile = await ensureProfile(user);
      sessionBox.hidden = false;
      sessionText.textContent = tr('وضعیت درخواست: ','Application status: ','Статус заявки: ') +
        statusLabel(profile.membership_status) + ' · ' + (user.email || '');
    } catch (error) {
      say(loginMsg, tr('ورود انجام شد، اما تکمیل پروفایل ناموفق بود: ',
        'Signed in, but profile setup failed: ','Вход выполнен, но профиль не создан: ') + error.message);
    }
  }

  async function uploadEvidence(user, file) {
    if (!file) { say(loginMsg, tr('ابتدا فایل مدرک را انتخاب کنید.','Choose a document first.','Сначала выберите документ.')); return; }
    if (file.size > maxBytes || !types.includes(file.type)) {
      say(loginMsg, tr('فایل باید PDF یا تصویر مجاز و حداکثر ۵ مگابایت باشد.',
        'Use a PDF or accepted image no larger than 5 MB.','Допустимы PDF или изображение размером до 5 МБ.'));
      return;
    }
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = user.id + '/evidence-' + Date.now() + '.' + ext;
    say(loginMsg, tr('در حال بارگذاری امن مدرک…','Uploading document securely…','Безопасная загрузка документа…'));
    const { error: uploadError } = await db.storage.from('rls-members-private')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { error: updateError } = await db.from('rls_profiles')
      .update({ evidence_url: path }).eq('user_id', user.id);
    if (updateError) {
      await db.storage.from('rls-members-private').remove([path]);
      throw updateError;
    }
    say(loginMsg, tr('مدرک با موفقیت و به‌صورت خصوصی بارگذاری شد.',
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
    say(loginMsg, tr('در حال ورود…','Signing in…','Выполняется вход…'));
    const fd = new FormData(login);
    const { data, error } = await db.auth.signInWithPassword({
      email: clean(fd.get('email')), password: String(fd.get('password') || '')
    });
    if (error) { say(loginMsg, tr('ورود ناموفق بود: ','Sign-in failed: ','Не удалось войти: ') + error.message); return; }
    await showSession(data.user);
    login.reset();
  });

  document.getElementById('upload-evidence')?.addEventListener('click', async () => {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    try {
      await uploadEvidence(user, document.getElementById('member-evidence').files[0]);
      document.getElementById('member-evidence').value = '';
    } catch (error) {
      say(loginMsg, tr('بارگذاری ناموفق بود: ','Upload failed: ','Ошибка загрузки: ') + error.message);
    }
  });

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
    say(loginMsg, tr('از حساب خارج شدید.','You have signed out.','Вы вышли из системы.'));
  });

  db.auth.getSession().then(({ data }) => { if (data.session) showSession(data.session.user); });
})();