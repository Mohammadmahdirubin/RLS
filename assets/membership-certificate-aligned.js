/* RLS Membership Certificate — private download and administrator review */
(function () {
  'use strict';
  const TEMPLATE_URL = '/Bilingual%20Russian%20Language%20Membership%20Certificate.png?v=20261111';
  const PROFILE_BASE = 'https://rlsj.ir/community.html?member=';
  let templatePromise = null;
  const qrPromises = new Map();
  function getTemplate() {
    if (!templatePromise) {
      templatePromise = loadImage(TEMPLATE_URL, false).catch(error => { templatePromise = null; throw error; });
    }
    return templatePromise;
  }
  function getQr(userId) {
    if (!qrPromises.has(userId)) {
      const data = encodeURIComponent(PROFILE_BASE + userId);
      const urls = [
        'https://quickchart.io/qr?text=' + data + '&size=320&margin=1&format=png',
        'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=' + data
      ];
      const task = (async () => {
        let lastError;
        for (const url of urls) {
          try {
            const response = await fetch(url, {mode:'cors', cache:'force-cache', signal:AbortSignal.timeout(7000)});
            if (!response.ok) throw new Error('QR HTTP ' + response.status);
            return loadImage(URL.createObjectURL(await response.blob()), false);
          } catch (error) { lastError = error; }
        }
        throw lastError || new Error('ساخت QR ناموفق بود.');
      })();
      qrPromises.set(userId, task);
      task.catch(() => qrPromises.delete(userId));
    }
    return qrPromises.get(userId);
  }
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
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Tehran'}).format(date).replace(/\u200e/g,'');
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
  async function createBlob(member) {
    const [template, qr] = await Promise.all([getTemplate(), getQr(member.user_id)]);
    const canvas = document.createElement('canvas');
    canvas.width = template.naturalWidth;
    canvas.height = template.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#102f5b';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px Tahoma, Arial, sans-serif';
    ctx.fillText(cleanName(member.display_name || member.full_name), 746, 535, 900);
    ctx.textAlign = 'right';
    ctx.font = 'bold 29px Tahoma, Arial, sans-serif';
    ctx.fillText(membershipNumber(member.member_number), 350, 770, 250);
    ctx.fillText(groups[member.category] || member.category || '—', 350, 826, 250);
    ctx.fillText(faDate(member.created_at), 350, 882, 250);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1265, 735, 156, 156);
    ctx.drawImage(qr, 1268, 738, 150, 150);
    return new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تبدیل گواهی به PNG ناموفق بود.')), 'image/png'));
  }
  function downloadBlob(blob, member) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RLS-Membership-Certificate-' + String(member.member_number).padStart(6,'0') + '.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function render(container, member, options) {
    options = options || {};
    const adminPreview = options.adminPreview === true;
    if (!container || !member || !['approved','suspended'].includes(member.membership_status) || !member.member_number || !member.user_id) return;
    if (container.querySelector('.rls-certificate-section')) return;
    const panel = document.createElement('section');
    panel.className = 'rls-certificate-section' + (adminPreview ? ' rls-certificate-section--admin' : ' rls-certificate-section--download');
    panel.innerHTML = '<div class="rls-certificate-heading"><h2>گواهی عضویت انجمن</h2><p>'+(adminPreview?'پیش‌نمایش فقط برای بررسی مدیر':'نسخه اختصاصی · فایل PNG')+'</p></div>'+
      (adminPreview?'<div class="rls-certificate-frame" hidden><img class="rls-membership-certificate-image" alt="گواهی عضویت برای بررسی مدیر" loading="lazy" decoding="async"></div>':'')+
      '<div class="rls-certificate-actions"><button type="button" class="community-button primary rls-certificate-download">'+(adminPreview?'نمایش گواهی برای بررسی':'دانلود گواهی عضویت (PNG)')+'</button><span class="rls-certificate-hint">'+(adminPreview?'برای جلوگیری از بارگذاری هم‌زمان تصاویر، گواهی پس از انتخاب ساخته می‌شود.':'تصویر گواهی فقط هنگام درخواست دانلود ساخته می‌شود و در صفحه نمایش داده نخواهد شد.')+'</span></div>';
    container.appendChild(panel);
    const button = panel.querySelector('.rls-certificate-download');
    const frame = panel.querySelector('.rls-certificate-frame');
    const preview = panel.querySelector('.rls-membership-certificate-image');
    let blob = null, previewUrl = '';
    button.addEventListener('click', async () => {
      if (button.dataset.busy === '1') return;
      if (blob) {
        downloadBlob(blob, member);
        return;
      }
      button.dataset.busy = '1';
      button.disabled = true;
      button.textContent = 'در حال آماده‌سازی گواهی…';
      try {
        blob = await createBlob(member);
        if (adminPreview) {
          previewUrl = URL.createObjectURL(blob);
          preview.src = previewUrl;
          frame.hidden = false;
          button.textContent = 'دانلود همین گواهی';
          panel.querySelector('.rls-certificate-hint').textContent = 'گواهی ساخته شد؛ برای دریافت فایل، همین دکمه را بزنید.';
        } else {
          downloadBlob(blob, member);
          button.textContent = 'دانلود دوباره گواهی عضویت';
        }
      } catch (error) {
        console.error('RLS membership certificate generation failed:', error);
        button.textContent = 'تلاش دوباره';
        panel.querySelector('.rls-certificate-hint').textContent = 'ساخت گواهی ناموفق بود. دوباره تلاش کنید.';
        blob = null;
      } finally {
        button.disabled = false;
        button.dataset.busy = '0';
      }
    });
    panel.addEventListener('DOMNodeRemoved',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},{once:true});
  }
  window.RLSMembershipCertificate = {render};
})();