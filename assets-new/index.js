/**
 * @typedef {object} PathItem
 * @property {"Dir"|"SymlinkDir"|"File"|"SymlinkFile"} path_type
 * @property {string} name
 * @property {number} mtime
 * @property {number} size
 * @property {boolean} allow_upload
 * @property {boolean} allow_delete
 * @property {boolean} readonly_descendant
 */

/**
 * @typedef {object} DATA
 * @property {string} href
 * @property {string} uri_prefix
 * @property {"Index" | "Edit" | "View"} kind
 * @property {PathItem[]} paths
 * @property {boolean} allow_upload
 * @property {boolean} allow_delete
 * @property {boolean} allow_search
 * @property {boolean} allow_archive
 * @property {boolean} auth
 * @property {string} user
 * @property {boolean} dir_exists
 * @property {string} editable
 */

var DUFS_MAX_UPLOADINGS = 1;

/**
 * @type {DATA} DATA
 */
var DATA;

/**
 * @type {string}
 */
var DIR_EMPTY_NOTE;

/**
 * @type {PARAMS}
 * @typedef {object} PARAMS
 * @property {string} q
 */
const PARAMS = Object.fromEntries(new URLSearchParams(window.location.search).entries());

const IFRAME_FORMATS = [
  ".pdf",
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg",
  ".mp4", ".mov", ".avi", ".wmv", ".flv", ".webm",
  ".mp3", ".ogg", ".wav", ".m4a",
];

const MAX_SUBPATHS_COUNT = 1000;

const ICONS = {
  dir: `<svg height="16" viewBox="0 0 14 16" width="14"><path fill-rule="evenodd" d="M13 4H7V3c0-.66-.31-1-1-1H1c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zM6 4H1V3h5v1z"></path></svg>`,
  symlinkFile: `<svg height="16" viewBox="0 0 12 16" width="12"><path fill-rule="evenodd" d="M8.5 1H1c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V4.5L8.5 1zM11 14H1V2h7l3 3v9zM6 4.5l4 3-4 3v-2c-.98-.02-1.84.22-2.55.7-.71.48-1.19 1.25-1.45 2.3.02-1.64.39-2.88 1.13-3.73.73-.84 1.69-1.27 2.88-1.27v-2H6z"></path></svg>`,
  symlinkDir: `<svg height="16" viewBox="0 0 14 16" width="14"><path fill-rule="evenodd" d="M13 4H7V3c0-.66-.31-1-1-1H1c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zM1 3h5v1H1V3zm6 9v-2c-.98-.02-1.84.22-2.55.7-.71.48-1.19 1.25-1.45 2.3.02-1.64.39-2.88 1.13-3.73C4.86 8.43 5.82 8 7.01 8V6l4 3-4 3H7z"></path></svg>`,
  file: `<svg height="16" viewBox="0 0 12 16" width="12"><path fill-rule="evenodd" d="M6 5H2V4h4v1zM2 8h7V7H2v1zm0 2h7V9H2v1zm0 2h7v-1H2v1zm10-7.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v12h10V5z"></path></svg>`,
  download: `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>`,
  move: `<svg width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.5 1.5A.5.5 0 0 0 1 2v4.8a2.5 2.5 0 0 0 2.5 2.5h9.793l-3.347 3.346a.5.5 0 0 0 .708.708l4.2-4.2a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 8.3H3.5A1.5 1.5 0 0 1 2 6.8V2a.5.5 0 0 0-.5-.5z"/></svg>`,
  edit: `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>`,
  delete: `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M6.854 7.146a.5.5 0 1 0-.708.708L7.293 9l-1.147 1.146a.5.5 0 0 0 .708.708L8 9.707l1.146 1.147a.5.5 0 0 0 .708-.708L8.707 9l1.147-1.146a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146z"/><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>`,
  view: `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1"/></svg>`,
}

/**
 * @type Map<string, Uploader>
 */
const failUploaders = new Map();

function updateQueueCount() {
  const count = $uploadersTable?.querySelectorAll(".uploader").length || 0;
  const $count = document.querySelector(".queue-count");
  if ($count) $count.textContent = `${count} ${count === 1 ? "transfer" : "transfers"}`;
}

/**
 * @type Element
 */
let $pathsTable;
/**
 * @type Element
 */
let $pathsTableHead;
/**
 * @type Element
 */
let $pathsTableBody;
/**
 * @type Element
 */
let $uploadersTable;
let $uploadQueue;
let $folderSummary;
let $folderTitle;
let $dialog;
/**
 * @type Element
 */
let $emptyFolder;
/**
 * @type Element
 */
let $editor;
/**
 * @type Element
 */
let $loginBtn;
/**
 * @type Element
 */
let $logoutBtn;
/**
 * @type Element
 */
let $userName;

// manage unload event to prevent leaving with uploads in progress
const beforeUnloadHandler = (event) => {
  const uploadPending = Uploader.queues.length > 0 || Uploader.runnings > 0;
  const editorDirty = DATA?.kind === "Edit" && $editor?.dataset.savedValue !== undefined && $editor.value !== $editor.dataset.savedValue;
  if (uploadPending || editorDirty) {
    event.preventDefault();
    event.returnValue = '';
    return ''; // for some browsers
  }
};

async function initialize() {
  const $indexData = document.getElementById('index-data');
  if (!$indexData) {
    alert("No data");
    return;
  }

  DATA = JSON.parse(decodeBase64($indexData.innerHTML));
  DIR_EMPTY_NOTE = PARAMS.q ? 'No results' : DATA.dir_exists ? 'Empty folder' : 'Folder will be created when a file is uploaded';

  await ready();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, {
    once: true,
  });
} else {
  queueMicrotask(initialize);
}

