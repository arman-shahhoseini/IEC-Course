export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>این صفحه بارگذاری نشد</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: "Vazirmatn", system-ui, -apple-system, sans-serif;
        background: #fafafa;
        color: #1d1d1f;
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 1.5rem;
      }
      .card {
        max-width: 28rem;
        width: 100%;
        text-align: center;
        padding: 2.5rem 2rem;
        background: #fff;
        border-radius: 24px;
        border: 1px solid #ececec;
        box-shadow: 0 20px 60px -20px rgba(29, 29, 31, 0.18);
      }
      .icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 1.5rem;
        background: rgba(193, 18, 31, 0.06);
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #c1121f;
      }
      h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 800; }
      p { color: #6e6e73; margin-bottom: 1.5rem; line-height: 1.6; font-size: 0.95rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button {
        padding: 0.65rem 1.5rem;
        border-radius: 18px;
        font: inherit;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s;
      }
      .primary { background: #c1121f; color: #fff; }
      .primary:hover { background: #a30e18; }
      .secondary { background: #fff; color: #1d1d1f; border-color: #ececec; }
      .secondary:hover { background: #f5f5f7; }
      .footer { margin-top: 2rem; font-size: 0.8rem; color: #6e6e73; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h1>این صفحه بارگذاری نشد</h1>
      <p>مشکلی پیش آمد. لطفاً صفحه را مجدداً بارگذاری کنید یا به صفحه اصلی بازگردید.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">تلاش دوباره</button>
        <a class="secondary" href="/">بازگشت به صفحه اصلی</a>
      </div>
      <div class="footer">مرکز کارآفرینی بین‌المللی دانشگاه شمال</div>
    </div>
  </body>
</html>`;
}
