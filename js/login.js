/* ==========================================================================
   Login page interactivity
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("login-button");

  button.addEventListener("click", () => {
    // Design prototype only — the real app redirects to an SSO provider.
    // Here we just simulate a successful login and go straight to the summary page,
    // matching the real app's default post-login route.
    sessionStorage.setItem("safeguarding_user", "Demo User");
    window.location.href = "summary.html";
  });
});