async function ready() {
  $pathsTable = document.querySelector(".paths-table");
  $pathsTableHead = document.querySelector(".paths-table thead");
  $pathsTableBody = document.querySelector(".paths-table tbody");
  $uploadersTable = document.querySelector(".uploaders-table tbody");
  $uploadQueue = document.querySelector(".upload-queue");
  $folderSummary = document.querySelector(".folder-summary");
  $folderTitle = document.querySelector(".folder-title");
  $dialog = document.querySelector(".action-dialog");
  document.querySelector(".brand").href = DATA.uri_prefix || "/";
  $emptyFolder = document.querySelector(".empty-folder");
  $editor = document.querySelector(".editor");
  $loginBtn = document.querySelector(".login-btn");
  $logoutBtn = document.querySelector(".logout-btn");
  $userName = document.querySelector(".user-name");

  window.addEventListener('beforeunload', beforeUnloadHandler);

  addBreadcrumb(DATA.href, DATA.uri_prefix);

  if (DATA.kind === "Index") {
    document.title = `Index of ${DATA.href} - Dufs`;
    document.querySelector(".index-page").classList.remove("hidden");
    $folderTitle.textContent = DATA.href === "/" ? "Files" : baseName(DATA.href);

    await setupIndexPage();
  } else if (DATA.kind === "Edit") {
    document.title = `Edit ${DATA.href} - Dufs`;
    document.querySelector(".editor-page").classList.remove("hidden");

    await setupEditorPage();
  } else if (DATA.kind === "View") {
    document.title = `View ${DATA.href} - Dufs`;
    document.querySelector(".editor-page").classList.remove("hidden");

    await setupEditorPage();
  }
}

class Uploader {
  /**
   *
   * @param {File} file
   * @param {string[]} pathParts
   */
  constructor(file, pathParts) {
    /**
     * @type Element
     */
    this.$status = null;
    /**
     * @type Element
     */
    this.$size = null;
    /**
     * @type Element
     */
    this.$percent = null;
    /**
     * @type Element
     */
    this.$speed = null;
    /**
     * @type Element
     */
    this.$eta = null;
    this.$progress = null;
    // speed ring buffer, mirrors curl's progress meter (6 records, one per
    // second, giving a 5-second window) so the displayed speed stays stable
    this.startTime = 0;
    this.speedRecords = 0;
    this.speedAmounts = [];
    this.speedTimes = [];
    this.currentSpeed = 0;
    this.uploadOffset = 0;
    this.lastUptime = 0;
    this.name = [...pathParts, file.name].join("/");
    this.idx = Uploader.globalIdx++;
    this.file = file;
    this.url = newUrl(this.name);
  }

  upload() {
    const { idx, name, url } = this;
    const encodedName = encodedStr(name);
    $uploadersTable.insertAdjacentHTML("beforeend", `
  <tr id="upload${idx}" class="uploader">
    <td class="path cell-icon">
      ${getPathSvg()}
    </td>
    <td class="path cell-name">
      <a href="${url}">${encodedName}</a>
    </td>
    <td class="cell-status" id="uploadStatus${idx}"></td>
    <td class="cell-size" id="uploadSize${idx}"></td>
    <td class="cell-percent"><div class="progress-cell"><span id="uploadPercent${idx}"></span><span class="progress-track"><span class="progress-value" id="uploadProgress${idx}"></span></span></div></td>
    <td class="cell-speed" id="uploadSpeed${idx}"></td>
    <td class="cell-eta" id="uploadEta${idx}"></td>
  </tr>`);
    $uploadQueue.classList.remove("hidden");
    $emptyFolder.classList.add("hidden");
    this.$status = document.getElementById(`uploadStatus${idx}`);
    this.$percent = document.getElementById(`uploadPercent${idx}`);
    this.$size = document.getElementById(`uploadSize${idx}`);
    this.$speed = document.getElementById(`uploadSpeed${idx}`);
    this.$eta = document.getElementById(`uploadEta${idx}`);
    this.$progress = document.getElementById(`uploadProgress${idx}`);
    this.$status.textContent = "-";
    this.$percent.textContent = formatPercent(0);
    this.$size.textContent = formatUploadSize(0, this.file.size);
    this.$status.addEventListener("click", e => {
      const nodeId = e.target.id;
      const matches = /^retry(\d+)$/.exec(nodeId);
      if (matches) {
        const id = parseInt(matches[1]);
        let uploader = failUploaders.get(id);
        if (uploader) uploader.retry();
      }
    });
    Uploader.queues.push(this);
    updateQueueCount();
    Uploader.runQueue();
  }

  ajax() {
    const { url } = this;

    this.startTime = Date.now();
    this.lastUptime = this.startTime;
    this.speedRecords = 1;
    this.speedAmounts = [0];
    this.speedTimes = [0];
    this.currentSpeed = 0;
    this.$status.textContent = "↑";
    this.$status.title = "Uploading";
    document.getElementById(`upload${this.idx}`)?.classList.remove("is-failed");

    const ajax = new XMLHttpRequest();
    ajax.upload.addEventListener("progress", e => this.progress(e), false);
    ajax.addEventListener("readystatechange", () => {
      if (ajax.readyState === 4) {
        if (ajax.status >= 200 && ajax.status < 300) {
          this.complete();
        } else {
          if (ajax.status != 0) {
            const code = ajax.getResponseHeader("x-dufs-error-code");
            if (code === "upload-disabled") {
              this.fail("upload is disabled");
            } else if (code === "delete-disabled") {
              this.fail("overwriting is disabled");
            } else if (code === "readonly-descendant") {
              this.fail("directory contains read-only entries");
            } else {
              this.fail(`${ajax.status} ${ajax.statusText}`);
            }
          }
        }
      }
    })
    ajax.addEventListener("error", () => this.fail(), false);
    ajax.addEventListener("abort", () => this.fail(), false);
    if (this.uploadOffset > 0) {
      ajax.open("PATCH", url);
      ajax.setRequestHeader("X-Update-Range", "append");
      ajax.send(this.file.slice(this.uploadOffset));
    } else {
      ajax.open("PUT", url);
      ajax.send(this.file);
      // setTimeout(() => ajax.abort(), 3000);
    }
  }

