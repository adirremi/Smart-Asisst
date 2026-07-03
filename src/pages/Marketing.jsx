import React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  CalendarDays,
  CheckCircle2,
  Bell,
  Users,
  Clock,
  Sparkles,
  Repeat,
  Globe,
  ShieldCheck,
  ListChecks,
  CalendarPlus,
  ArrowLeft,
  Check,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'הבנה חכמה בעברית',
    desc: 'שולחים הודעה רגילה כמו שמדברים — "מחר בחמש בערב להתקשר ליותם" — וה-AI מבין לבד אם זו משימה או אירוע.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: CalendarDays,
    title: 'סנכרון עם Google Calendar',
    desc: 'כל אירוע שנוצר נכנס אוטומטית ליומן Google שלך, בשני הכיוונים, עם הזמן הנכון לפי אזור הזמן שלך.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: ListChecks,
    title: 'משימות ואירועים במקום אחד',
    desc: 'המערכת מפרידה בין מטלות לאירועים, שומרת הכל מסודר ומאפשרת לצפות בכל רגע דרך WhatsApp או האתר.',
    color: 'from-emerald-500 to-green-500',
  },
  {
    icon: Bell,
    title: 'תזכורות יומיות אוטומטיות',
    desc: 'בבוקר מקבלים את רשימת המשימות, בערב את האירועים הקרובים — הכל לפי השעון המקומי שלך.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Users,
    title: 'תיוג חברים באירועים',
    desc: 'מוסיפים אנשי קשר ומזמינים אותם לאירוע ישירות מההודעה — הם מקבלים הזמנה אמיתית ליומן.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Repeat,
    title: 'עריכה, ביטול והשלמה',
    desc: '"תעביר את הפגישה למחר", "בטל את התור", "סיימתי לשלם חשבונות" — הכל בשפה חופשית.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: CalendarPlus,
    title: 'כמה פעולות בהודעה אחת',
    desc: '"לקנות חלב ולהתקשר לאמא מחר בחמש" — נוצרת גם מטלה וגם אירוע, בו זמנית.',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    icon: ShieldCheck,
    title: 'אישור לפני פעולות רגישות',
    desc: 'לפני מחיקה או שליחת הזמנה, הבוט מבקש אישור — כדי שכלום לא יקרה בטעות.',
    color: 'from-slate-500 to-slate-700',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'שולחים הודעה ב-WhatsApp',
    desc: 'כותבים בשפה חופשית מה צריך לעשות — בדיוק כמו שהייתם מספרים לחבר.',
  },
  {
    n: '2',
    title: 'ה-AI מבין ומארגן',
    desc: 'המערכת מזהה תאריך, שעה וכוונה, ויוצרת אירוע ביומן או מטלה ברשימה.',
  },
  {
    n: '3',
    title: 'מקבלים אישור ותזכורות',
    desc: 'הודעת אישור חוזרת אליכם, והכל מסונכרן ליומן עם תזכורות יומיות אוטומטיות.',
  },
];

function Bubble({ from, children, time }) {
  const isUser = from === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`relative max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-sm'
            : 'bg-white text-slate-800 rounded-tl-sm'
        }`}
      >
        <p className="whitespace-pre-line">{children}</p>
        <span className="mt-1 block text-[10px] text-slate-400 text-left" dir="ltr">
          {time} {isUser && <Check className="inline h-3 w-3 -mt-0.5 text-sky-500" />}
        </span>
      </div>
    </div>
  );
}

