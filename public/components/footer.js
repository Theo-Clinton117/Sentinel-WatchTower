class CustomFooter extends HTMLElement {
  async connectedCallback() {
    const year = new Date().getFullYear();
    const authState = await this.getAuthState();
    const authLabel = authState.isSignedIn ? "Log out" : "Sign in";
    const authHref = authState.isSignedIn ? "#" : "./login.html";
    const authAction = authState.isSignedIn ? ` data-auth-action="logout"` : "";

    this.innerHTML = `
      <footer class="border-t border-gray-800 bg-gray-950 relative" style="box-shadow: 0 -18px 40px rgba(2,6,23,0.6);">
        <div style="position:absolute;top:-1px;left:0;right:0;height:10px;background:linear-gradient(180deg, rgba(59,130,246,0.15), rgba(2,6,23,0));pointer-events:none;"></div>
        <div class="max-w-7xl mx-auto px-6 py-12">
          <div class="flex flex-col lg:flex-row items-start justify-between gap-8">
            <div class="flex items-center gap-3">
              <span class="w-2 h-2 rounded-full bg-red-500"></span>
              <div>
                <p class="text-sm font-semibold text-blue-300">Sentinel WatchTower</p>
                <p class="text-xs text-gray-500">Real-time geospatial risk intelligence.</p>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm text-gray-300 w-full lg:w-auto">
              <div class="space-y-2">
                <p class="text-xs uppercase tracking-widest text-gray-500">Product</p>
                <a href="./home.html" class="hover:text-gray-100">Home</a>
                <a href="./dashboard.html" class="hover:text-gray-100">Dashboard</a>
                <a href="./risk-log.html" class="hover:text-gray-100">Risk Log</a>
              </div>
              <div class="space-y-2">
                <p class="text-xs uppercase tracking-widest text-gray-500">Plans</p>
                <a href="./sub.html" class="hover:text-gray-100">Plans</a>
                <a href="./org-contact.html" class="hover:text-gray-100">Organization Sales</a>
              </div>
              <div class="space-y-2">
                <p class="text-xs uppercase tracking-widest text-gray-500">Contact</p>
                <span class="text-gray-300">support@sentinelwatchtower.com</span>
                <span class="text-gray-300">+234 800 000 0000</span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <a href="#" class="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center hover:text-gray-100" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><circle cx="17" cy="7" r="1" fill="currentColor"/></svg>
              </a>
              <a href="#" class="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center hover:text-gray-100" aria-label="X">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5L19 19M7 19L19 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </a>
              <a href="#" class="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center hover:text-gray-100" aria-label="LinkedIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9V18M6 6.5V6M10 9V18M10 12.5V12M14 12V18M14 9.5V9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </a>
            </div>
          </div>

          <div class="mt-8 pt-4 border-t border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-gray-500">
            <span>© ${year} Sentinel WatchTower. All rights reserved.</span>
            <div class="flex flex-wrap items-center gap-3">
              <a href="./privacy.html" class="hover:text-gray-300">Privacy Policy</a>
              <span class="text-gray-700">•</span>
              <a href="./terms.html" class="hover:text-gray-300">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    `;

    const logoutLink = this.querySelector("[data-auth-action='logout']");
    if (logoutLink) {
      logoutLink.addEventListener("click", async evt => {
        evt.preventDefault();
        await this.logout(authState.supabaseClient);
      });
    }
  }

  async getAuthState() {
    const AUTH_CONTEXT_KEY = "authUserContext";
    const storedContext = sessionStorage.getItem(AUTH_CONTEXT_KEY) || localStorage.getItem(AUTH_CONTEXT_KEY);
    let supabaseClient = null;
    let hasSupabaseSession = false;

    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
      const SUPABASE_URL = "https://bjmliqvtjjntkgxpwwkp.supabase.co";
      const SUPABASE_ANON_KEY = "sb_publishable_P3c1Q3lJqNyGYobS5wy-EA_xKDOetei";
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = await supabaseClient.auth.getSession();
      hasSupabaseSession = !!data?.session;
    } catch (_) {
      hasSupabaseSession = false;
    }

    return {
      isSignedIn: hasSupabaseSession || !!storedContext,
      supabaseClient
    };
  }

  async logout(supabaseClient) {
    const AUTH_CONTEXT_KEY = "authUserContext";
    try {
      if (supabaseClient) await supabaseClient.auth.signOut();
    } catch (_) {
      // Continue clearing local auth context even if remote sign-out fails.
    } finally {
      sessionStorage.removeItem(AUTH_CONTEXT_KEY);
      localStorage.removeItem(AUTH_CONTEXT_KEY);
      sessionStorage.removeItem("userEmail");
      localStorage.removeItem("userEmail");
      window.location.href = "./login.html";
    }
  }
}

customElements.define("custom-footer", CustomFooter);