  async retry() {
    const { url } = this;
    const $retry = this.$status.querySelector(".retry-btn");
    if ($retry?.disabled) return;
    if ($retry) $retry.disabled = true;
    try {
      const res = await fetch(url, { method: "HEAD" });
      let uploadOffset = 0;
      if (res.status === 200) {
        uploadOffset = parseInt(res.headers.get("content-length"), 10) || 0;
      }
      this.uploadOffset = Math.min(uploadOffset, this.file.size);
      failUploaders.delete(this.idx);
      this.$status.textContent = "Queued";
      this.$status.title = "Waiting to retry";
      Uploader.queues.push(this);
      updateQueueCount();
      Uploader.runQueue();
    } catch (err) {
      if ($retry) $retry.disabled = false;
      this.$status.title = err.message || "Could not check upload progress";
      showToast(`Could not retry “${this.file.name}”: ${err.message}`, "error");
    }
  }

  progress(event) {
    const now = Date.now();
    this.calcSpeed(now - this.startTime, event.loaded);
    if (now - this.lastUptime < 300) return; // throttle update for safari
    this.lastUptime = now;
    const uploadedSize = event.loaded + this.uploadOffset;
    const [speedValue, speedUnit] = formatFileSize(this.currentSpeed);
    this.$status.textContent = "↑";
    const percent = this.file.size > 0 ? uploadedSize / this.file.size * 100 : 100;
    this.$percent.textContent = formatPercent(percent);
    this.$progress.style.width = `${Math.min(100, percent)}%`;
    this.$size.textContent = formatUploadSize(uploadedSize, this.file.size);
    this.$speed.textContent = `${speedValue} ${speedUnit}/s`;
    this.$eta.textContent = formatDuration(this.currentSpeed > 0 ? (event.total - event.loaded) / this.currentSpeed : Infinity);
  }

  /**
   * Update the smoothed speed using curl's progress meter algorithm: keep a
   * 6-record ring buffer (one record per second, a 5-second window), add a
   * record at most once per second, and average over the buffered window.
   * @param {number} elapsed milliseconds since the transfer started
   * @param {number} amount bytes transferred so far
   */
  calcSpeed(elapsed, amount) {
    const records = 6;
    const iNext = this.speedRecords % records;
    let iLatest = iNext > 0 ? iNext - 1 : records - 1;
    if (elapsed - this.speedTimes[iLatest] < 1000) return;
    this.speedRecords++;
    iLatest = iNext;
    this.speedAmounts[iLatest] = amount;
    this.speedTimes[iLatest] = elapsed;
    const iOldest = this.speedRecords < records ? 0 : (iLatest + 1) % records;
    const duration = this.speedTimes[iLatest] - this.speedTimes[iOldest];
    const delta = this.speedAmounts[iLatest] - this.speedAmounts[iOldest];
    this.currentSpeed = duration > 0 ? delta / duration * 1000 : 0;
  }

  complete() {
    this.$status.textContent = "✓";
    this.$status.title = "Upload complete";
    this.$percent.textContent = formatPercent(100);
    this.$progress.style.width = "100%";
    this.$size.textContent = formatUploadSize(this.file.size, this.file.size);
    this.$speed.textContent = "";
    this.$eta.textContent = "";
    failUploaders.delete(this.idx);
    document.getElementById(`upload${this.idx}`)?.classList.add("is-complete");
    Uploader.runnings--;
    updateQueueCount();
    Uploader.runQueue();
  }

  fail(reason = "") {
    const $failure = document.createElement("span");
    $failure.textContent = "×";
    $failure.title = reason || "Upload failed";
    const $retry = document.createElement("button");
    $retry.type = "button";
    $retry.className = "retry-btn";
    $retry.id = `retry${this.idx}`;
    $retry.title = "Retry upload";
    $retry.setAttribute("aria-label", "Retry upload");
    $retry.textContent = "Retry";
    this.$status.replaceChildren($failure, $retry);
    this.$status.title = reason || "Upload failed";
    document.getElementById(`upload${this.idx}`)?.classList.add("is-failed");
    this.$speed.textContent = "";
    this.$eta.textContent = "";
    failUploaders.set(this.idx, this);
    Uploader.runnings--;
    updateQueueCount();
    Uploader.runQueue();
  }
}

Uploader.globalIdx = 0;

Uploader.runnings = 0;

Uploader.auth = false;

/**
 * @type Uploader[]
 */
Uploader.queues = [];


Uploader.runQueue = async () => {
  if (Uploader.runnings >= DUFS_MAX_UPLOADINGS) return;
  if (Uploader.queues.length == 0) return;
  Uploader.runnings++;
  let uploader = Uploader.queues.shift();
  if (!Uploader.auth) {
    Uploader.auth = true;
    try {
      await checkAuth();
    } catch {
      Uploader.auth = false;
    }
  }
  uploader.ajax();
}

/**
 * Add breadcrumb
 * @param {string} href
 * @param {string} uri_prefix
 */
