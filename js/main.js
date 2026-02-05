const collapsibles = document.querySelectorAll(".collapsible");
collapsibles.forEach((item) =>
  item.addEventListener("click", function () {
    this.classList.toggle("collapsible--expanded");
  })
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
      const src = img.getAttribute("data-lightbox-src") || img.currentSrc || img.src;
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
