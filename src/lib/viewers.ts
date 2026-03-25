/**
 * HTML viewer templates for the site-gateway.
 * Each function returns a complete HTML string ready to be served.
 */

const SHARED_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    background: #fafafa;
    color: #111;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  a { color: #111; text-decoration: underline; text-underline-offset: 2px; }
  a:hover { opacity: 0.7; }
`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function imageViewer(
  fileUrl: string,
  filename: string,
  metadata?: Record<string, unknown>
): string {
  const title = escapeHtml(
    (metadata?.title as string) || filename
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    ${SHARED_STYLES}
    body { background: #111; }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      width: 100%;
    }
    img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 4px;
    }
    .filename {
      color: #888;
      font-size: 12px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${escapeHtml(fileUrl)}" alt="${title}" />
    <div class="filename">${escapeHtml(filename)}</div>
  </div>
</body>
</html>`;
}

export function pdfViewer(fileUrl: string, filename: string): string {
  const title = escapeHtml(filename);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    ${SHARED_STYLES}
    body { background: #f5f5f5; }
    .container {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #111;
      color: #fff;
      font-size: 13px;
    }
    .toolbar a { color: #fff; }
    iframe, embed {
      flex: 1;
      width: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <span>${title}</span>
      <a href="${escapeHtml(fileUrl)}" download>Download</a>
    </div>
    <embed src="${escapeHtml(fileUrl)}" type="application/pdf" />
  </div>
</body>
</html>`;
}

export function videoViewer(fileUrl: string, filename: string): string {
  const title = escapeHtml(filename);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    ${SHARED_STYLES}
    body { background: #111; }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      width: 100%;
    }
    video {
      max-width: 100%;
      max-height: 85vh;
      border-radius: 4px;
    }
    .filename {
      color: #888;
      font-size: 12px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <video controls autoplay>
      <source src="${escapeHtml(fileUrl)}" />
      Your browser does not support the video element.
    </video>
    <div class="filename">${title}</div>
  </div>
</body>
</html>`;
}

export function audioViewer(fileUrl: string, filename: string): string {
  const title = escapeHtml(filename);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    ${SHARED_STYLES}
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 20px;
    }
    .icon { font-size: 48px; }
    .filename { font-size: 14px; color: #111; }
    audio { width: 100%; max-width: 400px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#9835;</div>
    <div class="filename">${title}</div>
    <audio controls autoplay>
      <source src="${escapeHtml(fileUrl)}" />
      Your browser does not support the audio element.
    </audio>
  </div>
</body>
</html>`;
}

export function downloadPage(
  fileUrl: string,
  filename: string,
  size: number,
  contentType: string
): string {
  const title = escapeHtml(filename);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    ${SHARED_STYLES}
    .card {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 32px;
      max-width: 360px;
      width: 100%;
      text-align: center;
    }
    .filename {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      word-break: break-all;
    }
    .meta {
      font-size: 12px;
      color: #888;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      background: #111;
      color: #fff;
      padding: 10px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }
    .btn:hover { opacity: 0.85; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="filename">${title}</div>
    <div class="meta">${formatBytes(size)} &middot; ${escapeHtml(contentType)}</div>
    <a class="btn" href="${escapeHtml(fileUrl)}" download>Download</a>
  </div>
</body>
</html>`;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  contentType?: string;
}

export function directoryListing(
  currentPath: string,
  entries: DirectoryEntry[]
): string {
  const title = escapeHtml(currentPath || "/");
  const rows = entries
    .sort((a, b) => {
      // Directories first, then alphabetical
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((entry) => {
      const icon = entry.isDirectory ? "&#128193;" : "&#128196;";
      const href = escapeHtml(
        entry.path.startsWith("/") ? entry.path : `/${entry.path}`
      );
      const sizeStr = entry.size != null ? formatBytes(entry.size) : "-";
      return `<tr>
        <td>${icon}</td>
        <td><a href="${href}">${escapeHtml(entry.name)}${entry.isDirectory ? "/" : ""}</a></td>
        <td class="size">${entry.isDirectory ? "-" : sizeStr}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Index of ${title}</title>
  <style>
    ${SHARED_STYLES}
    body {
      display: block;
      padding: 24px;
      max-width: 700px;
      margin: 0 auto;
    }
    h1 { font-size: 16px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    td.size { text-align: right; color: #888; white-space: nowrap; }
    tr:hover { background: #f5f5f5; }
    .parent { margin-bottom: 12px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Index of ${title}</h1>
  ${
    currentPath
      ? `<div class="parent"><a href="${escapeHtml(
          "/" + currentPath.split("/").slice(0, -1).join("/")
        )}">&larr; Parent directory</a></div>`
      : ""
  }
  <table>
    ${rows}
  </table>
</body>
</html>`;
}

export function passwordPrompt(slug: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Password required</title>
  <style>
    ${SHARED_STYLES}
    .card {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 32px;
      max-width: 320px;
      width: 100%;
      text-align: center;
    }
    h2 { font-size: 16px; margin-bottom: 16px; }
    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
      margin-bottom: 12px;
    }
    input:focus { outline: none; border-color: #111; }
    button {
      width: 100%;
      background: #111;
      color: #fff;
      border: none;
      padding: 10px;
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    button:hover { opacity: 0.85; }
    .error { color: #dc2626; font-size: 12px; margin-top: 8px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2>This site is password-protected</h2>
    <form id="pw-form">
      <input type="password" id="pw" name="password" placeholder="Enter password" autofocus required />
      <button type="submit">Unlock</button>
      <div class="error" id="error">Incorrect password. Try again.</div>
    </form>
  </div>
  <script>
    document.getElementById("pw-form").addEventListener("submit", async function(e) {
      e.preventDefault();
      const pw = document.getElementById("pw").value;
      const res = await fetch("/api/v1/site-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "${escapeHtml(slug)}", password: pw }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        document.getElementById("error").style.display = "block";
        document.getElementById("pw").value = "";
        document.getElementById("pw").focus();
      }
    });
  </script>
</body>
</html>`;
}

export function notFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 - Not Found</title>
  <style>
    ${SHARED_STYLES}
    .container { text-align: center; }
    h1 { font-size: 48px; margin-bottom: 8px; }
    p { font-size: 14px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>This site does not exist.</p>
  </div>
</body>
</html>`;
}

export function fileNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 - File Not Found</title>
  <style>
    ${SHARED_STYLES}
    .container { text-align: center; }
    h1 { font-size: 48px; margin-bottom: 8px; }
    p { font-size: 14px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>File not found.</p>
  </div>
</body>
</html>`;
}
