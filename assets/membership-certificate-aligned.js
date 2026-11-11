/* RLS Membership Certificate — fast client-side generation with local QR */
(function () {
  'use strict';

  const TEMPLATE_URL = '/Bilingual%20Russian%20Language%20Membership%20Certificate.png?v=20261111';
  const QR_LIBRARY_URL = '/assets/rls-qrcode.min.js?v=20261111';
  const PROFILE_BASE = 'https://rlsj.ir/community.html?member=';

  let templatePromise = null;
  let qrLibraryPromise = null;
  const qrCanvases = new Map();
  const objectUrls = new Set();

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

  function loadImage(src) {
    return new Promise((resolve,reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('بارگذاری قالب گواهی ناموفق بود.'));
      image.src = src;
      if (image.complete && image.naturalWidth) resolve(image);
    });
  }

  function getTemplate() {
    if (!templatePromise) {
      templatePromise = loadImage(TEMPLATE_URL).catch(error => {
        templatePromise = null;
        throw error;
      });
    }
    return templatePromise;
  }

  function loadQrLibrary() {
    if (window.QRCode) return Promise.resolve(window.QRCode);
    if (!qrLibraryPromise) {
      qrLibraryPromise = new Promise((resolve,reject) => {
        const script = document.createElement('script');
        script.src = QR_LIBRARY_URL;
        script.async = true;
        script.onload = () => window.QRCode
          ? resolve(window.QRCode)
          : reject(new Error('کتابخانه ساخت QR بارگذاری نشد.'));
        script.onerror = () => reject(new Error('بارگذاری ابزار داخلی ساخت QR ناموفق بود.'));
        document.head.appendChild(script);
      }).catch(error => {
        qrLibraryPromise = null;
        throw error;
      });
    }
    return qrLibraryPromise;
  }

  function getQrCanvas(userId) {
    if (qrCanvases.has(userId)) return qrCanvases.get(userId);
    const task = loadQrLibrary().then(QR => {
      const host = document.createElement('div');
      host.setAttribute('aria-hidden','true');
      host.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:320px;overflow:hidden;pointer-events:none';
      document.body.appendChild(host);
      try {
        new QR(host, {
          text: PROFILE_BASE + encodeURIComponent(userId),
          width: 320,
          height: 320,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QR.CorrectLevel.H
        });
        const canvas = host.querySelector('canvas');
        if (canvas && canvas.width) return canvas;
        const image = host.querySelector('img');
        if (image && image.complete && image.naturalWidth) return image;
        if (image) {
          return new Promise((resolve,reject) => {
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('ساخت تصویر QR ناموفق بود.'));
          });
        }
        throw new Error('مرورگر امکان ساخت تصویر QR را فراهم نکرد.');
      } finally {
        // The canvas/image remains usable after its temporary wrapper is removed.
        host.remove();
      }
    }).catch(error => {
      qrCanvases.delete(userId);
      throw error;
    });
    qrCanvases.set(userId, task);
    return task;
  }

  function preload() {
    // Start the 2.5 MB template download while the member record is being fetched.
    getTemplate().catch(() => {});
    loadQrLibrary().catch(() => {});
  }

  function render(container, member) {
    if (!container || !member || member.membership_status !== 'approved' || !member.member_number || !member.user_id) return;
    if (container.querySelector('.rls-certificate-section')) return;

    const panel = document.createElement('section');
    panel.className = 'rls-certificate-section';
    panel.innerHTML = '<div class="rls-certificate-heading"><h2>گواهی عضویت انجمن</h2><p>نسخه رسمی · تصویر PNG</p></div><div class="rls-certificate-frame"><div class="rls-certificate-loading" role="status">در حال آماده‌سازی گواهی عضویت…</div><img class="rls-membership-certificate-image" alt="گواهی عضویت اختصاصی عضو" width="1500" height="1000" hidden /></div><div class="rls-certificate-actions"><button type="button" class="community-button primary rls-certificate-download" disabled>در حال صدور گواهی…</button><span class="rls-certificate-hint">نسخه عمومی گواهی عضویت؛ اطلاعات آن از پرونده تأییدشده عضو درج شده است.</span></div>';
    container.appendChild(panel);

    const preview = panel.querySelector('.rls-membership-certificate-image');
    const loading = panel.querySelector('.rls-certificate-loading');
    const download = panel.querySelector('.rls-certificate-download');
    let pngUrl = '';

    const build = async () => {
      const [template, qr] = await Promise.all([getTemplate(), getQrCanvas(member.user_id)]);
      if (!panel.isConnected) return;

      const canvas = document.createElement('canvas');
      canvas.width = template.naturalWidth;
      canvas.height = template.naturalHeight;
      const ctx = canvas.getContext('2d', {alpha:false});
      if (!ctx) throw new Error('ساخت بوم گواهی در این مرورگر ممکن نیست.');

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
      ctx.fillText(membershipNumber(member.member_number), 350, 770, 250);
      ctx.fillText(groups[member.category] || member.category || '—', 350, 826, 250);
      ctx.fillText(faDate(member.created_at), 350, 882, 250);

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1265, 735, 156, 156);
      ctx.drawImage(qr, 1268, 738, 150, 150);

      const blob = await new Promise((resolve,reject) => {
        canvas.toBlob(value => value
          ? resolve(value)
          : reject(new Error('تبدیل گواهی به PNG ناموفق بود.')), 'image/png');
      });
      if (!panel.isConnected) return;

      pngUrl = URL.createObjectURL(blob);
      objectUrls.add(pngUrl);
      preview.src = pngUrl;
      preview.hidden = false;
      loading.hidden = true;
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
    };

    build().catch(error => {
      console.error('RLS membership certificate generation failed:', error);
      loading.textContent = 'آماده‌سازی گواهی با خطا روبه‌رو شد. برای تلاش دوباره دکمه زیر را بزنید.';
      download.disabled = false;
      download.textContent = 'تلاش دوباره برای نمایش گواهی';
      download.onclick = () => {
        loading.textContent = 'در حال آماده‌سازی گواهی عضویت…';
        download.disabled = true;
        download.textContent = 'در حال صدور گواهی…';
        build().catch(retryError => {
          console.error('RLS membership certificate retry failed:', retryError);
          loading.textContent = 'بارگذاری گواهی ناموفق بود؛ دوباره تلاش کنید.';
          download.disabled = false;
          download.textContent = 'تلاش دوباره برای نمایش گواهی';
        });
      };
    });
  }

  window.RLSMembershipCertificate = {render,preload};

  if (new URLSearchParams(location.search).has('member')) preload();

  window.addEventListener('pagehide', () => {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.clear();
  }, {once:true});
})();
