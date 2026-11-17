/* RLS Membership Certificate — member portal download + optional compact admin preview */
(function () {
  'use strict';

  function certificateUrls(member) {
    const userId = String(member && member.user_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('شناسه عضو برای بازیابی گواهی معتبر نیست.');
    const number = Number(member.member_number);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('شماره عضویت معتبر نیست.');
    const base = '/assets/certificates/member-' + userId;
    // Versioned URL enables long-lived browser/CDN caching; bump when the image format changes.
    const query = '?v=' + encodeURIComponent(number) + '&cv=rls-cert-webp-v9';
    return {
      preview: base + '.preview.webp' + query,
      full: base + '.webp' + query
    };
  }

  function downloadLink(url, member, label) {
    const link = document.createElement('a');
    link.className = 'community-button primary rls-certificate-download';
    link.href = url;
    link.download = 'RLS-Membership-Certificate-' +
      String(member.member_number).padStart(6, '0') + '.webp';
    link.textContent = label;
    return link;
  }

  function render(container, member, options) {
    options = options || {};
    const adminPreview = options.adminPreview === true;
    if (!container || !member ||
        !['approved', 'suspended'].includes(member.membership_status) ||
        !member.member_number || !member.user_id) return;
    if (container.querySelector('.rls-certificate-section')) return;

    let urls;
    try {
      urls = certificateUrls(member);
    } catch (error) {
      const warning = document.createElement('p');
      warning.className = 'rls-certificate-hint';
      warning.textContent = error.message || 'اطلاعات گواهی معتبر نیست.';
      container.appendChild(warning);
      return;
    }

    const panel = document.createElement('section');
    panel.className = 'rls-certificate-section' +
      (adminPreview ? ' rls-certificate-section--admin' : ' rls-certificate-section--download');
    panel.innerHTML =
      '<div class="rls-certificate-heading"><h2>گواهی عضویت انجمن</h2><p>' +
      (adminPreview
        ? 'پیش‌نمایش سبک؛ فایل اصلی فقط هنگام دانلود دریافت می‌شود.'
        : 'نسخه اصلی باکیفیت · WebP') +
      '</p></div>' +
      (adminPreview
        ? '<div class="rls-certificate-frame" hidden><img class="rls-membership-certificate-image" alt="پیش‌نمایش گواهی عضویت" decoding="async" loading="lazy"></div>'
        : '') +
      '<div class="rls-certificate-actions"></div>';
    container.appendChild(panel);

    const actions = panel.querySelector('.rls-certificate-actions');
    const hint = document.createElement('span');
    hint.className = 'rls-certificate-hint';

    if (!adminPreview) {
      actions.appendChild(downloadLink(urls.full, member, 'دانلود گواهی عضویت'));
      hint.textContent = 'نسخه اصلی گواهی برای دانلود آماده است.';
      actions.appendChild(hint);
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'community-button primary rls-certificate-download';
    button.textContent = 'نمایش پیش‌نمایش گواهی';
    actions.appendChild(button);
    hint.textContent = 'تصویر سبک فقط پس از انتخاب دریافت می‌شود.';
    actions.appendChild(hint);

    const frame = panel.querySelector('.rls-certificate-frame');
    const image = panel.querySelector('.rls-membership-certificate-image');
    let loading = false;
    button.addEventListener('click', () => {
      if (loading || image.dataset.loaded === 'true') return;
      loading = true;
      button.disabled = true;
      button.textContent = 'در حال دریافت پیش‌نمایش…';
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        loading = false;
        button.disabled = false;
        if (ok) {
          image.dataset.loaded = 'true';
          frame.hidden = false;
          button.replaceWith(downloadLink(urls.full, member, 'دانلود نسخه اصلی'));
          hint.textContent = 'پیش‌نمایش سبک نمایش داده شد؛ دانلود اصلی جداگانه انجام می‌شود.';
        } else {
          button.textContent = 'تلاش دوباره برای نمایش';
          hint.textContent = 'پیش‌نمایش بارگذاری نشد؛ اتصال را بررسی و دوباره تلاش کنید.';
        }
      };
      const timer = window.setTimeout(() => finish(false), 20000);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = urls.preview;
    });
  }

  window.RLSMembershipCertificate = { render };
})();
