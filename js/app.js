(function () {
  "use strict";

  const timelineEl = document.getElementById("timeline");
  const dialog = document.getElementById("entry-dialog");
  const dialogClose = document.getElementById("dialog-close");
  const filterButtons = document.querySelectorAll(".filter-pill");

  let currentFilter = "all";
  let entries = [];

  function monthLabel(dateStr) {
    // dateStr like "2026-07" or "2026-07-15"
    const parts = dateStr.split("-");
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (isNaN(monthIdx) || !months[monthIdx]) return year;
    return months[monthIdx] + " " + year;
  }

  function renderProfile(profile) {
    document.getElementById("profile-name").textContent = profile.name || "";
    document.getElementById("profile-subheading").textContent = profile.subheading || "";
    document.getElementById("profile-reading").textContent = profile.reading || "—";
    document.getElementById("profile-interest").textContent = profile.interest || "—";

    const gh = document.getElementById("link-github");
    const ig = document.getElementById("link-instagram");
    if (profile.github) gh.href = profile.github;
    if (profile.instagram) ig.href = profile.instagram;

    if (profile.name) {
      document.title = profile.name;
    }
  }

  function renderTimeline() {
    timelineEl.innerHTML = "";
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    sorted.forEach((entry, i) => {
      const li = document.createElement("li");
      li.className = "entry " + (i % 2 === 0 ? "side-left" : "side-right");
      li.dataset.type = entry.type;
      li.dataset.id = entry.id;

      if (currentFilter !== "all" && entry.type !== currentFilter) {
        li.classList.add("is-hidden");
      }

      const card = document.createElement("button");
      card.className = "entry-card";
      card.type = "button";
      card.setAttribute("aria-haspopup", "dialog");
      card.innerHTML = `
        <span class="entry-date">${entry.dateLabel || monthLabel(entry.date)}</span>
        <h3>${escapeHtml(entry.title)}</h3>
        <p>${escapeHtml(entry.summary || "")}</p>
        <span class="entry-tag">${entry.type}</span>
      `;
      card.addEventListener("click", () => openDialog(entry));

      const node = document.createElement("span");
      node.className = "entry-node";
      node.setAttribute("aria-hidden", "true");

      li.appendChild(card);
      li.appendChild(node);
      timelineEl.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function openDialog(entry) {
    document.getElementById("dialog-title").textContent = entry.title;
    document.getElementById("dialog-date").textContent = entry.dateLabel || monthLabel(entry.date);
    document.getElementById("dialog-description").textContent = entry.description || entry.summary || "";

    const tagEl = document.getElementById("dialog-tag");
    tagEl.textContent = entry.type;
    tagEl.style.background = entry.type === "career" ? "var(--accent-career-bg)" : "var(--accent-project-bg)";
    tagEl.style.color = entry.type === "career" ? "var(--accent-career)" : "var(--accent-project)";

    const tagsWrap = document.getElementById("dialog-tags");
    tagsWrap.innerHTML = "";
    (entry.tags || []).forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = t;
      tagsWrap.appendChild(chip);
    });

    const linkEl = document.getElementById("dialog-link");
    if (entry.link) {
      linkEl.href = entry.link;
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
    }

    dialog.showModal();
  }

  dialogClose.addEventListener("click", () => dialog.close());

  // Close when clicking the backdrop (outside the dialog box itself)
  dialog.addEventListener("click", (e) => {
    const rect = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      filterButtons.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      renderTimeline();
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  fetch("data.json")
    .then((res) => {
      if (!res.ok) throw new Error("Could not load data.json");
      return res.json();
    })
    .then((data) => {
      renderProfile(data.profile || {});
      entries = data.timeline || [];
      renderTimeline();
    })
    .catch((err) => {
      timelineEl.innerHTML = `<li style="grid-column:1/-1;text-align:center;color:var(--ink-faint);font-family:var(--font-mono);font-size:0.85rem;">
        Couldn't load data.json (${escapeHtml(err.message)}). If you're viewing this file locally, serve it over
        a local server rather than opening it directly — e.g. <code>python3 -m http.server</code>.
      </li>`;
    });
})();
