/* RLS Membership Certificate — direct download of pre-generated, QR-verified PNG */
(function () {
  'use strict';
  function certificateUrl(member) {
    const userId = String(member && member.user_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('شناسه عضو برای بازیابی گواهی معتبر نیست.');
    const number = Number(member.member_number);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('شماره عضویت معتبر نیست.');
    return '/assets/certificates/member-' + userId + '.png?v=' + encodeURIComponent(number) + '&cb=certificate-flow-audit-20261116';
  }
  function downloadLink(url, member, label) {
    const link = document.createElement('a');
    link.className = 'community-button primary rls-certificate-download';
    link.href = url;
    link.download = 'RLS-Membership-Certificate-' + String(member.member_number).padStart(6, '0') + '.png';
    link.textContent = label;
    return link;
  }
  function render(container, member, options) {
    options = options || {};
    const adminPreview = options.adminPreview === true;
    if (!container || !member || !['approved', 'suspended'].includes(member.membership_status) || !member.member_number || !member.user_id) return;
    if (container.querySelector('.rls-certificate-section')) return;
    let url;
    try { url = certificateUrl(member); }
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
      (adminPreview ? 'پیش‌نمایش فقط برای بررسی مدیر' : 'نسخه اختصاصی · فایل PNG') +
      '</p></div>' +
      (adminPreview ? '<div class="rls-certificate-frame" hidden><img class="rls-membership-certificate-image" alt="گواهی عضویت برای بررسی مدیر" decoding="async"></div>' : '') +
      '<div class="rls-certificate-actions"></div>';
    container.appendChild(panel);
    const actions = panel.querySelector('.rls-certificate-actions');
    const hint = document.createElement('span');
    hint.className = 'rls-certificate-hint';
    if (!adminPreview) {
      actions.appendChild(downloadLink(url, member, 'دانلود گواهی عضویت (PNG)'));
      hint.textContent = 'فایل آماده گواهی به‌همراه QR معتبر؛ دانلود مستقیم و بدون وابستگی به سرویس خارجی.';
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
      const timeout = window.setTimeout(() => {
        preview.onerror = null;
        preview.onload = null;
        hint.textContent = 'بارگذاری فایل گواهی بیش از حد طول کشید. دوباره تلاش کنید.';
        button.disabled = false;
        button.textContent = 'تلاش دوباره برای نمایش';
        loading = false;
      }, 45000);
      preview.onload = () => {
        window.clearTimeout(timeout);
        frame.hidden = false;
        button.replaceWith(downloadLink(url, member, 'دانلود همین گواهی'));
        hint.textContent = 'گواهی و QR در فایل آماده با موفقیت بارگذاری شد.';
        loading = false;
      };
      preview.onerror = () => {
        window.clearTimeout(timeout);
        hint.textContent = 'فایل گواهی این عضو در مسیر سایت پیدا نشد؛ بررسی انتشار فایل لازم است.';
        button.disabled = false;
        button.textContent = 'تلاش دوباره برای نمایش';
        loading = false;
      };
      preview.removeAttribute('src');
      preview.src = url + '&preview=' + Date.now();
    });
  }
  window.RLSMembershipCertificate = { render };
})();
