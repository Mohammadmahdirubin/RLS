# راه‌اندازی سامانه گواهی داوری RLS

## فایل‌ها و مسیرها
- صفحه عمومی استعلام: `/certificate-verify.html`
- پنل داخلی صدور: `/admin/certificates.html`
- API: همان Worker مدیریتی `rls-manuscript-admin`
- جدول جدید D1: `reviewer_certificates`

## ۱. مهاجرت پایگاه داده
در Cloudflare Dashboard → Workers & Pages → D1 → پایگاه داده `rls-manuscripts` → Console، فایل `workers/migrations/002_reviewer_certificates.sql` را اجرا کنید. این مهاجرت مستقل است و جدول مقالات را تغییر نمی‌دهد. اجرای مجدد بی‌خطر است.

## ۲. انتشار Worker
محتوای به‌روزشده `workers/manuscript-admin.js` را در Worker موجود `rls-manuscript-admin` جایگزین و Deploy کنید. اتصال D1 با نام `DB` و Secret موجود `ADMIN_TOKEN` را حفظ کنید. Worker ارسال مقاله را تغییر ندهید.

## ۳. فایل مهر
مهر نشریه باید در مخزن با مسیر `assets/seal_image.png` موجود باشد. پنل چاپ گواهی به همین مسیر ارجاع می‌دهد.

## ۴. آزمایش
1. در `https://rlsj.ir/admin/certificates.html` به پنل متصل شوید.
2. یک گواهی آزمایشی با نام و تعداد دلخواه ثبت کنید.
3. QR را با تلفن همراه اسکن و صفحه `certificate-verify.html` را بررسی کنید.
4. PDF را از پنجره چاپ با گزینه Save as PDF ذخیره کنید.
5. یک گواهی آزمایشی را باطل و بررسی کنید که صفحه استعلام وضعیت «باطل‌شده» را نشان دهد.
6. گواهی جدید برای همان داور صادر کنید و مطمئن شوید شناسه و سابقه گواهی قبلی تغییر نکرده است.

## API
- عمومی: `GET /certificate-api/verify?code=RLS-RV-YYYY-000001`
- مدیریتی: `GET /admin-api/certificates`
- مدیریتی: `POST /admin-api/certificates`
- مدیریتی: `PATCH /admin-api/certificates/{id}` با وضعیت `active` یا `revoked`

## نکات
- تعداد داوری را مدیر نشریه تعیین می‌کند.
- تاریخ صدور در پنل به‌صورت خودکار با تقویم هجری شمسی پیشنهاد می‌شود و قابل ویرایش است.
- هر بار صدور شناسه مستقل می‌گیرد؛ رکوردهای قبلی حذف یا بازنویسی نمی‌شوند.
- QR به صفحه عمومی استعلام همان گواهی وصل می‌شود.
- PDF از پنجره چاپ مرورگر ساخته می‌شود؛ برای خروجی A4 افقی، گزینه Background graphics را فعال کنید.