function addBreadcrumb(href, uri_prefix) {
  const $breadcrumb = document.querySelector(".breadcrumb");
  let parts = [];
  if (href === "/") {
    parts = [""];
  } else {
    parts = href.split("/");
  }
  const len = parts.length;
  let path = uri_prefix;
  for (let i = 0; i < len; i++) {
    const name = parts[i];
    if (i > 0) {
      if (!path.endsWith("/")) {
        path += "/";
      }
      path += encodeURIComponent(name);
    }
    const encodedName = encodedStr(name);
    if (i === 0) {
      $breadcrumb.insertAdjacentHTML("beforeend", `<a href="${path}" title="Root"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5z"/></svg></a>`);
    } else if (i === len - 1) {
      $breadcrumb.insertAdjacentHTML("beforeend", `<b>${encodedName}</b>`);
    } else {
      $breadcrumb.insertAdjacentHTML("beforeend", `<a href="${path}">${encodedName}</a>`);
    }
    if (i !== len - 1) {
      $breadcrumb.insertAdjacentHTML("beforeend", `<span class="separator">/</span>`);
    }
  }
}

async function setupIndexPage() {
  if (DATA.allow_archive) {
    const $download = document.querySelector(".download");
    $download.href = baseUrl() + "?zip";
    $download.title = "Download folder as a .zip file";
    $download.classList.add("dlwt");
    $download.classList.remove("hidden");
  }

  if (DATA.allow_upload) {
    setupDropzone();
    setupUploadFile();
    setupNewFolder();
    setupNewFile();
  }

  if (DATA.auth) {
    await setupAuth();
  }

  if (DATA.allow_search) {
    setupSearch();
  }

  setupPathActionDelegation();

  renderPathsTableHead();
  renderPathsTableBody();

  if (DATA.user) {
    setupDownloadWithToken();
  }
}

function updateFolderSummary() {
  const paths = (DATA.paths || []).filter(Boolean);
  const folders = paths.filter(path => path.path_type.endsWith("Dir")).length;
  const files = paths.length - folders;
  const itemWord = paths.length === 1 ? "item" : "items";
  const folderWord = folders === 1 ? "folder" : "folders";
  const fileWord = files === 1 ? "file" : "files";
  $folderSummary.textContent = `${paths.length} ${itemWord} · ${folders} ${folderWord} · ${files} ${fileWord}`;
}

function setupPathActionDelegation() {
  const handleAction = event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.dataset.action === "move") movePath(index);
    if (button.dataset.action === "delete") deletePath(index);
  };
  $pathsTableBody.addEventListener("click", handleAction);
}

/**
 * Render path table thead
 */
function renderPathsTableHead() {
  $pathsTableHead.insertAdjacentHTML("beforeend", `
    <tr>
      <th class="cell-name" colspan="2">Name</th>
      <th class="cell-mtime">Last Modified</th>
      <th class="cell-size">Size</th>
      <th class="cell-actions">Actions</th>
    </tr>
  `);
}

/**
 * Render path table tbody
 */
function renderPathsTableBody() {
  $pathsTableBody.innerHTML = "";
  const paths = (DATA.paths || []).map((file, index) => ({ file, index })).filter(item => item.file);
  updateFolderSummary();
  if (paths.length > 0) {
    $emptyFolder.classList.add("hidden");
    $pathsTable.classList.remove("hidden");
    // Show an action column when it is available for the current directory or
    // at least one entry. Rows without permission render the action disabled.
    const showMove =
      (DATA.allow_upload && DATA.allow_delete) ||
      paths.some(({ file }) => file.allow_upload && file.allow_delete);
    const showDelete =
      DATA.allow_delete || paths.some(({ file }) => file.allow_delete);
    for (const { file, index } of paths) {
      addPath(file, index, showMove, showDelete);
    }
  } else {
    $pathsTable.classList.add("hidden");
    $emptyFolder.textContent = DIR_EMPTY_NOTE;
    $emptyFolder.classList.remove("hidden");
  }
}

/**
 * Render an action button that the current account cannot use.
 * @param {string} icon
 * @param {string} title
 */
function disabledAction(icon, title) {
  return `<span class="action-btn disabled" title="${title}" aria-disabled="true">${icon}</span>`;
}

/**
 * Explain why an entry cannot be modified by the current account.
 * @param {PathItem} file
 * @param {"move" | "delete" | "edit"} action
 */
function deniedReason(file, action) {
  if (file.readonly_descendant) {
    return "the directory contains read-only entries";
  }
  if (action === "edit") {
    return "the file is read-only";
  }
  return "the entry is read-only";
}

/**
 * Add pathitem
 * @param {PathItem} file
 * @param {number} index
 * @param {boolean} showMove
 * @param {boolean} showDelete
 */
