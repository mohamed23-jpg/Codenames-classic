/* ============================================================
   CODENAMES CLASSIC - AUDIO MANAGER (v3.0)
   ============================================================
   الملف: audio.js
   الوظيفة: إدارة المؤثرات الصوتية
   التحديثات: إضافة أصوات جديدة (أسطوري، مطور، طرد)، لا إيموجي
   ============================================================ */

const Audio = (() => {
  // ==========================================================
  // المتغيرات
  // ==========================================================
  const sounds = {};
  let volume = 0.8;
  let muted = false;

  // ==========================================================
  // قائمة الأصوات
  // ==========================================================
  const SOUND_FILES = [
    // أساسيات
    "click",
    "hint",
    "correct",
    "wrong",
    "black",
    "win",
    "lose",
    "card-flip",
    "join",
    "leave",
    "turn-start",
    "level-up",
    "notification",

    // أصوات جديدة
    "legendary-join",
    "dev-join",
    "kicked",
    "room-closed",
    "game-start",
    "countdown",
  ];

  // ==========================================================
  // التهيئة
  // ==========================================================
  function init() {
    volume = parseFloat(localStorage.getItem("volume") || "0.8");
    muted = localStorage.getItem("muted") === "true";

    SOUND_FILES.forEach((name) => {
      const audio = new Audio();
      audio.src = `assets/sounds/${name}.mp3`;
      audio.preload = "auto";
      audio.volume = volume;
      audio.load();
      sounds[name] = audio;
    });
  }

  // ==========================================================
  // تشغيل صوت
  // ==========================================================
  function play(name) {
    if (muted) return;
    const s = sounds[name];
    if (!s) {
      console.warn(`الصوت "${name}" غير موجود`);
      return;
    }
    try {
      s.currentTime = 0;
      s.volume = volume;
      s.play().catch((err) => {
        // تجاهل أخطاء التشغيل التلقائي
        console.debug(`فشل تشغيل الصوت ${name}:`, err.message);
      });
    } catch (err) {
      console.debug(`خطأ في تشغيل الصوت ${name}:`, err.message);
    }
  }

  // ==========================================================
  // تعيين مستوى الصوت
  // ==========================================================
  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    localStorage.setItem("volume", volume);
    Object.values(sounds).forEach((s) => (s.volume = volume));
  }

  // ==========================================================
  // كتم / إلغاء كتم الصوت
  // ==========================================================
  function setMuted(v) {
    muted = v;
    localStorage.setItem("muted", v);
  }

  // ==========================================================
  // الحصول على الحالة
  // ==========================================================
  function isMuted() {
    return muted;
  }

  function getVolume() {
    return volume;
  }

  // ==========================================================
  // تشغيل صوت الأسطوري (مع تحسينات)
  // ==========================================================
  function playLegendary() {
    play("legendary-join");
    // يمكن إضافة تأثيرات إضافية
  }

  // ==========================================================
  // تشغيل صوت المطور
  // ==========================================================
  function playDevJoin() {
    play("dev-join");
  }

  // ==========================================================
  // تشغيل صوت الطرد
  // ==========================================================
  function playKicked() {
    play("kicked");
  }

  // ==========================================================
  // تشغيل صوت إغلاق الغرفة
  // ==========================================================
  function playRoomClosed() {
    play("room-closed");
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    init,
    play,
    setVolume,
    setMuted,
    isMuted,
    getVolume,
    playLegendary,
    playDevJoin,
    playKicked,
    playRoomClosed,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Audio = Audio;

console.log("Audio module loaded successfully");