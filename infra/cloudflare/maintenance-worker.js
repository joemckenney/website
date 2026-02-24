/**
 * Cloudflare Worker — Maintenance page for crowprose.com
 *
 * Catches 502/503 from the origin (k3s down, tunnel unreachable)
 * and serves a branded maintenance page. No external dependencies.
 *
 * Deploy:
 *   Cloudflare Dashboard → Workers & Pages → Create Worker
 *   Attach route: *crowprose.com/*
 */

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crowprose — Maintenance</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DIN+Alternate:wght@700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, system-ui, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      text-align: center;
      padding: 2rem;
      max-width: 480px;
    }

    h1 {
      font-size: 2.25rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }

    p {
      font-size: 1.125rem;
      line-height: 1.5;
      color: #4d4d4d;
      margin-bottom: 0.5rem;
    }

    .divider {
      width: 60px;
      height: 3px;
      background: #000000;
      margin: 1.5rem auto;
    }

    .status {
      font-size: 0.875rem;
      color: #808080;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Crowprose</h1>
    <div class="divider"></div>
    <p>We'll be right back.</p>
    <p class="status">Scheduled maintenance in progress</p>
  </div>
</body>
</html>`;

export default {
  async fetch(request) {
    try {
      const response = await fetch(request);
      if (response.status === 502 || response.status === 503) {
        return new Response(MAINTENANCE_HTML, {
          status: 503,
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }
      return response;
    } catch {
      return new Response(MAINTENANCE_HTML, {
        status: 503,
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }
  },
};
