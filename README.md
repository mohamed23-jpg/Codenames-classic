# Codenames Classic - Frontend

## نشر على Vercel

1. ارفع مجلد `codenames-client/` على GitHub
2. افتح vercel.com → New Project → اربط الـ repo
3. **لا تحتاج أي متغيرات بيئة** (السيرفر URL مكتوب مباشرة في الكود)
4. Build Settings:
   - Framework: **Other**
   - Root Directory: `codenames-client`
   - Build Command: *(فارغ)*
   - Output Directory: `.`

## بعد النشر

1. افتح `js/socket-client.js` وتأكد أن `SERVER_URL` = رابط Render الخاص بك
2. اذهب لـ Render → بيئة السيرفر → `CLIENT_ORIGIN` = رابط Vercel

## ملفات مهمة

| الملف | الوصف |
|-------|-------|
| `index.html` | الصفحة الرئيسية بكل الشاشات |
| `css/style.css` | كل التصميم (Neo-Tokyo Cyberpunk) |
| `js/app.js` | منطق التطبيق الرئيسي + التسجيل |
| `js/game.js` | منطق اللعبة + اللوبي |
| `js/socket-client.js` | الاتصال بالسيرفر |
| `js/ui.js` | إدارة الواجهة |
| `js/effects.js` | الجزيئات + الأفاتارات + الألعاب النارية |
| `js/audio.js` | مدير الصوت |

## الأصوات

ملفات الصوت في `assets/sounds/` فارغة حالياً (placeholders).
بدّلها بملفات MP3 حقيقية من موقع مثل [freesound.org](https://freesound.org).

الملفات المطلوبة:
- `click.mp3` - نقرة بسيطة
- `hint.mp3` - عند إرسال تلميح
- `correct.mp3` - تخمين صحيح
- `wrong.mp3` - تخمين خاطئ
- `black.mp3` - البطاقة السوداء
- `win.mp3` - فوز
- `lose.mp3` - خسارة
- `card-flip.mp3` - قلب بطاقة
- `join.mp3` - دخول لاعب
- `leave.mp3` - خروج لاعب
- `turn-start.mp3` - بداية دور
- `level-up.mp3` - ترقية مستوى
- `notification.mp3` - إشعار
- `legendary-join.mp3` - دخول أسطوري
- `dev-join.mp3` - دخول المطور

## الحساب التطويري

اكتب الاسم: `DOoOla-Dev` (غير حساس للحروف)
→ يحصل على playerId: `00000000`، وصول للوحة القائد