function addPath(file, index, showMove, showDelete) {
  const encodedName = encodedStr(file.name);
  let url = newUrl(file.name);
  let actionDelete = "";
  let actionDownload = "";
  let actionMove = "";
  let actionEdit = "";
  let actionView = "";
  let isDir = file.path_type.endsWith("Dir");
  if (isDir) {
    url += "/";
    if (DATA.allow_archive) {
      actionDownload = `
      <div class="action-btn">
        <a class="dlwt" href="${url}?zip" title="Download folder as a .zip file" aria-label="Download folder as a zip file" download>${ICONS.download}</a>
      </div>`;
    }
  } else {
    actionDownload = `
    <div class="action-btn" >
      <a class="dlwt" href="${url}" title="Download file" aria-label="Download file" download>${ICONS.download}</a>
    </div>`;
  }
  const canMove = file.allow_upload && file.allow_delete;
  const canEdit = !isDir && canMove;
  if (showMove) {
    if (canMove) {
      actionMove = `<button type="button" class="action-btn" data-action="move" data-index="${index}" title="Move or rename" aria-label="Move or rename">${ICONS.move}</button>`;
    } else {
      actionMove = disabledAction(ICONS.move, `Cannot move: ${deniedReason(file, "move")}`);
    }
    if (!isDir) {
      if (canEdit) {
        actionEdit = `<a class="action-btn" title="Edit file" aria-label="Edit file" target="_blank" href="${url}?edit">${ICONS.edit}</a>`;
      } else {
        actionEdit = disabledAction(ICONS.edit, `Cannot edit: ${deniedReason(file, "edit")}`);
      }
    }
  }
  if (showDelete) {
    if (file.allow_delete) {
      actionDelete = `<button type="button" class="action-btn danger-action" data-action="delete" data-index="${index}" title="Delete" aria-label="Delete">${ICONS.delete}</button>`;
    } else {
      actionDelete = disabledAction(ICONS.delete, `Cannot delete: ${deniedReason(file, "delete")}`);
    }
  }
  if (!canEdit && !isDir) {
    actionView = `<a class="action-btn" title="View file" aria-label="View file" target="_blank" href="${url}?view">${ICONS.view}</a>`;
  }
  const actions = `${actionDownload}${actionView}${actionMove}${actionDelete}${actionEdit}`;

  const sizeDisplay = isDir ? formatDirSize(file.size).trim() : formatFileSize(file.size).join(" ");

  $pathsTableBody.insertAdjacentHTML("beforeend", `
<tr id="addPath${index}">
  <td class="path cell-icon">
    ${getPathSvg(file.path_type)}
  </td>
  <td class="path cell-name">
    <a href="${url}" ${isDir ? "" : `target="_blank"`}>${encodedName}</a>
  </td>
  <td class="cell-mtime">${formatMtime(file.mtime)}</td>
  <td class="cell-size">${sizeDisplay}</td>
  <td class="cell-actions"><div class="action-list">${actions}</div></td>
</tr>`);

}

function setupDropzone() {
  const $overlay = document.querySelector(".drop-overlay");
  let dragDepth = 0;
  const hideOverlay = () => {
    dragDepth = 0;
    $overlay.classList.add("hidden");
    $overlay.setAttribute("aria-hidden", "true");
  };
  ["drag", "dragstart", "dragend", "dragover", "dragenter", "dragleave", "drop"].forEach(name => {
    document.addEventListener(name, e => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
  document.addEventListener("dragenter", () => {
    dragDepth++;
    $overlay.classList.remove("hidden");
    $overlay.setAttribute("aria-hidden", "false");
  });
  document.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) hideOverlay();
  });
  document.addEventListener("drop", async e => {
    hideOverlay();
    if (!e.dataTransfer.items?.[0]?.webkitGetAsEntry) {
      const files = Array.from(e.dataTransfer.files).filter(v => v.size > 0);
      for (const file of files) {
        new Uploader(file, []).upload();
      }
    } else {
      const entries = [];
      const len = e.dataTransfer.items.length;
      for (let i = 0; i < len; i++) {
        entries.push(e.dataTransfer.items[i].webkitGetAsEntry());
      }
      addFileEntries(entries, []);
    }
  });
}

async function setupAuth() {
  if (DATA.user) {
    $logoutBtn.classList.remove("hidden");
    $logoutBtn.addEventListener("click", logout);
    $userName.textContent = DATA.user;
    document.querySelector(".user-avatar").textContent = DATA.user.slice(0, 1).toUpperCase();
  } else {
    $loginBtn.classList.remove("hidden");
    $loginBtn.addEventListener("click", async () => {
      try {
        await checkAuth("login");
      } catch { }
      location.reload();
    });
  }
}

function setupDownloadWithToken() {
  document.querySelectorAll("a.dlwt").forEach(link => {
    if (link.dataset.tokenBound === "true") return;
    link.dataset.tokenBound = "true";
    link.addEventListener("click", async e => {
      e.preventDefault();
      try {
        const link = e.currentTarget || e.target;
        const originalHref = link.getAttribute("href");
        const tokengenUrl = new URL(originalHref);
        tokengenUrl.searchParams.set("tokengen", "");
        const res = await fetch(tokengenUrl);
        if (!res.ok) throw new Error("Failed to fetch token");
        const token = await res.text();
        const downloadUrl = new URL(originalHref);
        downloadUrl.searchParams.set("token", token);
        const tempA = document.createElement("a");
        tempA.href = downloadUrl.toString();
        tempA.download = "";
        document.body.appendChild(tempA);
        tempA.click();
        document.body.removeChild(tempA);
      } catch (err) {
        showToast(`Download failed: ${err.message}`, "error");
      }
    });
  });
}

function setupSearch() {
  const $searchbar = document.querySelector(".searchbar");
  const $search = document.getElementById("search");
  const $clear = document.querySelector(".search-clear");
  $searchbar.classList.remove("hidden");
  $searchbar.addEventListener("submit", event => {
    event.preventDefault();
    const formData = new FormData($searchbar);
    const q = formData.get("q");
    const params = new URLSearchParams(location.search);
    params.delete("q");
    if (q) params.set("q", q);
    const query = params.toString();
    location.href = `${baseUrl()}${query ? `?${query}` : ""}`;
  });
  if (PARAMS.q) {
    $search.value = PARAMS.q;
  }
  const updateClear = () => $clear.classList.toggle("hidden", !$search.value);
  $search.addEventListener("input", updateClear);
  $clear.addEventListener("click", () => {
    if (PARAMS.q) {
      const params = new URLSearchParams(location.search);
      params.delete("q");
      const query = params.toString();
      location.href = `${baseUrl()}${query ? `?${query}` : ""}`;
      return;
    }
    $search.value = "";
    updateClear();
    $search.focus();
  });
  updateClear();
}

