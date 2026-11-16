/* RLS Membership Certificate — direct download of optimized, QR-verified WebP */
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
      preview: base + '.preview.webp' + query + '&cb=certificate-fast-preview-20261116c',
      webp: base + '.webp' + query + '&cb=certificate-webp-lightweight-20261116',
      png: base + '.png' + query + '&cb=certificate-png-fallback-20261116'
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
      (adminPreview ? 'پیش‌نمایش فقط برای بررسی مدیر' : 'نسخه سبک و باکیفیت · فایل WebP') +
      '</p></div>' +
      (adminPreview ? '<div class="rls-certificate-frame" hidden><img class="rls-membership-certificate-image" alt="گواهی عضویت برای بررسی مدیر" decoding="async"></div>' : '') +
      '<div class="rls-certificate-actions"></div>';
    container.appendChild(panel);
    const actions = panel.querySelector('.rls-certificate-actions');
    const hint = document.createElement('span');
    hint.className = 'rls-certificate-hint';
    if (!adminPreview) {
      actions.appendChild(downloadLink(urls.webp, member, 'دانلود گواهی عضویت'));
      hint.textContent = 'نسخه کم‌حجم گواهی با حفظ وضوح QR؛ دانلود مستقیم.';
      actions.appendChild(hint);
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'community-button primary rls-certificate-download';
    button.textContent = 'نمایش گواهی برای بررسی';
    actions.appendChild(button);
    hint.textContent = 'برای جلوگیری از بارگذاری هم‌زمان، تصویر فقط پس از انتخاب نمایش داده می‌شود.';
    actions.appendChild(hint);
    const frame = panel.querySelector('.rls-certificate-frame');
    const preview = panel.querySelector('.rls-membership-certificate-image');
    let loading = false;
    button.addEventListener('click', () => {
      if (loading) return;
      loading = true;
      button.disabled = true;
      button.textContent = 'در حال دریافت پیش‌نمایش…';
      const candidates = [
        { url: urls.preview, label: 'پیش‌نمایش کم‌حجم' },
        { url: urls.webp, label: 'نسخه WebP اصلی' },
        { url: urls.png, label: 'نسخه PNG اصلی' }
      ];
      let index = 0;
      let timer = null;
      const finishWithDownload = () => {
        if (timer) window.clearTimeout(timer);
        preview.onload = null;
        preview.onerror = null;
        hint.textContent = 'پیش‌نمایش دریافت نشد؛ فایل اصلی را می‌توانید مستقیم دریافت کنید.';
        button.replaceWith(downloadLink(urls.webp, member, 'دانلود گواهی عضویت'));
        loading = false;
      };
      const tryNext = () => {
        if (timer) window.clearTimeout(timer);
        if (index >= candidates.length) {
          finishWithDownload();
          return;
        }
        const candidate = candidates[index++];
        hint.textContent = candidate.label + '…';
        preview.onload = () => {
          if (timer) window.clearTimeout(timer);
          frame.hidden = false;
          button.replaceWith(downloadLink(urls.webp, member, 'دانلود گواهی اصلی'));
          hint.textContent = 'پیش‌نمایش سریع بارگذاری شد.';
          loading = false;
        };
        preview.onerror = tryNext;
        preview.src = candidate.url;
        timer = window.setTimeout(tryNext, 10000);
      };
      tryNext();
    });;
  }
  window.RLSMembershipCertificate = { render };
})();
