/* RLS Membership Certificate — show the one-time pre-generated GitHub image */
(function () {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/Mohammadmahdirubin/RLS/main/assets/member-certificates/';
  const RETRY_LIMIT = 24;
  const RETRY_DELAY = 15000;

  function render(container, member) {
    if (!container || !member || member.membership_status !== 'approved' ||
        !member.member_number || !member.user_id) return;
    if (container.querySelector('.rls-certificate-section')) return;

    const userId = String(member.user_id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      console.warn('Invalid member ID; certificate image was not requested.');
      return;
    }

    const webpUrl = RAW_BASE + userId + '.webp';
    const pngUrl = RAW_BASE + userId + '.png';
    const panel = document.createElement('section');
    panel.className = 'rls-certificate-section';
    panel.innerHTML =
      '<div class="rls-certificate-heading"><h2>گواهی عضویت انجمن</h2><p>نسخه رسمی · تصویر ذخیره‌شده</p></div>' +
      '<div class="rls-certificate-frame">' +
        '<div class="rls-certificate-loading" role="status">در حال دریافت تصویر گواهی عضویت…</div>' +
        '<img class="rls-membership-certificate-image" alt="گواهی عضویت اختصاصی عضو" width="1500" height="1000" loading="eager" fetchpriority="high" decoding="async" hidden>' +
      '</div>' +
      '<div class="rls-certificate-actions">' +
        '<a class="community-button primary rls-certificate-download" target="_blank" rel="noopener noreferrer" hidden>دریافت تصویر اصلی گواهی (PNG)</a>' +
        '<span class="rls-certificate-hint">این گواهی یک‌بار صادر و در مخزن انجمن نگهداری می‌شود.</span>' +
      '</div>';
    container.appendChild(panel);

    const preview = panel.querySelector('.rls-membership-certificate-image');
    const loading = panel.querySelector('.rls-certificate-loading');
    const download = panel.querySelector('.rls-certificate-download');
    let attempts = 0;
    let retryTimer = null;

    download.href = pngUrl;
    download.download = 'RLS-Membership-Certificate-' + String(member.member_number).padStart(6, '0') + '.png';

    preview.onload = () => {
      if (!panel.isConnected) return;
      if (retryTimer) clearTimeout(retryTimer);
      preview.hidden = false;
      loading.hidden = true;
      download.hidden = false;
    };

    preview.onerror = () => {
      if (!panel.isConnected) return;
      attempts += 1;
      if (attempts <= RETRY_LIMIT) {
        loading.textContent = 'گواهی در حال ثبت در مخزن انجمن است؛ دریافت خودکار دوباره تلاش می‌کند…';
        retryTimer = setTimeout(() => {
          // Unique query avoids a cached 404 while the background issuer is saving
          // this member's first certificate. The certificate itself is never rebuilt here.
          preview.src = webpUrl + '?check=' + attempts;
        }, RETRY_DELAY);
      } else {
        loading.textContent = 'تصویر گواهی هنوز در دسترس نیست. صفحه را بعداً دوباره باز کنید.';
      }
    };

    preview.src = webpUrl;
    panel.addEventListener('DOMNodeRemoved', () => {
      if (retryTimer) clearTimeout(retryTimer);
    }, {once:true});
  }

  window.RLSMembershipCertificate = {render};
})();