function setupUploadFile() {
  document.querySelector(".upload-file").classList.remove("hidden");
  document.getElementById("file").addEventListener("change", async e => {
    const files = e.target.files;
    for (let file of files) {
      new Uploader(file, []).upload();
    }
    e.target.value = "";
  });
}

function setupNewFolder() {
  const $newFolder = document.querySelector(".new-folder");
  $newFolder.classList.remove("hidden");
  $newFolder.addEventListener("click", async () => {
    const name = await askForText("Create a folder", "Folder name");
    if (name) createFolder(name);
  });
}

function setupNewFile() {
  const $newFile = document.querySelector(".new-file");
  $newFile.classList.remove("hidden");
  $newFile.addEventListener("click", async () => {
    const name = await askForText("Create a file", "File name");
    if (name) createFile(name);
  });
}

function openActionDialog({ title, message = "", label = "", value = "", confirmLabel = "Continue", danger = false }) {
  const $field = $dialog.querySelector(".dialog-field");
  const $message = $dialog.querySelector(".dialog-message");
  const $input = $dialog.querySelector(".dialog-input");
  const $submit = $dialog.querySelector(".dialog-submit");
  const $cancel = $dialog.querySelector(".dialog-cancel");
  $dialog.querySelector("#dialog-title").textContent = title;
  $message.textContent = message;
  $message.classList.toggle("hidden", !message);
  $field.classList.toggle("hidden", !label);
  if (label) {
    $field.querySelector(".dialog-label").textContent = label;
    $input.value = value;
    $input.placeholder = label;
    // Dialog buttons use explicit close handling below. Native form validation
    // would block the Cancel button when this required field is empty.
    $input.required = false;
  } else {
    $input.required = false;
  }
  $submit.textContent = confirmLabel;
  $submit.classList.toggle("danger", danger);
  $cancel.classList.remove("hidden");

  return new Promise(resolve => {
    const onClose = () => {
      $dialog.removeEventListener("click", onBackdropClick);
      $cancel.onclick = null;
      $submit.onclick = null;
      resolve({ confirmed: $dialog.returnValue === "confirm", value: $input.value.trim() });
    };
    const onBackdropClick = event => {
      if (event.target === $dialog) $dialog.close("cancel");
    };
    $dialog.addEventListener("close", onClose, { once: true });
    $dialog.addEventListener("click", onBackdropClick);
    $cancel.onclick = () => $dialog.close("cancel");
    $submit.onclick = event => {
      event.preventDefault();
      if (label && !$input.value.trim()) {
        $input.focus();
        return;
      }
      $dialog.close("confirm");
    };
    $input.onkeydown = event => {
      if (event.key === "Enter" && label) {
        event.preventDefault();
        if ($input.value.trim()) $dialog.close("confirm");
      }
    };
    $dialog.returnValue = "cancel";
    $dialog.showModal();
    if (label) $input.focus();
    else $submit.focus();
  });
}

async function askForText(title, label, value = "", confirmLabel = "Create") {
  const result = await openActionDialog({ title, label, value, confirmLabel });
  return result.confirmed ? result.value : "";
}

async function askToConfirm(title, message, confirmLabel = "Continue", danger = false) {
  const result = await openActionDialog({ title, message, confirmLabel, danger });
  return result.confirmed;
}

function showToast(message, kind = "info") {
  const $region = document.querySelector(".toast-region");
  const $toast = document.createElement("div");
  $toast.className = `toast toast-${kind}`;
  $toast.textContent = message;
  $region.appendChild($toast);
  requestAnimationFrame(() => $toast.classList.add("visible"));
  setTimeout(() => {
    $toast.classList.remove("visible");
    setTimeout(() => $toast.remove(), 180);
  }, 4200);
}

async function setupEditorPage() {
  const url = baseUrl();
  document.querySelector(".editor-label").textContent = baseName(url);

  const $download = document.querySelector(".download");
  $download.classList.remove("hidden");
  $download.href = url;

  if (DATA.kind == "Edit") {
    if (DATA.allow_upload && DATA.allow_delete) {
      const $moveFile = document.querySelector(".move-file");
      $moveFile.classList.remove("hidden");
      $moveFile.addEventListener("click", async () => {
        const query = location.href.slice(url.length);
        const newFileUrl = await doMovePath(url);
        if (newFileUrl) {
          location.href = newFileUrl + query;
        }
      });
    }

    if (DATA.allow_delete) {
      const $deleteFile = document.querySelector(".delete-file");
      $deleteFile.classList.remove("hidden");
      $deleteFile.addEventListener("click", async () => {
        const url = baseUrl();
        const name = baseName(url);
        await doDeletePath(name, url, () => {
          location.href = location.href.split("/").slice(0, -1).join("/");
        });
      });
    }

    if (DATA.editable && DATA.allow_upload) {
      const $saveBtn = document.querySelector(".save-btn");
      $saveBtn.classList.remove("hidden");
      $saveBtn.addEventListener("click", saveChange);
    }
  } else if (DATA.kind == "View") {
    $editor.readOnly = true;
  }

  if (!DATA.editable) {
    const $notEditable = document.querySelector(".not-editable");
    const url = baseUrl();
    const ext = extName(baseName(url));
    if (IFRAME_FORMATS.find(v => v === ext)) {
      $notEditable.insertAdjacentHTML("afterend", `<iframe src="${url}" sandbox width="100%" height="${window.innerHeight - 100}px"></iframe>`);
    } else {
      $notEditable.classList.remove("hidden");
      $notEditable.textContent = "Cannot edit because file is too large or binary.";
    }
    return;
  }

  $editor.classList.remove("hidden");
  $editor.readOnly = DATA.kind == "View" || !DATA.allow_upload;
  document.querySelector(".editor-label").textContent = baseName(url);
  const $editorStatus = document.querySelector(".editor-status");
  try {
    const res = await fetch(baseUrl());
    await assertResOK(res);
    const encoding = getEncoding(res.headers.get("content-type"));
    if (encoding === "utf-8") {
      $editor.value = await res.text();
    } else {
      const bytes = await res.arrayBuffer();
      const dataView = new DataView(bytes);
      const decoder = new TextDecoder(encoding);
      $editor.value = decoder.decode(dataView);
    }
    $editor.dataset.savedValue = $editor.value;
    $editorStatus.textContent = $editor.readOnly ? "Read only" : "Saved";
    $editor.addEventListener("input", () => {
      const dirty = $editor.value !== $editor.dataset.savedValue;
      $editorStatus.textContent = dirty ? "Unsaved changes" : "Saved";
    });
  } catch (err) {
    showToast(`Could not load file: ${err.message}`, "error");
  }
}

