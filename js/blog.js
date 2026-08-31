(function () {
  "use strict";

  const grid = document.getElementById("blog-grid");
  const dialog = document.getElementById("entry-dialog");
  const dialogClose = document.getElementById("dialog-close");
  const dialogImage = document.getElementById("dialog-image");

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderPosts(posts) {
    grid.innerHTML = "";

    if (!posts.length) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--ink-faint, #888);font-family:var(--font-mono, monospace);font-size:0.85rem;">
        No posts yet.
      </p>`;
      return;
    }

    const sorted = [...posts].sort((a, b) => (b.Id ?? 0) - (a.Id ?? 0));

    sorted.forEach((post) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "blog-card";
      card.setAttribute("aria-haspopup", "dialog");
      card.innerHTML = `
        ${post.image ? `<img class="blog-card-image" src="${post.image}" alt="" loading="lazy">` : ""}
        <div class="blog-card-body">
          <span class="blog-card-date">${formatDate(post.date)}</span>
          <h3>${escapeHtml(post.title || "")}</h3>
          <p>${escapeHtml(post.description || "")}</p>
        </div>
      `;
      card.addEventListener("click", () => openPost(post));
      grid.appendChild(card);
    });
  }

  function openPost(post) {
    if (post.image) {
      dialogImage.src = post.image;
      dialogImage.alt = post.title || "";
      dialogImage.hidden = false;
    } else {
      dialogImage.hidden = true;
      dialogImage.removeAttribute("src");
    }

    document.getElementById("dialog-title").textContent = post.title || "";
    document.getElementById("dialog-date").textContent = formatDate(post.date);
    // Post content is authored HTML from the admin panel (not user input), so
    // it's set directly rather than escaped, matching how it's meant to render.
    document.getElementById("dialog-content").innerHTML = post.content || "";
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

  document.getElementById("year").textContent = new Date().getFullYear();

  fetch("articles.json")
    .then((res) => {
      if (!res.ok) throw new Error("Could not load articles.json");
      return res.json();
    })
    .then((posts) => renderPosts(posts || []))
    .catch((err) => {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--ink-faint, #888);font-family:var(--font-mono, monospace);font-size:0.85rem;">
        Couldn't load articles.json (${escapeHtml(err.message)}). If you're viewing this file locally, serve it over
        a local server rather than opening it directly — e.g. <code>python3 -m http.server</code>.
      </p>`;
    });
})();