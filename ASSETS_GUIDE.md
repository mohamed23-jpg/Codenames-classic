# دليل الأصول - Codenames Classic

> هذا الدليل يوضح أسماء ومواقع كل الصور والأصوات المطلوبة في المشروع.

---

## مجلد الصور `assets/images/`

```
codenames-client/
└── assets/
    └── images/
        ├── favicon.svg          ✅ موجود (SVG يُستخدم مباشرة)
        ├── logo.svg             ✅ موجود (يُستخدم كاحتياطي)
        ├── logo.png             ⬛ اختياري (يُفضّل PNG 400×120 px)
        └── main-bg.jpg          ⬛ اختياري (خلفية القائمة 1280×720 px)
```

### تفاصيل كل صورة

| اسم الملف | الحجم المقترح | الاستخدام | ملاحظات |
|-----------|--------------|-----------|---------|
| `favicon.svg` | 64×64 px | أيقونة التبويب في المتصفح | ✅ موجود بتصميم CN |
| `logo.png` | 400×120 px | شعار في شاشة التسجيل والقائمة | إذا غاب يُعرض النص |
| `logo.svg` | 400×120 px | احتياطي للشعار | ✅ موجود |
| `main-bg.jpg` | 1280×720 px | خلفية شاشة القائمة الرئيسية | إذا غاب يُعرض gradient |

### توصيات تصميم الشعار (`logo.png`)
- خلفية شفافة أو `#0a0a1e`
- نص `CODE` باللون الأحمر `#ff0040`
- نص `NAMES` باللون الأزرق `#00d4ff`
- نص `CLASSIC` باللون الذهبي `#ffd700`
- خط **Orbitron Bold**
- تأثير توهج (glow) حول النصوص

### توصيات تصميم الخلفية (`main-bg.jpg`)
- ألوان داكنة: `#0a0a1e` → `#1a0a2e`
- نمط شبكة سيبرانية خفيفة
- توهجات بالألوان: أحمر يسار، أزرق يمين، بنفسجي أسفل
- استايل: **Neo-Tokyo Cyberpunk**

---

## مجلد الأصوات `assets/sounds/`

```
codenames-client/
└── assets/
    └── sounds/
        ├── click.mp3            ⬛ صوت نقرة بسيطة
        ├── hint.mp3             ⬛ صوت إرسال التلميح
        ├── correct.mp3          ⬛ تخمين صحيح
        ├── wrong.mp3            ⬛ تخمين خاطئ
        ├── black.mp3            ⬛ البطاقة السوداء (خطير)
        ├── win.mp3              ⬛ فوز الفريق
        ├── lose.mp3             ⬛ خسارة الفريق
        ├── card-flip.mp3        ⬛ قلب بطاقة
        ├── join.mp3             ⬛ دخول لاعب للغرفة
        ├── leave.mp3            ⬛ خروج لاعب من الغرفة
        ├── turn-start.mp3       ⬛ بداية دور جديد
        ├── level-up.mp3         ⬛ ترقية مستوى / مكافأة
        ├── notification.mp3     ⬛ إشعار جديد
        ├── legendary-join.mp3   ⬛ دخول لاعب أسطوري
        └── dev-join.mp3         ⬛ دخول المطور
```

> ✅ = موجود | ⬛ = مطلوب التحميل أو الإنشاء

### وصف كل صوت وكيفية الحصول عليه

| اسم الملف | المدة | النوع | مصدر مقترح |
|-----------|------|-------|------------|
| `click.mp3` | >0.1 ث | نقرة خفيفة / بيب قصير | Freesound: "ui click" |
| `hint.mp3` | 0.3-0.5 ث | صوت "ding" أو معدني | Freesound: "notification chime" |
| `correct.mp3` | 0.5-1 ث | صوت إيجابي / انتصار صغير | Freesound: "success sound" |
| `wrong.mp3` | 0.3-0.5 ث | صوت سلبي / خطأ | Freesound: "error buzz" |
| `black.mp3` | 1-2 ث | صوت مرعب / انفجار | Freesound: "game over dark" |
| `win.mp3` | 2-4 ث | احتفال / موسيقى فوز | Freesound: "victory fanfare" |
| `lose.mp3` | 1-3 ث | صوت محبط / حزين | Freesound: "defeat sound" |
| `card-flip.mp3` | >0.2 ث | قلب ورقة | Freesound: "card flip" |
| `join.mp3` | 0.3-0.5 ث | "whoosh" أو دخول | Freesound: "player join" |
| `leave.mp3` | 0.3-0.5 ث | "swoosh" أو خروج | Freesound: "player leave" |
| `turn-start.mp3` | 0.5-1 ث | صافرة / تنبيه | Freesound: "turn signal" |
| `level-up.mp3` | 1-2 ث | موسيقى صاعدة / ترقية | Freesound: "level up jingle" |
| `notification.mp3` | >0.3 ث | بيب لطيف | Freesound: "soft notification" |
| `legendary-join.mp3` | 1-2 ث | صوت ملكي / مبهر | Freesound: "epic entrance" |
| `dev-join.mp3` | 0.5-1 ث | صوت نظام / تقني | Freesound: "system alert" |

---

## مواقع تحميل الأصوات المجانية

| الموقع | الرابط | الترخيص |
|--------|--------|---------|
| **Freesound** | https://freesound.org | CC - متنوع |
| **Mixkit** | https://mixkit.co/free-sound-effects/ | مجاني للاستخدام |
| **Pixabay** | https://pixabay.com/sound-effects/ | مجاني |
| **ZapSplat** | https://www.zapsplat.com | مجاني مع تسجيل |

---

## مواقع تصميم الصور

| الموقع | الاستخدام |
|--------|----------|
| **Canva** | تصميم الشعار والخلفية |
| **Figma** | تصميم متقدم |
| **Adobe Express** | تصميم سريع |
| **DALL-E / Midjourney** | توليد خلفية AI |

---

## كيف تُضيف الـ Favicon للـ HTML

أضف هذا في `<head>` داخل `index.html` (مضاف مسبقاً):

```html
<link rel="icon" type="image/svg+xml" href="assets/images/favicon.svg" />
<link rel="apple-touch-icon" href="assets/images/favicon.svg" />
```

---

## ملاحظات مهمة

1. **الأصوات الحالية فارغة** - هي placeholder files بحجم 0 bytes
2. **اللعبة تعمل بدون أصوات** - Audio.play() يتجاهل الأخطاء تلقائياً  
3. **الصور اختيارية** - يوجد fallback لكل صورة في الكود
4. **حجم ملفات الصوت** - اجعلها أقل من 200KB لكل ملف
5. **صيغة الصوت** - MP3 هي الأمثل للتوافق مع كل المتصفحات
