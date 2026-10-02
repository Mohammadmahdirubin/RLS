# RLS Content System

این پوشه ورودی محتوای ساختاریافته سایت است.

## هدف

از این پس محتوای جدید می‌تواند از یک رکورد مرکزی وارد شود و GitHub Actions نسخه‌های فارسی، انگلیسی و روسی صفحات را بسازد.

### مقالات

برای مقاله جدید، یک فایل JSON در `content/articles/` قرار دهید.

فیلدهای اصلی:

- `id`
- `number`
- `slug`
- `status`
- `issue`
- `title.fa/en/ru`
- `abstract.fa/en/ru`
- `keywords.fa/en/ru`
- `author`
- `authorGiven`
- `authorFamily`
- `orcid`
- `affiliation.fa/en/ru`
- `received`
- `accepted`
- `online`
- `volume`
- `issueNumber`
- `firstPage`
- `lastPage`
- `pdf`
- `language`

اگر متن انگلیسی و روسی وارد نشده باشد، گردش‌کار انتشار می‌تواند آن‌ها را با سرویس ترجمه متصل‌شده تولید کند؛ نسخه تولیدشده قبل از انتشار در فایل JSON ذخیره می‌شود.

## تصاویر و مدارک

مسیر فایل‌ها به‌صورت نسبی به ریشه مخزن ثبت می‌شود. بنابراین همان فایل در هر سه نسخه زبانی استفاده می‌شود و لازم نیست سه بار آپلود شود.

مثال:

`assets/authors/ali-zomorodi.jpg`

`assets/verification/letters/ali-zomorodi.pdf`

## نکته مهم

محتوای صفحات موجود فعلاً دست‌نخورده می‌ماند. سیستم جدید برای محتوای جدید طراحی شده و بعد از تست موفق می‌توان قالب‌های قدیمی را مرحله‌به‌مرحله به آن منتقل کرد.
