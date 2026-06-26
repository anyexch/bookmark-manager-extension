const api = globalThis.browser || globalThis.chrome;

const I18N = {
  zh: {
    appTitle: "书签导入导出",
    languageLabel: "语言",
    statusReady: "扫描当前书签，或选择文件导入。删除/清空导入需要输入确认文本。",
    currentBookmarks: "当前书签",
    currentFolders: "当前文件夹",
    importBookmarks: "待导入书签",
    importFolders: "待导入文件夹",
    exportTitle: "导出 Chrome 书签",
    scanBtn: "扫描书签",
    exportMarkdown: "导出 Markdown",
    exportJson: "导出 JSON",
    exportHtml: "导出 HTML",
    includePrompt: "Markdown 加入 AI 分类提示词",
    includeDates: "导出添加日期",
    importTitle: "导入书签文件",
    clearBeforeImport: "导入前先清空现有书签",
    importBtn: "导入文件",
    deleteTitle: "删除全部书签",
    deleteHelp: "会删除书签栏、其他书签、移动书签等根目录下的全部子书签和文件夹。",
    confirmLabel: "确认文本",
    confirmPlaceholder: "输入 DELETE ALL",
    deleteBtn: "仅删除全部书签",
    previewTitle: "预览",
    previewPlaceholder: "扫描或选择导入文件后显示预览",
    aiPrompt: "请把下面的书签按主题重新分类，输出三组：保留、待确认、建议删除。判断时优先删除失效、重复、临时阅读、营销页、低价值工具页；优先保留账号入口、长期参考资料、工作流工具、重要文档、项目资源。请为每条建议删除的书签给一句中文理由。",
    jsonMissing: "JSON 中没有找到 bookmarks 或 items 数组",
    htmlMissing: "HTML 中没有找到 Chrome 书签结构",
    confirmRequired: "请先输入 DELETE ALL",
    reading: "正在读取浏览器书签...",
    scanDone: "扫描完成，可以导出。",
    importRootMissing: "找不到可导入的书签根目录",
    readFailed: "读取失败：{message}",
    parsedDone: "已解析 {count} 条待导入书签。",
    parseFailed: "解析失败：{message}",
    chooseImportFile: "请先选择导入文件",
    processing: "正在处理书签...",
    importDone: "导入完成：{count} 条书签。",
    importFailed: "导入失败：{message}",
    deleting: "正在删除全部书签...",
    deleteDone: "已删除根目录下 {count} 个书签或文件夹节点。",
    deleteFailed: "删除失败：{message}",
  },
  en: {
    appTitle: "Bookmark Import Export",
    languageLabel: "Language",
    statusReady: "Scan current bookmarks or choose a file to import. Deleting or clearing before import requires confirmation text.",
    currentBookmarks: "Current bookmarks",
    currentFolders: "Current folders",
    importBookmarks: "Bookmarks to import",
    importFolders: "Folders to import",
    exportTitle: "Export Chrome bookmarks",
    scanBtn: "Scan bookmarks",
    exportMarkdown: "Export Markdown",
    exportJson: "Export JSON",
    exportHtml: "Export HTML",
    includePrompt: "Add AI cleanup prompt to Markdown",
    includeDates: "Include added dates",
    importTitle: "Import bookmark file",
    clearBeforeImport: "Clear existing bookmarks before import",
    importBtn: "Import file",
    deleteTitle: "Delete all bookmarks",
    deleteHelp: "Deletes all child bookmarks and folders under roots such as Bookmarks Bar, Other Bookmarks, and Mobile Bookmarks.",
    confirmLabel: "Confirmation text",
    confirmPlaceholder: "Type DELETE ALL",
    deleteBtn: "Delete all bookmarks only",
    previewTitle: "Preview",
    previewPlaceholder: "Scan or choose an import file to show a preview",
    aiPrompt: "Please regroup the bookmarks below by topic and output three groups: keep, review, and suggested deletion. Prefer deleting broken, duplicate, temporary reading, marketing, and low-value tool pages. Prefer keeping account entry points, long-term references, workflow tools, important docs, and project resources. Give one concise reason for every suggested deletion.",
    jsonMissing: "No bookmarks or items array was found in the JSON file",
    htmlMissing: "No Chrome bookmark structure was found in the HTML file",
    confirmRequired: "Type DELETE ALL first",
    reading: "Reading browser bookmarks...",
    scanDone: "Scan complete. You can export now.",
    importRootMissing: "Could not find a bookmark root to import into",
    readFailed: "Read failed: {message}",
    parsedDone: "Parsed {count} bookmarks to import.",
    parseFailed: "Parse failed: {message}",
    chooseImportFile: "Choose an import file first",
    processing: "Processing bookmarks...",
    importDone: "Import complete: {count} bookmarks.",
    importFailed: "Import failed: {message}",
    deleting: "Deleting all bookmarks...",
    deleteDone: "Deleted {count} bookmark or folder nodes under the root folders.",
    deleteFailed: "Delete failed: {message}",
  },
};

