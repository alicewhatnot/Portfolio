(function () {
  "use strict";

  const API = "https://api.github.com";

  const signinPanel = document.getElementById("signin-panel");
  const editorPanel = document.getElementById("editor-panel");
  const signinStatus = document.getElementById("signin-status");
  const saveStatus = document.getElementById("save-status");
  const entriesList = document.getElementById("entries-list");
  const template = document.getElementById("entry-template");

  let session = null; // { repo, branch, token, sha }

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

  async function fetchDataFile(repo, branch, token) {
    const res = await fetch(
      `${API}/repos/${repo}/contents/data.json?ref=${encodeURIComponent(branch)}`,
      { headers: ghHeaders(token) }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error (${res.status})`);
    }
    const json = await res.json();
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
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error (${res.status})`);
    }
    return res.json();
  }

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
