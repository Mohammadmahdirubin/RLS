/* RLS Membership Certificate — use pre-generated same-origin PNG; no third-party QR requests */
(function () {
  'use strict';
  function certificateUrl(member) {
    const userId = String(member && member.user_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('شناسه عضو برای بازیابی گواهی معتبر نیست.');
    const number = Number(member.member_number);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('شماره عضویت معتبر نیست.');
    return '/assets/certificates/member-' + userId + '.png?v=' + encodeURIComponent(number) + '&t=cert-direct-20261116';
  }
  function download(url, member) {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RLS-Membership-Certificate-' + String(member.member_number).padStart(6, '0') + '.png';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  function render(container, member, options) {
    options = options || {};
    const adminPreview = options.adminPreview === true;
    if (!container || !member || !['approved', 'suspended'].includes(member.membership_status) || !member.member_number || !member.user_id) return;
    if (container.querySelector('.rls-certificate-section')) return;
    const panel = document.createElement('section');
    panel.className = 'rls-certificate-section' + (adminPreview ? ' rls-certificate-section--admin' : ' rls-certificate-section--download');
    panel.innerHTML =
      '<div class="rls-certificate-heading"><h2>گواهی عضویت انجمن</h2><p>' +
      (adminPreview ? 'پیش‌نمایش فقط برای بررسی مدیر' : 'نسخه اختصاصی · فایل PNG') +
      '</p></div>' +
      (adminPreview ? '<div class="rls-certificate-frame" hidden><img class="rls-membership-certificate-image" alt="گواهی عضویت برای بررسی مدیر" decoding="async"></div>' : '') +
      '<div class="rls-certificate-actions"><button type="button" class="community-button primary rls-certificate-download">' +
      (adminPreview ? 'نمایش گواهی برای بررسی' : 'دانلود گواهی عضویت (PNG)') +
      '</button><span class="rls-certificate-hint">' +
      (adminPreview ? 'گواهی آماده از مخزن انجمن بارگذاری می‌شود.' : 'گواهی و QR از فایل آماده و تأییدشده دریافت می‌شوند؛ نیازی به سرویس QR خارجی نیست.') +
      '</span></div>';
    container.appendChild(panel);
    const button = panel.querySelector('.rls-certificate-download');
    const hint = panel.querySelector('.rls-certificate-hint');
    const frame = panel.querySelector('.rls-certificate-frame');
    const preview = panel.querySelector('.rls-membership-certificate-image');
    let url = '';
    let loaded = false;
    let busy = false;
    function setError(message) {
      hint.textContent = message;
      button.textContent = 'تلاش دوباره';
      button.disabled = false;
      busy = false;
    }
    function loadPreparedFile() {
      if (busy) return;
      busy = true;
      button.disabled = true;
      button.textContent = 'در حال دریافت گواهی…';
      try {
        url = certificateUrl(member);
      } catch (error) {
        setError(error.message || 'اطلاعات گواهی معتبر نیست.');
        return;
      }
      const image = new Image();
      const timeout = window.setTimeout(() => {
        image.onload = null;
        image.onerror = null;
        setError('پاسخی از فایل گواهی دریافت نشد. اتصال یا انتشار فایل را بررسی کنید و دوباره تلاش کنید.');
      }, 15000);
      image.onload = () => {
        window.clearTimeout(timeout);
        loaded = true;
        if (adminPreview) {
          preview.src = url;
          frame.hidden = false;
          button.textContent = 'دانلود همین گواهی';
          hint.textContent = 'گواهی و QR با موفقیت بارگذاری شد.';
        } else {
          download(url, member);
          button.textContent = 'دانلود دوباره گواهی عضویت';
          hint.textContent = 'فایل گواهی عضویت آماده است.';
        }
        button.disabled = false;
        busy = false;
      };
      image.onerror = () => {
        window.clearTimeout(timeout);
        setError('فایل گواهی این عضو هنوز در سایت منتشر نشده است. تولید خودکار گواهی در حال بررسی است؛ QR جداگانه از سرویس خارجی ساخته نمی‌شود.');
      };
      image.src = url;
    }
    button.addEventListener('click', () => {
      if (adminPreview && loaded) {
        download(url, member);
        return;
      }
      loadPreparedFile();
    });
  }
  window.RLSMembershipCertificate = { render };
})();