/**
 * Delete path
 * @param {number} index
 * @returns
 */
async function deletePath(index) {
  const file = DATA.paths[index];
  if (!file) return;
  await doDeletePath(file.name, newUrl(file.name), () => {
    DATA.paths[index] = null;
    renderPathsTableBody();
  });
}

async function doDeletePath(name, url, cb) {
  if (!await askToConfirm("Delete item", `Delete “${name}”? This cannot be undone.`, "Delete", true)) return;
  try {
    await checkAuth();
    const res = await fetch(url, {
      method: "DELETE",
    });
    await assertResOK(res);
    cb();
  } catch (err) {
    if (err.code === "readonly-descendant") {
      showToast(`Cannot delete “${name}”: the directory contains read-only entries`, "error");
    } else if (err.code === "delete-disabled") {
      showToast(`Cannot delete “${name}”: delete is disabled`, "error");
    } else {
      showToast(`Cannot delete “${name}”: ${err.message}`, "error");
    }
  }
}

/**
 * Move path
 * @param {number} index
 * @returns
 */
async function movePath(index) {
  const file = DATA.paths[index];
  if (!file) return;
  const fileUrl = newUrl(file.name);
  const newFileUrl = await doMovePath(fileUrl);
  if (newFileUrl) {
    location.href = newFileUrl.split("/").slice(0, -1).join("/");
  }
}

async function doMovePath(fileUrl) {
  const fileUrlObj = new URL(fileUrl);

  const prefix = DATA.uri_prefix.slice(0, -1);

  const filePath = decodeURIComponent(fileUrlObj.pathname.slice(prefix.length));

  let newPath = await askForText("Move or rename", "New path", filePath, "Move");
  if (!newPath) return;
  if (!newPath.startsWith("/")) newPath = "/" + newPath;
  if (filePath === newPath) return;
  const newFileUrl = fileUrlObj.origin + prefix + newPath.split("/").map(encodeURIComponent).join("/");

  try {
    await checkAuth();
    const res1 = await fetch(newFileUrl, {
      method: "HEAD",
    });
    if (res1.status === 200) {
      if (!await askToConfirm("Replace existing item", "An item already exists at this path. Replace it?", "Replace", true)) {
        return;
      }
    }
    const res2 = await fetch(fileUrl, {
      method: "MOVE",
      headers: {
        "Destination": newFileUrl,
      }
    });
    await assertResOK(res2);
    return newFileUrl;
  } catch (err) {
    if (err.code === "readonly-descendant") {
      showToast(`Cannot move “${filePath}”: the directory contains read-only entries`, "error");
    } else if (err.code === "upload-disabled" || err.code === "delete-disabled") {
      showToast(`Cannot move “${filePath}”: moving is disabled`, "error");
    } else {
      showToast(`Cannot move “${filePath}” to “${newPath}”: ${err.message}`, "error");
    }
  }
}


/**
 * Save editor change
 */
async function saveChange() {
  const $button = document.querySelector(".save-btn");
  const $status = document.querySelector(".editor-status");
  $button.disabled = true;
  $status.textContent = "Saving";
  try {
    const res = await fetch(baseUrl(), {
      method: "PUT",
      body: $editor.value,
    });
    await assertResOK(res);
    $editor.dataset.savedValue = $editor.value;
    $status.textContent = "Saved";
    showToast("File saved", "success");
  } catch (err) {
    $status.textContent = "Save failed";
    showToast(`Could not save file: ${err.message}`, "error");
  } finally {
    $button.disabled = false;
  }
}

async function checkAuth(variant) {
  if (!DATA.auth) return;
  const qs = variant ? `?${variant}` : "";
  const res = await fetch(baseUrl() + qs, {
    method: "CHECKAUTH",
  });
  await assertResOK(res);
  $loginBtn.classList.add("hidden");
  $logoutBtn.classList.remove("hidden");
  $userName.textContent = await res.text();
  document.querySelector(".user-avatar").textContent = $userName.textContent.slice(0, 1).toUpperCase();
  setupDownloadWithToken();
}

function logout() {
  if (!DATA.auth) return;
  const url = baseUrl();
  const xhr = new XMLHttpRequest();
  xhr.open("LOGOUT", url, true, DATA.user);
  xhr.onload = () => {
    location.href = url;
  }
  xhr.send();
}