const els = {
  status: document.getElementById("status"),
  languageSelect: document.getElementById("languageSelect"),
  bookmarkCount: document.getElementById("bookmarkCount"),
  folderCount: document.getElementById("folderCount"),
  parsedCount: document.getElementById("parsedCount"),
  parsedFolderCount: document.getElementById("parsedFolderCount"),
  preview: document.getElementById("preview"),
  scanBtn: document.getElementById("scanBtn"),
  mdBtn: document.getElementById("mdBtn"),
  jsonBtn: document.getElementById("jsonBtn"),
  htmlBtn: document.getElementById("htmlBtn"),
  includePrompt: document.getElementById("includePrompt"),
  includeDates: document.getElementById("includeDates"),
  fileInput: document.getElementById("fileInput"),
  clearBeforeImport: document.getElementById("clearBeforeImport"),
  importBtn: document.getElementById("importBtn"),
  confirmText: document.getElementById("confirmText"),
  deleteBtn: document.getElementById("deleteBtn"),
};

let cachedExport = null;
let parsedImport = [];
let currentLang = "zh";
let lastStatusKey = "statusReady";
let lastStatusVars = {};

function t(key, vars = {}) {
  const template = I18N[currentLang][key] || I18N.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

function callApi(fn, ...args) {
  return new Promise((resolve, reject) => {
    try {
      const maybePromise = fn(...args, (result) => {
        const err = api.runtime && api.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(result);
      });
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve, reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function getStoredLanguage() {
  const localValue = localStorage.getItem("language");
  if (localValue) return localValue;
  if (!api.storage || !api.storage.local) return null;
  const result = await callApi(api.storage.local.get, "language");
  return result && result.language;
}

async function setStoredLanguage(language) {
  localStorage.setItem("language", language);
  if (!api.storage || !api.storage.local) return;
  await callApi(api.storage.local.set, { language });
}

function detectLanguage() {
  const navLang = navigator.language || "";
  return navLang.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function applyLanguage() {
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  els.languageSelect.value = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  setStatus(lastStatusKey, lastStatusVars, false);
}

function setStatus(key, vars = {}, remember = true) {
  if (remember) {
    lastStatusKey = key;
    lastStatusVars = vars;
  }
  els.status.textContent = t(key, vars);
}

function dateString(ms) {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeHtml(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(text || "");
  return textarea.value;
}

function escapeMd(text) {
  return String(text || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function normalizeFolder(folder) {
  return String(folder || "Imported")
    .replace(/^Root\s*\/\s*/i, "")
    .replace(/^(Bookmarks Bar|Bookmarks Toolbar|Other Bookmarks|Mobile Bookmarks|书签栏|其他书签|移动书签)\s*\/\s*/i, "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" / ") || "Imported";
}

function normalizeRows(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const title = String(row.title || row.name || row.url || "").trim();
    const url = String(row.url || "").trim();
    if (!title || !/^(https?|ftp|file):\/\//i.test(url)) continue;
    const folder = normalizeFolder(row.folder || row.path || row.category || "Imported");
    const key = `${folder}\n${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ title, url, folder });
  }
  return result;
}

function folderSet(rows) {
  const folders = new Set();
  for (const row of rows) {
    const parts = row.folder.split("/").map((part) => part.trim()).filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current} / ${part}` : part;
      folders.add(current);
    }
  }
  return folders;
}

function walk(nodes, folderPath = [], rows = [], folders = []) {
  for (const node of nodes || []) {
    if (node.url) {
      rows.push({
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        folder: folderPath.join(" / ") || "Root",
        dateAdded: node.dateAdded || null,
      });
      continue;
    }

    const title = node.title || "Root";
    const nextPath = title.toLowerCase() === "root" ? folderPath : [...folderPath, title];
    if (node.children) {
      if (title.toLowerCase() !== "root") folders.push(nextPath.join(" / "));
      walk(node.children, nextPath, rows, folders);
    }
  }
  return { rows, folders };
}

function makeMarkdown(data) {
  const byFolder = new Map();
  for (const item of data.bookmarks) {
    if (!byFolder.has(item.folder)) byFolder.set(item.folder, []);
    byFolder.get(item.folder).push(item);
  }

  const lines = [
    "# Bookmarks Export",
    "",
    `- Exported at: ${new Date().toISOString()}`,
    `- Bookmark count: ${data.bookmarks.length}`,
    `- Folder count: ${data.folders.length}`,
    "",
  ];

  if (els.includePrompt.checked) {
    lines.push("## AI Cleanup Prompt", "");
    lines.push(t("aiPrompt"));
    lines.push("");
  }

  lines.push("## Folder Summary", "");
  for (const [folder, items] of [...byFolder.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${folder}: ${items.length}`);
  }
  lines.push("", "## Bookmarks", "");

  for (const [folder, items] of [...byFolder.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`### ${folder}`, "");
    for (const item of items.sort((a, b) => a.title.localeCompare(b.title))) {
      const datePart = els.includeDates.checked && item.dateAdded ? ` - added ${dateString(item.dateAdded)}` : "";
      lines.push(`- [${escapeMd(item.title)}](${item.url})${datePart}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function folderTreeFromRows(rows) {
  const root = { folders: new Map(), bookmarks: [] };
  for (const item of rows) {
    let node = root;
    const parts = item.folder.split("/").map((part) => part.trim()).filter(Boolean);
    for (const part of parts) {
      if (!node.folders.has(part)) node.folders.set(part, { folders: new Map(), bookmarks: [] });
      node = node.folders.get(part);
    }
    node.bookmarks.push(item);
  }
  return root;
}

function renderBookmarkHtmlNode(node, depth = 1) {
  const indent = "  ".repeat(depth);
  const lines = [];
  for (const [title, child] of [...node.folders.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`${indent}<DT><H3>${escapeHtml(title)}</H3>`);
    lines.push(`${indent}<DL><p>`);
    lines.push(renderBookmarkHtmlNode(child, depth + 1));
    lines.push(`${indent}</DL><p>`);
  }
  for (const item of node.bookmarks.sort((a, b) => a.title.localeCompare(b.title))) {
    const added = item.dateAdded ? ` ADD_DATE="${Math.floor(item.dateAdded / 1000)}"` : "";
    lines.push(`${indent}<DT><A HREF="${escapeHtml(item.url)}"${added}>${escapeHtml(item.title)}</A>`);
  }
  return lines.filter(Boolean).join("\n");
}

function makeHtml(data) {
  const root = folderTreeFromRows(data.bookmarks);
  return [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
    renderBookmarkHtmlNode(root),
    "</DL><p>",
  ].join("\n");
}

function parseJson(text) {
  const data = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (Array.isArray(data)) return normalizeRows(data);
  if (Array.isArray(data.bookmarks)) return normalizeRows(data.bookmarks);
  if (Array.isArray(data.items)) return normalizeRows(data.items);
  throw new Error(t("jsonMissing"));
}

function parseMarkdown(text) {
  const rows = [];
  let folder = "Imported";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("### ")) {
      folder = line.slice(4).trim();
      continue;
    }
    const match = line.match(/^- \[(.+?)\]\((.+?)\)(?:\s+-\s+added\s+\d{4}-\d{2}-\d{2})?$/);
    if (match) rows.push({ title: match[1], url: match[2], folder });
  }
  return normalizeRows(rows);
}

function parseHtml(text) {
  const rows = [];
  const path = [];
  let pendingFolder = "";
  let seenList = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/<DL\b/i.test(line)) {
      seenList = true;
      if (pendingFolder) {
        path.push(decodeHtml(pendingFolder).trim());
        pendingFolder = "";
      }
      continue;
    }

    if (/<\/DL>/i.test(line)) {
      if (path.length) path.pop();
      continue;
    }

    const heading = line.match(/<H3\b[^>]*>([\s\S]*?)<\/H3>/i);
    if (heading) {
      pendingFolder = heading[1].replace(/<[^>]+>/g, "");
      continue;
    }

    const link = line.match(/<A\b[^>]*\bHREF=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/A>/i);
    if (link) {
      rows.push({
        title: decodeHtml(link[3].replace(/<[^>]+>/g, "")).trim() || decodeHtml(link[2]),
        url: decodeHtml(link[2]),
        folder: path.join(" / ") || "Imported",
      });
    }
  }

  if (!seenList) throw new Error(t("htmlMissing"));
  return normalizeRows(rows);
}

function parseImportFile(name, text) {
  if (/\.json$/i.test(name)) return parseJson(text);
  if (/\.(html|htm)$/i.test(name)) return parseHtml(text);
  return parseMarkdown(text);
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  callApi(api.downloads.download, {
    url,
    filename,
    saveAs: true,
    conflictAction: "uniquify",
  }).finally(() => setTimeout(() => URL.revokeObjectURL(url), 30000));
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function requireDeleteConfirmation() {
  if (els.confirmText.value.trim() !== "DELETE ALL") {
    throw new Error(t("confirmRequired"));
  }
}

async function scan() {
  setStatus("reading");
  const tree = await callApi(api.bookmarks.getTree);
  const parsed = walk(tree);
  cachedExport = {
    exportedAt: new Date().toISOString(),
    bookmarks: parsed.rows,
    folders: [...new Set(parsed.folders)].filter(Boolean),
  };

  els.bookmarkCount.textContent = cachedExport.bookmarks.length;
  els.folderCount.textContent = cachedExport.folders.length;
  els.preview.value = cachedExport.bookmarks
    .slice(0, 12)
    .map((item) => `${item.folder} | ${item.title}\n${item.url}`)
    .join("\n\n");
  setStatus("scanDone");
  els.mdBtn.disabled = false;
  els.jsonBtn.disabled = false;
  els.htmlBtn.disabled = false;
}

async function refreshStats(messageKey, vars) {
  await scan();
  if (messageKey) setStatus(messageKey, vars);
}

async function deleteAllBookmarks() {
  const tree = await callApi(api.bookmarks.getTree);
  const roots = tree[0] && tree[0].children ? tree[0].children : [];
  let removed = 0;
  for (const root of roots) {
    for (const child of root.children || []) {
      await callApi(api.bookmarks.removeTree, child.id);
      removed += 1;
    }
  }
  return removed;
}

async function getOrCreateFolder(parentId, title) {
  const children = await callApi(api.bookmarks.getChildren, parentId);
  const existing = children.find((child) => !child.url && child.title === title);
  if (existing) return existing.id;
  const created = await callApi(api.bookmarks.create, { parentId, title });
  return created.id;
}

async function importBookmarks(rows) {
  const tree = await callApi(api.bookmarks.getTree);
  const roots = tree[0] && tree[0].children ? tree[0].children : [];
  const barRoot = roots.find((node) => /toolbar|bar|书签栏/i.test(node.title)) || roots[0];
  if (!barRoot) throw new Error(t("importRootMissing"));

  const folderCache = new Map([["", barRoot.id]]);
  let count = 0;
  for (const row of rows) {
    const parts = row.folder.split("/").map((part) => part.trim()).filter(Boolean);
    let currentPath = "";
    let parentId = barRoot.id;
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath} / ${part}` : part;
      if (!folderCache.has(currentPath)) {
        const id = await getOrCreateFolder(parentId, part);
        folderCache.set(currentPath, id);
      }
      parentId = folderCache.get(currentPath);
    }
    await callApi(api.bookmarks.create, { parentId, title: row.title, url: row.url });
    count += 1;
  }
  return count;
}

function updateParsedPreview(rows) {
  const folders = folderSet(rows);
  els.parsedCount.textContent = rows.length;
  els.parsedFolderCount.textContent = folders.size;
  els.preview.value = rows
    .slice(0, 14)
    .map((item) => `${item.folder} | ${item.title}\n${item.url}`)
    .join("\n\n");
  els.importBtn.disabled = rows.length === 0;
}

els.languageSelect.addEventListener("change", async () => {
  currentLang = els.languageSelect.value;
  applyLanguage();
  await setStoredLanguage(currentLang);
});

els.scanBtn.addEventListener("click", () => {
  scan().catch((error) => setStatus("readFailed", { message: error.message }));
});

els.mdBtn.addEventListener("click", () => {
  if (!cachedExport) return;
  downloadText(`bookmarks-${timestamp()}.md`, makeMarkdown(cachedExport), "text/markdown;charset=utf-8");
});

els.jsonBtn.addEventListener("click", () => {
  if (!cachedExport) return;
  downloadText(`bookmarks-${timestamp()}.json`, JSON.stringify(cachedExport, null, 2), "application/json;charset=utf-8");
});

els.htmlBtn.addEventListener("click", () => {
  if (!cachedExport) return;
  downloadText(`bookmarks-${timestamp()}.html`, makeHtml(cachedExport), "text/html;charset=utf-8");
});

els.fileInput.addEventListener("change", async () => {
  try {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (!file) return;
    const text = await file.text();
    parsedImport = parseImportFile(file.name, text);
    updateParsedPreview(parsedImport);
    setStatus("parsedDone", { count: parsedImport.length });
  } catch (error) {
    parsedImport = [];
    updateParsedPreview(parsedImport);
    setStatus("parseFailed", { message: error.message });
  }
});

els.importBtn.addEventListener("click", async () => {
  try {
    if (!parsedImport.length) throw new Error(t("chooseImportFile"));
    if (els.clearBeforeImport.checked) requireDeleteConfirmation();
    setStatus("processing");
    if (els.clearBeforeImport.checked) await deleteAllBookmarks();
    const count = await importBookmarks(parsedImport);
    await refreshStats("importDone", { count });
  } catch (error) {
    setStatus("importFailed", { message: error.message });
  }
});

els.deleteBtn.addEventListener("click", async () => {
  try {
    requireDeleteConfirmation();
    setStatus("deleting");
    const removed = await deleteAllBookmarks();
    await refreshStats("deleteDone", { count: removed });
  } catch (error) {
    setStatus("deleteFailed", { message: error.message });
  }
});

(async function init() {
  currentLang = (await getStoredLanguage()) || detectLanguage();
  if (!I18N[currentLang]) currentLang = "en";
  applyLanguage();
})();
