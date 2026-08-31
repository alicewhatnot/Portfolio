(function () {
  "use strict";

  const API = "https://api.github.com";

  const signinPanel = document.getElementById("signin-panel");
  const editorPanel = document.getElementById("editor-panel");
  const signinStatus = document.getElementById("signin-status");
  const saveStatus = document.getElementById("save-status");
  const entriesList = document.getElementById("entries-list");
  const template = document.getElementById("entry-template");

  // --- Blog tab elements ---
  const tabBtnTimeline = document.getElementById("tab-btn-timeline");
  const tabBtnBlog = document.getElementById("tab-btn-blog");
  const tabTimeline = document.getElementById("tab-timeline");
  const tabBlog = document.getElementById("tab-blog");
  const postsList = document.getElementById("posts-list");
  const postTemplate = document.getElementById("post-template");
  const savePostsStatus = document.getElementById("save-posts-status");

  let session = null; // { repo, branch, token, sha }        <- data.json sha
  let articlesSha = null; // sha of articles.json, kept separately since it's a different file

  function b64EncodeUnicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64DecodeUnicode(str) {
    return decodeURIComponent(escape(atob(str)));
  }

  function setStatus(el, msg, kind) {
    el.textContent = msg;
    el.className = "status" + (kind ? " " + kind : "");
  }

  function ghHeaders(token) {
    return {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  async function ghJson(res) {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error (${res.status})`);
    }
    return res.json();
  }

  // ---------- data.json (profile + timeline) ----------

  async function fetchDataFile(repo, branch, token) {
    const res = await fetch(
      `${API}/repos/${repo}/contents/data.json?ref=${encodeURIComponent(branch)}`,
      { headers: ghHeaders(token) }
    );
    const json = await ghJson(res);
    const content = b64DecodeUnicode(json.content.replace(/\n/g, ""));
    return { data: JSON.parse(content), sha: json.sha };
  }

  async function saveDataFile(repo, branch, token, sha, dataObj) {
    const content = b64EncodeUnicode(JSON.stringify(dataObj, null, 2));
    const res = await fetch(`${API}/repos/${repo}/contents/data.json`, {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update site content via admin panel",
        content,
        sha,
        branch,
      }),
    });
    return ghJson(res);
  }

  // ---------- articles.json (blog posts) ----------

  async function fetchArticlesFile(repo, branch, token) {
    const res = await fetch(
      `${API}/repos/${repo}/contents/articles.json?ref=${encodeURIComponent(branch)}`,
      { headers: ghHeaders(token) }
    );
    const json = await ghJson(res);
    const content = b64DecodeUnicode(json.content.replace(/\n/g, ""));
    return { articles: JSON.parse(content), sha: json.sha };
  }

  async function saveArticlesFile(repo, branch, token, sha, articles) {
    const content = b64EncodeUnicode(JSON.stringify(articles, null, 2));
    const res = await fetch(`${API}/repos/${repo}/contents/articles.json`, {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update blog posts via admin panel",
        content,
        sha,
        branch,
      }),
    });
    return ghJson(res);
  }

  // Look up the sha of an existing file at `path`, if any (needed to overwrite it).
  async function getExistingSha(repo, branch, token, path) {
    try {
      const res = await fetch(
        `${API}/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
        { headers: ghHeaders(token) }
      );
      if (res.ok) {
        const json = await res.json();
        return json.sha;
      }
    } catch (e) {
      /* treat any failure as "doesn't exist yet" */
    }
    return undefined;
  }

  // Uploads a binary image file to the repo at `path`. Always stored as a
  // *relative* path (no leading slash) so it resolves correctly whether this
  // repo is a user site (username.github.io) or a project page
  // (username.github.io/repo-name) on GitHub Pages.
  async function uploadImageFile(repo, branch, token, path, file) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read image file"));
      reader.readAsDataURL(file);
    });

    const existingSha = await getExistingSha(repo, branch, token, path);

    const body = {
      message: `Upload image ${path}`,
      content: base64,
      branch,
    };
    if (existingSha) body.sha = existingSha;

    const res = await fetch(`${API}/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return ghJson(res);
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
  }

  // ---------- Profile ----------

  function fillProfileForm(profile) {
    document.getElementById("f-name").value = profile.name || "";
    document.getElementById("f-subheading").value = profile.subheading || "";
    document.getElementById("f-reading").value = profile.reading || "";
    document.getElementById("f-interest").value = profile.interest || "";
    document.getElementById("f-github").value = profile.github || "";
    document.getElementById("f-instagram").value = profile.instagram || "";
  }

  function readProfileForm() {
    return {
      name: document.getElementById("f-name").value.trim(),
      subheading: document.getElementById("f-subheading").value.trim(),
      reading: document.getElementById("f-reading").value.trim(),
      interest: document.getElementById("f-interest").value.trim(),
      github: document.getElementById("f-github").value.trim(),
      instagram: document.getElementById("f-instagram").value.trim(),
    };
  }

  // ---------- Timeline entries ----------

  function addEntryForm(entry) {
    entry = entry || {};
    const node = template.content.cloneNode(true);
    const form = node.querySelector(".entry-form");

    form.querySelector(".e-type").value = entry.type || "career";
    form.querySelector(".e-title").value = entry.title || "";
    form.querySelector(".e-date").value = entry.date || "";
    form.querySelector(".e-datelabel").value = entry.dateLabel || "";
    form.querySelector(".e-link").value = entry.link || "";
    form.querySelector(".e-tags").value = (entry.tags || []).join(", ");
    form.querySelector(".e-summary").value = entry.summary || "";
    form.querySelector(".e-description").value = entry.description || "";
    form.dataset.id = entry.id || ("entry-" + Math.random().toString(36).slice(2, 9));

    form.querySelector(".remove-entry").addEventListener("click", () => form.remove());

    // Entries are ordered by date automatically — no manual dragging.
    // Re-sort once the date field is edited and loses focus.
    form.querySelector(".e-date").addEventListener("change", sortEntriesList);

    entriesList.appendChild(form);
  }

  // Blank dates sort before every dated entry ("" precedes any non-empty
  // string), so a new card with no date yet lands at the top of the list —
  // same rule the public timeline uses to order cards.
  function sortEntriesList() {
    const forms = [...entriesList.querySelectorAll(".entry-form")];
    forms.sort((a, b) => {
      const da = a.querySelector(".e-date").value.trim();
      const db = b.querySelector(".e-date").value.trim();
      return da.localeCompare(db);
    });
    forms.forEach((f) => entriesList.appendChild(f));
  }

  function readEntriesForm() {
    return [...entriesList.querySelectorAll(".entry-form")].map((form) => ({
      id: form.dataset.id,
      type: form.querySelector(".e-type").value,
      title: form.querySelector(".e-title").value.trim(),
      date: form.querySelector(".e-date").value.trim(),
      dateLabel: form.querySelector(".e-datelabel").value.trim(),
      link: form.querySelector(".e-link").value.trim(),
      tags: form.querySelector(".e-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
      summary: form.querySelector(".e-summary").value.trim(),
      description: form.querySelector(".e-description").value.trim(),
    }));
  }

  document.getElementById("add-entry-btn").addEventListener("click", () => {
    addEntryForm();
    sortEntriesList();
  });

  // ---------- Blog posts ----------

  function todayDateInputValue() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Best-effort: only recognises ISO (YYYY-MM-DD) cleanly, since that's what
  // <input type="date"> requires and what this panel now saves. Older/odd
  // date formats already in articles.json will show blank in the date
  // picker — re-pick the date once and it'll be stored correctly from then on.
  function toDateInputValue(dateStr) {
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return "";
  }

  function nextPostId() {
    const ids = [...postsList.querySelectorAll(".post-form")].map(
      (f) => parseInt(f.dataset.id, 10) || 0
    );
    return (ids.length ? Math.max(...ids) : 0) + 1;
  }

  function addPostForm(post) {
    post = post || {};
    const node = postTemplate.content.cloneNode(true);
    const form = node.querySelector(".post-form");

    const id = post.Id ?? post.id ?? nextPostId();
    form.dataset.id = id;
    form.dataset.image = post.image || "";
    form._original = post; // keep any fields the form doesn't expose (e.g. "colour")

    form.querySelector(".e-id-display").textContent = id;
    form.querySelector(".e-post-title").value = post.title || "";
    form.querySelector(".e-post-date").value = toDateInputValue(post.date) || (post.Id ? "" : todayDateInputValue());
    form.querySelector(".e-post-description").value = post.description || "";
    form.querySelector(".e-post-content").value = post.content || "";

    const preview = form.querySelector(".e-post-image-preview");
    if (post.image) {
      preview.src = post.image;
      preview.hidden = false;
    }

    form.querySelector(".e-post-image-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      form._pendingFile = file;
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });

    form.querySelector(".remove-post").addEventListener("click", () => form.remove());

    postsList.appendChild(form);
  }

  // Reads every post form, uploading any newly-selected images to the repo
  // first (queued images are only actually committed here, on save).
  async function readPostsFormAndUploadImages(repo, branch, token) {
    const forms = [...postsList.querySelectorAll(".post-form")];
    const posts = [];
    for (const form of forms) {
      let imagePath = form.dataset.image || "";

      if (form._pendingFile) {
        const file = form._pendingFile;
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        // Matches the existing "blogImage<id>.<ext>" naming convention.
        const safeName = sanitizeFilename(`blogImage${form.dataset.id}.${ext}`);
        imagePath = `images/${safeName}`; // relative path — fixes GitHub Pages project-page 404s
        await uploadImageFile(repo, branch, token, imagePath, file);
      }

      posts.push({
        ...(form._original || {}),
        Id: parseInt(form.dataset.id, 10),
        title: form.querySelector(".e-post-title").value.trim(),
        date: form.querySelector(".e-post-date").value,
        description: form.querySelector(".e-post-description").value.trim(),
        image: imagePath,
        content: form.querySelector(".e-post-content").value,
      });
    }
    return posts;
  }

  document.getElementById("add-post-btn").addEventListener("click", () => {
    addPostForm();
  });

  document.getElementById("save-posts-btn").addEventListener("click", async () => {
    if (!session) return;
    setStatus(savePostsStatus, "Saving…", "");
    try {
      const posts = await readPostsFormAndUploadImages(session.repo, session.branch, session.token);
      const result = await saveArticlesFile(session.repo, session.branch, session.token, articlesSha, posts);
      articlesSha = result.content.sha;
      setStatus(savePostsStatus, "Saved. It may take a minute for GitHub Pages to redeploy.", "success");
    } catch (err) {
      setStatus(savePostsStatus, err.message, "error");
    }
  });

  // ---------- Tabs ----------

  function switchTab(which) {
    const isTimeline = which === "timeline";
    tabBtnTimeline.setAttribute("aria-selected", isTimeline ? "true" : "false");
    tabBtnBlog.setAttribute("aria-selected", isTimeline ? "false" : "true");
    tabTimeline.hidden = !isTimeline;
    tabBlog.hidden = isTimeline;
  }

  tabBtnTimeline.addEventListener("click", () => switchTab("timeline"));
  tabBtnBlog.addEventListener("click", () => switchTab("blog"));

  // ---------- Sign in / out ----------

  document.getElementById("connect-btn").addEventListener("click", async () => {
    const repo = document.getElementById("repo-input").value.trim();
    const branch = document.getElementById("branch-input").value.trim() || "main";
    const token = document.getElementById("token-input").value.trim();

    if (!repo || !token) {
      setStatus(signinStatus, "Enter a repository and a token.", "error");
      return;
    }

    setStatus(signinStatus, "Connecting…", "");
    try {
      const { data, sha } = await fetchDataFile(repo, branch, token);
      session = { repo, branch, token, sha };
      sessionStorage.setItem("admin-session", JSON.stringify(session));

      fillProfileForm(data.profile || {});
      entriesList.innerHTML = "";
      (data.timeline || []).forEach(addEntryForm);
      sortEntriesList();

      // Load blog posts too, so the Blog tab works as soon as you sign in.
      try {
        const { articles, sha: aSha } = await fetchArticlesFile(repo, branch, token);
        articlesSha = aSha;
        postsList.innerHTML = "";
        (articles || []).forEach(addPostForm);
      } catch (err) {
        setStatus(savePostsStatus, `Couldn't load articles.json: ${err.message}`, "error");
      }

      signinPanel.hidden = true;
      editorPanel.hidden = false;
      setStatus(signinStatus, "", "");
    } catch (err) {
      setStatus(signinStatus, err.message, "error");
    }
  });

  document.getElementById("signout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("admin-session");
    session = null;
    location.reload();
  });

  document.getElementById("save-btn").addEventListener("click", async () => {
    if (!session) return;
    setStatus(saveStatus, "Saving…", "");
    try {
      const dataObj = { profile: readProfileForm(), timeline: readEntriesForm() };
      const result = await saveDataFile(session.repo, session.branch, session.token, session.sha, dataObj);
      session.sha = result.content.sha;
      sessionStorage.setItem("admin-session", JSON.stringify(session));
      setStatus(saveStatus, "Saved. It may take a minute for GitHub Pages to redeploy.", "success");
    } catch (err) {
      setStatus(saveStatus, err.message, "error");
    }
  });

  // Restore session within the same tab (sessionStorage clears on tab close)
  const saved = sessionStorage.getItem("admin-session");
  if (saved) {
    try {
      const s = JSON.parse(saved);
      document.getElementById("repo-input").value = s.repo;
      document.getElementById("branch-input").value = s.branch;
      document.getElementById("token-input").value = s.token;
      document.getElementById("connect-btn").click();
    } catch (e) { /* ignore */ }
  }
})();