/**
 * Create a folder
 * @param {string} name
 */
async function createFolder(name) {
  const url = newUrl(name);
  try {
    await checkAuth();
    const res = await fetch(url, {
      method: "MKCOL",
    });
    await assertResOK(res);
    location.href = url;
  } catch (err) {
    if (err.code === "already-exists") {
      showToast(`Cannot create folder “${name}”: it already exists`, "error");
    } else if (err.code === "upload-disabled") {
      showToast("Cannot create folder: upload is disabled", "error");
    } else {
      showToast(`Could not create folder “${name}”: ${err.message}`, "error");
    }
  }
}

async function createFile(name) {
  const url = newUrl(name);
  try {
    await checkAuth();
    const res = await fetch(url, {
      method: "PUT",
      body: "",
    });
    await assertResOK(res);
    location.href = url + "?edit";
  } catch (err) {
    if (err.code === "upload-disabled") {
      showToast("Cannot create file: upload is disabled", "error");
    } else if (err.code === "delete-disabled") {
      showToast("Cannot create file: delete is disabled", "error");
    } else {
      showToast(`Could not create file “${name}”: ${err.message}`, "error");
    }
  }
}

async function addFileEntries(entries, dirs) {
  for (const entry of entries) {
    if (entry.isFile) {
      entry.file(file => {
        new Uploader(file, dirs).upload();
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();

      const successCallback = entries => {
        if (entries.length > 0) {
          addFileEntries(entries, [...dirs, entry.name]);
          dirReader.readEntries(successCallback);
        }
      };

      dirReader.readEntries(successCallback);
    }
  }
}


function newUrl(name) {
  let url = baseUrl();
  if (!url.endsWith("/")) url += "/";
  url += name.split("/").map(encodeURIComponent).join("/");
  return url;
}

function baseUrl() {
  return location.href.split(/[?#]/)[0];
}

function baseName(url) {
  return decodeURIComponent(url.split("/").filter(v => v.length > 0).slice(-1)[0]);
}

function extName(filename) {
  const dotIndex = filename.lastIndexOf('.');

  if (dotIndex === -1 || dotIndex === 0 || dotIndex === filename.length - 1) {
    return '';
  }

  return filename.substring(dotIndex);
}

function getPathSvg(path_type) {
  switch (path_type) {
    case "Dir":
      return ICONS.dir;
    case "SymlinkFile":
      return ICONS.symlinkFile;
    case "SymlinkDir":
      return ICONS.symlinkDir;
    default:
      return ICONS.file;
  }
}

function formatMtime(mtime) {
  if (!mtime) return "";
  const date = new Date(mtime);
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1, 2);
  const day = padZero(date.getDate(), 2);
  const hours = padZero(date.getHours(), 2);
  const minutes = padZero(date.getMinutes(), 2);
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function padZero(value, size) {
  return ("0".repeat(size) + value).slice(-1 * size);
}

function formatDirSize(size) {
  const unit = size === 1 ? "item" : "items";
  const num = size >= MAX_SUBPATHS_COUNT ? `>${MAX_SUBPATHS_COUNT - 1}` : `${size}`;
  return ` ${num} ${unit}`;
}

function formatFileSize(size, unit) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.max(0, unit ? sizes.indexOf(unit) : (size > 0 ? parseInt(Math.floor(Math.log(size) / Math.log(1024))) : 0));
  const raw = size > 0 ? size / Math.pow(1024, i) : 0;
  if (i === 0) return [Math.round(raw), "B"];
  return [raw.toFixed(1), sizes[i]];
}

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return "--:--";
  seconds = Math.ceil(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds - h * 3600) / 60);
  const s = seconds - h * 3600 - m * 60;
  if (h > 0) return `${padZero(h, 2)}:${padZero(m, 2)}:${padZero(s, 2)}`;
  return `${padZero(m, 2)}:${padZero(s, 2)}`;
}

function formatUploadSize(uploaded, total) {
  const unit = formatFileSize(total)[1];
  const [uploadedValue] = formatFileSize(uploaded, unit);
  const [totalValue] = formatFileSize(total, unit);
  return `${uploadedValue}/${totalValue} ${unit}`;
}

function formatPercent(percent) {
  return Math.round(percent) + "%";
}

function encodedStr(rawStr) {
  return rawStr.replace(/[\u00A0-\u9999<>\&]/g, function (i) {
    return '&#' + i.charCodeAt(0) + ';';
  });
}

async function assertResOK(res) {
  if (!(res.status >= 200 && res.status < 300)) {
    const err = new Error(await res.text() || `Invalid status ${res.status}`);
    err.code = res.headers.get("x-dufs-error-code");
    throw err;
  }
}

function getEncoding(contentType) {
  const charset = contentType?.split(";")[1];
  if (/charset/i.test(charset)) {
    let encoding = charset.split("=")[1];
    if (encoding) {
      return encoding.toLowerCase();
    }
  }
  return 'utf-8';
}

// Parsing base64 strings with Unicode characters
function decodeBase64(base64String) {
  const binString = atob(base64String);
  const len = binString.length;
  const bytes = new Uint8Array(len);
  const arr = new Uint32Array(bytes.buffer, 0, Math.floor(len / 4));
  let i = 0;
  for (; i < arr.length; i++) {
    arr[i] = binString.charCodeAt(i * 4) |
      (binString.charCodeAt(i * 4 + 1) << 8) |
      (binString.charCodeAt(i * 4 + 2) << 16) |
      (binString.charCodeAt(i * 4 + 3) << 24);
  }
  for (i = i * 4; i < len; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
