const collapsibles = document.querySelectorAll(".collapsible");
collapsibles.forEach((item) =>
  item.addEventListener("click", function () {
    this.classList.toggle("collapsible--expanded");
  }),
);

document.addEventListener("DOMContentLoaded", () => {
  let lightbox = document.getElementById("lightbox");

  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.id = "lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Close">×</button>' +
      '<img class="lightbox__img" alt="" />';
    document.body.appendChild(lightbox);
  }

  const lightboxImg = lightbox.querySelector(".lightbox__img");
  const closeBtn = lightbox.querySelector(".lightbox__close");

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    lightboxImg.alt = "";
  }

  document.querySelectorAll(".lightbox-trigger").forEach((img) => {
    img.addEventListener("click", () => {
      const src =
        img.getAttribute("data-lightbox-src") || img.currentSrc || img.src;
      openLightbox(src, img.alt);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeLightbox);
  }

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
});

// Copy to clipboard functionality for share blurbs
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("share-blurb__copy")) {
    const text = e.target.getAttribute("data-copy-text");
    navigator.clipboard.writeText(text).then(() => {
      const icon = e.target;
      icon.classList.add("copied");

      setTimeout(() => {
        icon.classList.remove("copied");
      }, 500);
    });
  }
});

// Copy to clipboard for the footer admin email
document.addEventListener("click", (e) => {
  const button = e.target.closest(".footer__email-copy");
  if (!button) return;

  const text = button.getAttribute("data-copy-text");
  navigator.clipboard.writeText(text).then(() => {
    const feedback = button.querySelector(".footer__email-copy-feedback");
    if (!feedback) return;

    feedback.classList.add("footer__email-copy-feedback--visible");
    clearTimeout(button._copyFeedbackTimeout);
    button._copyFeedbackTimeout = setTimeout(() => {
      feedback.classList.remove("footer__email-copy-feedback--visible");
    }, 1500);
  });
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchSupabaseRpc(rpcName, payload) {
  const SUPABASE_URL = "https://akajfgobhzkadiigydkh.supabase.co";
  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWpmZ29iaHprYWRpaWd5ZGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzA1NjEsImV4cCI6MjA3NDU0NjU2MX0.Rz3duZlc1i_u2_wfJurbP9FNWz6BhfqshOS3pHySp_A";

  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + rpcName, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: "Bearer " + ANON_KEY,
    },
    body: JSON.stringify(payload || {}),
  });

  if (!res.ok) {
    throw new Error("Leaderboard request failed");
  }

  return res.json();
}

function renderWordLeaderboardRows(rows) {
  return rows
    .map((row, index) => {
      const username = escapeHtml(row.username || "Anonymous");
      const wpm = Number.isFinite(Number(row.highest_wpm))
        ? row.highest_wpm
        : 0;
      const verse = escapeHtml(row.highest_wpm_verse || "-");

      return (
        '<li class="leaderboard__row">' +
        '<span class="leaderboard__rank">#' +
        (index + 1) +
        "</span>" +
        '<span class="leaderboard__player">' +
        username +
        "</span>" +
        '<span class="leaderboard__value">' +
        wpm +
        " WPM</span>" +
        '<span class="leaderboard__meta">' +
        verse +
        "</span>" +
        "</li>"
      );
    })
    .join("");
}

function renderBubbleLeaderboardRows(rows) {
  return rows
    .map((row, index) => {
      const username = escapeHtml(row.username || "Anonymous");
      const score = Number.isFinite(Number(row.best_score))
        ? row.best_score
        : 0;
      const level = Number.isFinite(Number(row.best_level))
        ? row.best_level
        : 1;

      return (
        '<li class="leaderboard__row">' +
        '<span class="leaderboard__rank">#' +
        (index + 1) +
        "</span>" +
        '<span class="leaderboard__player">' +
        username +
        "</span>" +
        '<span class="leaderboard__value">' +
        score +
        " pts</span>" +
        '<span class="leaderboard__meta">Best level: ' +
        level +
        "</span>" +
        "</li>"
      );
    })
    .join("");
}

async function loadLeaderboard(container) {
  const board = container.querySelector("[data-leaderboard-list]");
  const status = container.querySelector("[data-leaderboard-status]");
  const updated = container.querySelector("[data-leaderboard-updated]");
  const retryBtn = container.querySelector("[data-leaderboard-retry]");
  const kind = container.getAttribute("data-leaderboard");
  const limit = Number(container.getAttribute("data-limit") || 10);

  if (!board || !status || !kind) return;

  status.textContent = "Loading leaderboard...";
  board.innerHTML = "";
  if (updated) updated.textContent = "Last updated: --";
  if (retryBtn) retryBtn.hidden = true;

  try {
    let rows = [];

    if (kind === "word") {
      rows = await fetchSupabaseRpc("word_top_wpm", { limit_n: limit });
      board.innerHTML = renderWordLeaderboardRows(rows || []);
    } else if (kind === "bubble") {
      rows = await fetchSupabaseRpc("bubble_top_overall", { limit_n: limit });
      board.innerHTML = renderBubbleLeaderboardRows(rows || []);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      status.textContent = "No leaderboard entries yet. Be the first to play!";
      if (updated)
        updated.textContent =
          "Last checked: " +
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          });
      return;
    }

    status.textContent = "Updated live from Gospelgo public leaderboard data.";
    if (updated)
      updated.textContent =
        "Last updated: " +
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
  } catch (err) {
    status.textContent = "Could not load leaderboard right now.";
    if (updated) updated.textContent = "Last updated: unavailable";
    if (retryBtn) retryBtn.hidden = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-leaderboard]").forEach((container) => {
    const retryBtn = container.querySelector("[data-leaderboard-retry]");
    const refreshMs = Number(
      container.getAttribute("data-refresh-ms") || 60000,
    );

    if (retryBtn) {
      retryBtn.addEventListener("click", () => loadLeaderboard(container));
    }

    loadLeaderboard(container);

    if (Number.isFinite(refreshMs) && refreshMs > 0) {
      setInterval(() => {
        if (document.visibilityState !== "visible") return;
        loadLeaderboard(container);
      }, refreshMs);
    }
  });
});
