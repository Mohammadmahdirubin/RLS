/* RLS Membership Certificate — original typography preserved; no reduced preview */
(function () {
  'use strict';
  function certificateUrls(member) {
    const userId = String(member && member.user_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('شناسه عضو برای بازیابی گواهی معتبر نیست.');
    const number = Number(member.member_number);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('شماره عضویت معتبر نیست.');
    const base = '/assets/certificates/member-' + userId;
    const query = '?v=' + encodeURIComponent(number);
    return {
      webp: base + '.webp' + query + '&cb=certificate-original-webp-20261116d',
      png: base + '.png' + query + '&cb=certificate-original-png-20261116d'
    };
  }
  function downloadLink(url, member, label) {
    const link = document.createElement('a');
    link.className = 'community-button primary rls-certificate-download';
    link.href = url;
    link.download = 'RLS-Membership-Certificate-' + String(member.member_number).padStart(6, '0') + (url.includes('.png') ? '.png' : '.webp');
    link.textContent = label;
    return link;
  }
  function render(container, member, options) {
    options = options || {};
    const adminPreview = options.adminPreview === true;
    if (!container || !member || !['approved', 'suspended'].includes(member.membership_status) || !member.member_number || !member.user_id) return;
    if (container.querySelector('.rls-certificate-section')) return;
    let urls;
    try { urls = certificateUrls(member); }
    catch (error) {
      const warning = document.createElement('p');
      warning.className = 'rls-certificate-hint';
      warning.textContent = error.message || 'اطلاعات گواهی معتبر نیست.';
      container.appendChild(warning);
      return;
    }
    const panel = document.createElement('section');
    panel.className = 'rls-certificate-section' + (adminPreview ? ' rls-certificate-section--admin' : ' rls-certificate-section--download');
    panel.innerHTML =
      '<div class="rls-certificate-heading"><h2>گواهی عضویت انجمن</h2><p>' +
      (adminPreview ? 'نمایش نسخه اصلی گواهی، بدون تغییر اندازه یا فونت' : 'نسخه اصلی باکیفیت · فایل WebP') +
      '</p></div>' +
      (adminPreview ? '<div class="rls-certificate-frame" hidden><img class="rls-membership-certificate-image" alt="گواهی اصلی عضویت برای بررسی مدیر" decoding="async"></div>' : '') +
      '<div class="rls-certificate-actions"></div>';
    container.appendChild(panel);
    const actions = panel.querySelector('.rls-certificate-actions');
    const hint = document.createElement('span');
    hint.className = 'rls-certificate-hint';
    if (!adminPreview) {
      actions.appendChild(downloadLink(urls.webp, member, 'دانلود گواهی عضویت'));
      hint.textContent = 'دانلود مستقیم نسخه اصلی گواهی.';
      actions.appendChild(hint);
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'community-button primary rls-certificate-download';
    button.textContent = 'نمایش گواهی اصلی';
    actions.appendChild(button);
    hint.textContent = 'تصویر اصلی فقط پس از انتخاب بارگذاری می‌شود.';
    actions.appendChild(hint);
    const frame = panel.querySelector('.rls-certificate-frame');
    const image = panel.querySelector('.rls-membership-certificate-image');
    let loading = false;
    button.addEventListener('click', () => {
      if (loading) return;
      loading = true;
      button.disabled = true;
      button.textContent = 'در حال دریافت گواهی اصلی…';
      const candidates = [urls.webp, urls.png];
      let index = 0;
      let timer = null;
      const fail = () => {
        if (timer) window.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        hint.textContent = 'نمایش تصویر ممکن نشد؛ فایل اصلی را مستقیم دریافت کنید.';
        button.replaceWith(downloadLink(urls.png, member, 'دانلود گواهی اصلی (PNG)'));
        loading = false;
      };
      const tryNext = () => {
        if (timer) window.clearTimeout(timer);
        if (index >= candidates.length) { fail(); return; }
        image.onload = () => {
          if (timer) window.clearTimeout(timer);
          frame.hidden = false;
          button.replaceWith(downloadLink(urls.webp, member, 'دانلود گواهی اصلی'));
          hint.textContent = 'گواهی اصلی با فونت و اندازه واقعی نمایش داده شد.';
          loading = false;
        };
        image.onerror = tryNext;
        image.src = candidates[index++];
        timer = window.setTimeout(tryNext, 15000);
      };
      tryNext();
    });
  }
  window.RLSMembershipCertificate = { render };
})();