export default function Marketing() {
  return (
    <div dir="rtl" className="min-h-screen bg-white text-slate-900 antialiased">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-lg shadow-purple-500/20">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              יומן<span className="text-purple-600">חכם</span>
            </span>
          </div>
          <Link
            to="/login"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            התחברות
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-50/70 via-white to-white" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="text-center lg:text-right">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700">
              <Sparkles className="h-4 w-4" />
              עוזר אישי מבוסס AI ב-WhatsApp
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              היומן שלך,
              <br />
              <span className="bg-gradient-to-l from-purple-600 to-blue-500 bg-clip-text text-transparent">
                בהודעת WhatsApp אחת
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600 lg:mx-0">
              שולחים הודעה רגילה בעברית, וה-AI שלנו יוצר אירועים ומשימות, מסנכרן ל-Google
              Calendar ושולח תזכורות — בלי אפליקציות מסובכות ובלי טפסים.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link
                to="/login"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-purple-600 to-blue-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-xl hover:shadow-purple-500/40 sm:w-auto"
              >
                התחילו עכשיו — חינם
                <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
              </Link>
              <a
                href="#how"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:border-slate-300 sm:w-auto"
              >
                איך זה עובד?
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> התחברות עם Gmail
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> סנכרון דו-כיווני
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> תמיכה מלאה בעברית
              </span>
            </div>
          </div>

          <div className="relative">
            <img
              src="/marketing/hero.png"
              alt="עוזר יומן חכם ב-WhatsApp"
              className="mx-auto w-full max-w-md drop-shadow-2xl"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Live chat demo */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-slate-900 shadow-2xl">
              {/* chat header */}
              <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">יומן חכם</p>
                  <p className="text-[11px] text-white/70">מקוון · עונה תוך שניות</p>
                </div>
              </div>
              {/* chat body */}
              <div
                className="space-y-2.5 bg-[#e5ddd5] px-3 py-4"
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27%3E%3Ccircle cx=%272%27 cy=%272%27 r=%271%27 fill=%27%23d3cabd%27/%3E%3C/svg%3E")',
                }}
              >
                <Bubble from="user" time="20:41">
                  מחר בחמש בערב פגישה עם דנה במשרד
                </Bubble>
                <Bubble from="bot" time="20:41">
                  {'היי! יצרתי אירוע חדש 📅\n"פגישה עם דנה במשרד"\nמחר בשעה 17:00\n\n🔗 לצפייה ביומן'}
                </Bubble>
                <Bubble from="user" time="20:42">
                  לקנות חלב ולהתקשר לאמא מחר בשמונה
                </Bubble>
                <Bubble from="bot" time="20:42">
                  {'הוספתי עבורך:\n✅ לקנות חלב\n📅 להתקשר לאמא — מחר 20:00'}
                </Bubble>
                <Bubble from="user" time="20:43">
                  מה יש לי מחר?
                </Bubble>
                <Bubble from="bot" time="20:43">
                  {'האירועים שלך למחר:\n1. פגישה עם דנה, 17:00\n2. להתקשר לאמא, 20:00'}
                </Bubble>
              </div>
            </div>
          </div>

          <div className="order-1 text-center lg:order-2 lg:text-right">
            <h2 className="text-3xl font-bold sm:text-4xl">מדברים איתו כמו עם אדם</h2>
            <p className="mt-4 text-lg text-slate-600">
              בלי כפתורים, בלי תפריטים. פשוט כותבים מה שצריך והעוזר החכם דואג לשאר —
              מזהה תאריכים ושעות, מנקה את הטקסט, ויוצר בדיוק את מה שהתכוונתם אליו.
            </p>
            <ul className="mt-6 space-y-3 text-right">
              {[
                'מזהה לבד אם זו משימה או אירוע',
                'מבין "מחר", "יום ראשון הבא", "בערב" ועוד',
                'מסיר ביטויי זמן ויוצר כותרת נקייה',
                'עונה בהודעת אישור ברורה',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-4 w-4 text-green-600" />
                  </span>
                  <span className="text-slate-700">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">כל מה שצריך כדי לא לשכוח כלום</h2>
            <p className="mt-4 text-lg text-slate-600">
              יכולות מתקדמות שעובדות ברקע, כדי שאתם רק תשלחו הודעה.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg`}
                >
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">משלב הודעה ליומן מסודר</h2>
              <p className="mt-4 text-lg text-slate-600">
                שלושה צעדים פשוטים, וזהו. אין מה להתקין ואין מה ללמוד.
              </p>
              <div className="mt-10 space-y-8">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex gap-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500 text-lg font-bold text-white shadow-lg">
                      {s.n}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{s.title}</h3>
                      <p className="mt-1 text-slate-600">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-100/60 to-blue-100/60 blur-2xl" />
              <img
                src="/marketing/flow.png"
                alt="הודעה שהופכת לאירוע ביומן"
                className="relative mx-auto w-full max-w-lg"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Reminders highlight */}
      <section className="bg-gradient-to-l from-purple-600 to-blue-600 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">תזכורות שמגיעות בדיוק בזמן</h2>
              <p className="mt-4 text-lg text-white/85">
                אין צורך לזכור לבדוק — העוזר שולח לכם סיכום יומי ל-WhatsApp, לפי אזור הזמן
                המקומי שלכם.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm ring-1 ring-white/20">
                <Clock className="mb-3 h-8 w-8" />
                <p className="text-2xl font-bold">בבוקר</p>
                <p className="mt-1 text-white/85">רשימת המשימות שלך להיום, כדי להתחיל ממוקד.</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm ring-1 ring-white/20">
                <CalendarDays className="mb-3 h-8 w-8" />
                <p className="text-2xl font-bold">בערב</p>
                <p className="mt-1 text-white/85">האירועים הקרובים שלך, כדי להתכונן מראש.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-lg">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold sm:text-4xl">מוכנים לנהל את הזמן בקלות?</h2>
          <p className="mt-4 text-lg text-slate-600">
            הצטרפו והתחברו עם חשבון ה-Gmail שלכם. מכאן — הכל בהודעה אחת.
          </p>
          <Link
            to="/login"
            className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-purple-600 to-blue-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-xl hover:shadow-purple-500/40"
          >
            התחילו עכשיו
            <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-slate-500">
            <Globe className="h-4 w-4" />
            <span className="text-sm">יומן חכם — עוזר אישי לניהול זמן</span>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} כל הזכויות שמורות
          </p>
        </div>
      </footer>
    </div>
  );
}
