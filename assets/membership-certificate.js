/* RLS Membership Certificate — official PNG template, generated per member */
(function () {
  'use strict';
  const TEMPLATE_URL = 'https://raw.githubusercontent.com/Mohammadmahdirubin/RLS/main/Bilingual%20Russian%20Language%20Membership%20Certificate.png';
  const PROFILE_BASE = 'https://rlsj.ir/community.html?member=';
  const groups = {
    student:'دانشجو', graduate:'دانش‌آموخته', faculty:'استاد و عضو هیئت علمی',
    researcher:'پژوهشگر', translator:'مترجم', culture:'ادبیات و فرهنگ', honorary:'عضو افتخاری'
  };
  const digits = value => String(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const cleanName = value => String(value || '').replace(/^\s*(?:(?:آقای|خانم|جناب آقای|سرکار خانم)\s*|(?:Mr\\.?|Mrs\\.?|Ms\\.?|г-н|г-жа)\s*)/i,'').trim();
  function faDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year:'numeric', month:'long', day:'numeric', timeZone:'Asia/Tehran'
    }).format(date).replace(/\u200e/g,'');
  }
  function membershipNumber(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? digits(String(number).padStart(6,'0')) : '—';
  }
  function loadImage(src, crossOrigin) {
    return new Promise((resolve,reject) => {
      const image = new Image();
      if (crossOrigin) image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('بارگذاری تصویر گواهی یا QR ناموفق بود.'));
      image.src = src;
    });
  }
  async function render(container, member) {
    if (!container || !member || member.membership_status !== 'approved' || !member.member_number || !member.user_id) return;
    if (container.querySelector('.rls-certificate-section')) return;

    const panel = document.createElement('section');
    panel.className = 'rls-certificate-section';
    panel.innerHTML = '<div class="rls-certificate-heading"><h2>گواهی عضویت انجمن</h2><p>نسخه رسمی · تصویر PNG</p></div><div class="rls-certificate-frame"><img class="rls-membership-certificate-image" alt="گواهی عضویت اختصاصی عضو" /></div><div class="rls-certificate-actions"><button type="button" class="community-button primary rls-certificate-download" disabled>در حال صدور گواهی…</button><span class="rls-certificate-hint">این گواهی فقط برای صاحب حساب واردشده نمایش داده می‌شود.</span></div>';
    container.appendChild(panel);

    const preview = panel.querySelector('.rls-membership-certificate-image');
    const download = panel.querySelector('.rls-certificate-download');
    let pngUrl = '';

    try {
      const template = await loadImage(TEMPLATE_URL + '?v=20261110', true);
      const qrUrl = 'https://quickchart.io/qr?text=' + encodeURIComponent(PROFILE_BASE + member.user_id) + '&size=320&margin=1&format=png';
      const qrResponse = await fetch(qrUrl, {mode:'cors', cache:'no-store'});
      if (!qrResponse.ok) throw new Error('ساخت QR ناموفق بود.');
      const qrBlob = await qrResponse.blob();
      const qrObjectUrl = URL.createObjectURL(qrBlob);
      let qr;
      try { qr = await loadImage(qrObjectUrl, false); }
      finally { /* revoked after canvas draw */ }

      const canvas = document.createElement('canvas');
      canvas.width = template.naturalWidth;
      canvas.height = template.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

      const navy = '#102f5b';
      ctx.fillStyle = navy;
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.font = 'bold 46px Tahoma, Arial, sans-serif';
      ctx.fillText(cleanName(member.display_name || member.full_name), 746, 535, 900);

      ctx.textAlign = 'right';
      ctx.font = 'bold 29px Tahoma, Arial, sans-serif';
      ctx.fillText(membershipNumber(member.member_number), 320, 744, 250);
      ctx.fillText(groups[member.category] || member.category || '—', 320, 800, 250);
      // The member profile uses created_at as its membership date; keep the certificate consistent with it.
      ctx.fillText(faDate(member.created_at), 320, 856, 250);

      // The QR frame is preprinted on the right side of the approved template.
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1225, 710, 156, 156);
      ctx.drawImage(qr, 1228, 713, 150, 150);
      URL.revokeObjectURL(qrObjectUrl);

      const blob = await new Promise((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('تبدیل گواهی به PNG ناموفق بود.')), 'image/png'));
      pngUrl = URL.createObjectURL(blob);
      preview.src = pngUrl;
      download.disabled = false;
      download.textContent = 'دانلود گواهی عضویت (PNG)';
      download.onclick = () => {
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'RLS-Membership-Certificate-' + String(member.member_number).padStart(6,'0') + '.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
      };
    } catch (error) {
      console.error('RLS membership certificate generation failed:', error);
      download.textContent = 'صدور گواهی انجام نشد؛ دوباره بارگذاری کنید';
      download.disabled = true;
    }
  }
  window.RLSMembershipCertificate = {render};
})();