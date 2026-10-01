/* ==========================================================================
   Summary page interactivity
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("currency-sync-time").textContent = nowFormatted(12);
  document.getElementById("entity-sync-time").textContent = nowFormatted(3);

  const name = sessionStorage.getItem("safeguarding_user") || "Demo User";
  document.getElementById("current-user").textContent = name;

  document.getElementById("btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem("safeguarding_user");
    window.location.href = "index.html";
  });

  // Cosmetic-only period navigation for this design prototype.
  const periodDate = document.getElementById("period-date");
  const prevBtn = document.getElementById("btn-period-prev");
  const nextBtn = document.getElementById("btn-period-next");
  if (periodDate && prevBtn && nextBtn) {
    const step = (days) => {
      const current = periodDate.valueAsDate || new Date();
      current.setDate(current.getDate() + days);
      periodDate.valueAsDate = current;
    };
    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));
  }

  // Cosmetic-only export action for this design prototype.
  const exportBtn = document.getElementById("btn-export");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportBtn.textContent = "Exporting…";
      setTimeout(() => {
        exportBtn.textContent = "Export";
      }, 900);
    });
  }
});
