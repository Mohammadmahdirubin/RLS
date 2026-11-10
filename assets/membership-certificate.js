/* RLS Membership Certificate — landscape A4 SVG image */
(function () {
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits = v => String(v).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const groups = {student:'دانشجو',graduate:'دانش‌آموخته',faculty:'استاد و عضو هیئت علمی',researcher:'پژوهشگر',translator:'مترجم',culture:'ادبیات و فرهنگ',honorary:'عضو افتخاری'};
  function faDate(value) {
    const d = new Date(value);
    if (!value || Number.isNaN(d.getTime())) return 'ثبت نشده';
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Tehran'}).format(d).replace(/\u200e/g,'');
  }
  function memberNo(v) {
    const n = Number(v);
    return Number.isSafeInteger(n) && n > 0 ? digits(String(n).padStart(6,'0')) : '—';
  }
  function svgFor(m) {
    const name = String(m.display_name || m.full_name || '').replace(/^\\s*(?:(?:آقای|خانم|جناب آقای|سرکار خانم)\\s*|(?:Mr\\.?|Mrs\\.?|Ms\\.?|г-н|г-жа)\\s*)/i,'').trim();
    const group = groups[m.category] || m.category || '—';
    const join = faDate(m.reviewed_at || m.created_at);
    const issued = faDate(new Date().toISOString());
    const num = memberNo(m.member_number);
    const profile = 'https://rlsj.ir/community.html?member=' + encodeURIComponent(m.user_id);
    const qr = 'https://quickchart.io/qr?text=' + encodeURIComponent(profile) + '&size=260&margin=2&format=svg';
    return [
'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="297mm" height="210mm" viewBox="0 0 1684 1190">',
'<defs><linearGradient id="paper" x2="0" y2="1"><stop stop-color="#fffdf5"/><stop offset="1" stop-color="#f6ecd4"/></linearGradient><linearGradient id="navy" x2="1" y2="1"><stop stop-color="#10284e"/><stop offset="1" stop-color="#244c7e"/></linearGradient><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#fff0b1"/><stop offset=".5" stop-color="#c69a43"/><stop offset="1" stop-color="#8d6422"/></linearGradient></defs>',
'<rect width="1684" height="1190" fill="url(#paper)"/><rect x="20" y="20" width="1644" height="1150" rx="8" fill="none" stroke="#10284e" stroke-width="15"/><rect x="38" y="38" width="1608" height="1114" rx="5" fill="none" stroke="url(#gold)" stroke-width="8"/><rect x="53" y="53" width="1578" height="1084" fill="none" stroke="#18365e" stroke-width="2"/>',
'<path d="M53 170 Q180 170 245 53 M1631 170 Q1504 170 1439 53 M53 1020 Q180 1020 245 1137 M1631 1020 Q1504 1020 1439 1137" fill="none" stroke="url(#gold)" stroke-width="10"/>',
'<g transform="translate(78 70)"><circle cx="112" cy="112" r="94" fill="#fffaf0" stroke="url(#gold)" stroke-width="9"/><circle cx="112" cy="112" r="81" fill="none" stroke="#17365f" stroke-width="3"/><path d="M58 135h108l-10 13H68zM70 130V82h12v48M92 130V65h12v65M116 130V65h12v65M138 130V82h12v48" fill="#17365f"/><path d="M48 157q37-15 64 7q28-22 64-7v19q-34-15-64 7q-30-22-64-7z" fill="#17365f" stroke="#c69a43" stroke-width="3"/><text x="112" y="35" text-anchor="middle" font-family="Georgia,serif" font-size="15" fill="#17365f">RUSSIAN LANGUAGE</text><text x="112" y="205" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#17365f">STUDIES</text></g>',
'<g transform="translate(1340 75)"><path d="M0 0h260v40H0z" fill="#fff"/><path d="M0 40h260v40H0z" fill="#24549a"/><path d="M0 80h260v40H0z" fill="#c93a42"/><path d="M198 125h12v160h-12zM180 285h50v12h-50z" fill="#b77f30"/><path d="M178 285v-90l26-42 26 42v90z" fill="#b65a3b" stroke="#8b4a2b" stroke-width="3"/><path d="M196 195v-28l8-14 8 14v28z" fill="#d7b66b"/></g>',
'<text x="842" y="105" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="42" font-weight="bold" fill="#122d55">انجمن مطالعات زبان روسی</text><text x="842" y="151" text-anchor="middle" font-family="Georgia,serif" font-size="31" fill="#18365e">Russian Language Studies Association</text>',
'<path d="M630 178h424" stroke="url(#gold)" stroke-width="5"/><path d="M820 178q22-27 44 0q-22 27-44 0" fill="none" stroke="url(#gold)" stroke-width="4"/>',
'<rect x="505" y="204" width="674" height="125" rx="30" fill="url(#navy)" stroke="url(#gold)" stroke-width="9"/><rect x="520" y="218" width="644" height="97" rx="23" fill="none" stroke="#f3d98e" stroke-width="2"/><text x="842" y="263" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="48" font-weight="bold" fill="#f6df9e">گواهی عضویت</text><text x="842" y="303" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#fff1c5">Certificate of Membership</text>',
'<g opacity=".28" fill="#b79b67" stroke="#9e895d" stroke-width="5"><path d="M65 710V575l65-75 65 75v135zM215 710V520l75-80 75 80v190zM365 710V610l60-65 60 65v100z"/></g>',
'<text x="842" y="420" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="36" fill="#18365e">بدین‌وسیله گواهی می‌شود:</text><path d="M300 455h290M1094 455h290" stroke="url(#gold)" stroke-width="5"/>',
'<text x="842" y="535" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="58" font-weight="bold" fill="#10284e">'+esc(name)+'</text>',
'<text x="842" y="615" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="35" fill="#18365e">از تاریخ '+esc(join)+' به‌عنوان عضو گروه '+esc(group)+'</text>',
'<text x="842" y="680" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="32" fill="#18365e">در انجمن مطالعات زبان روسی پذیرفته شده و عضویت ایشان به ثبت رسیده است.</text>',
'<g transform="translate(180 790)"><text x="0" y="0" font-family="Tahoma,Arial,sans-serif" font-size="27" fill="#18365e">رئیس انجمن مطالعات زبان روسی</text><path d="M0 95q70-75 130-15t130-5" fill="none" stroke="#18365e" stroke-width="5" stroke-linecap="round"/><path d="M0 115h270" stroke="url(#gold)" stroke-width="3"/></g>',
'<g transform="translate(842 900)"><circle r="104" fill="#f8f0df" stroke="url(#gold)" stroke-width="9"/><circle r="87" fill="none" stroke="#17365f" stroke-width="4"/><path d="M-45 12h90l-9 10h-72zM-30 7v-44h10V7M-8 7v-58h12V7M18 7v-44h10V7" fill="#17365f"/><path d="M-56 32q31-16 56 6q25-22 56-6v15q-32-12-56 10q-24-22-56-10z" fill="#17365f"/><text x="0" y="-63" text-anchor="middle" font-family="Georgia,serif" font-size="14" fill="#17365f">RUSSIAN LANGUAGE STUDIES</text><text x="0" y="78" text-anchor="middle" font-family="Georgia,serif" font-size="16" fill="#17365f">JOURNAL</text></g>',
'<g transform="translate(1230 795)"><text x="0" y="0" text-anchor="end" font-family="Tahoma,Arial,sans-serif" font-size="29" fill="#18365e">شماره عضویت: '+esc(num)+'</text><text x="0" y="55" text-anchor="end" font-family="Tahoma,Arial,sans-serif" font-size="29" fill="#18365e">تاریخ صدور: '+esc(issued)+'</text><text x="0" y="110" text-anchor="end" font-family="Tahoma,Arial,sans-serif" font-size="21" fill="#7a6335">QR: مشاهده پروفایل عضو</text></g>',
'<rect x="1380" y="790" width="190" height="190" rx="8" fill="#fff" stroke="url(#gold)" stroke-width="5"/><image x="1390" y="800" width="170" height="170" xlink:href="'+esc(qr)+'" preserveAspectRatio="xMidYMid meet"/>',
'<path d="M80 1070q80-90 130-10q50 80 100 0M1604 1070q-80-90-130-10q-50 80-100 0" fill="none" stroke="url(#gold)" stroke-width="9"/><path d="M280 1100h1124" stroke="url(#gold)" stroke-width="3"/><text x="842" y="1132" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="#7d6331">RLS · Russian Language Studies Association</text></svg>'
    ].join('');
  }
  function render(container, m) {
    if (!container || !m || m.membership_status !== 'approved' || !m.member_number) return;
    if (container.querySelector('.rls-certificate-section')) return;
    const panel = document.createElement('section');
    panel.className = 'rls-certificate-section';
    panel.innerHTML = '<div class="rls-certificate-heading"><h2>گواهی عضویت انجمن</h2><p>نسخه رسمی · قطع A4 افقی</p></div><div class="rls-certificate-frame"><img class="rls-membership-certificate-image" alt="گواهی عضویت انجمن مطالعات زبان روسی" role="button" tabindex="0" title="برای بزرگ‌نمایی کلیک کنید"></div><div class="rls-certificate-actions"><button type="button" class="community-button primary rls-certificate-download">دانلود تصویر گواهی</button><span class="rls-certificate-hint">برای بزرگ‌نمایی دوبرابری روی تصویر کلیک کنید.</span></div>';
    container.appendChild(panel);
    const img = panel.querySelector('img');
    const url = URL.createObjectURL(new Blob([svgFor(m)], {type:'image/svg+xml;charset=utf-8'}));
    img.src = url;
    const zoom = () => img.classList.toggle('is-zoomed');
    img.addEventListener('click', zoom);
    img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoom(); } });
    panel.querySelector('.rls-certificate-download').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RLS-Membership-Certificate-' + String(m.member_number).padStart(6,'0') + '.svg';
      document.body.appendChild(a); a.click(); a.remove();
    });
  }
  window.RLSMembershipCertificate = {render};
})();