class CustomNavbar extends HTMLElement {
  async connectedCallback() {
    const theme = this.getInitialTheme();
    this.applyTheme(theme);

    const path = window.location.pathname.toLowerCase();
    const authState = await this.getAuthState();
    const planLabel = await this.getPlanLabel(authState);
    const authLink = authState.isSignedIn
      ? {
          href: "#",
          label: "Log out",
          match: [],
          isLogout: true,
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 17L9 12L14 7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12H20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`
        }
      : {
          href: "./login.html",
          label: "Sign in",
          match: ["login.html"],
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 17L15 12L10 7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 12H4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M12 3H19a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H12" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`
        };

    const links = [
      {
        href: "./home.html",
        label: "Home",
        match: ["home.html", "/"],
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 10.5L12 3L21 10.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>`
      },
      {
        href: "./dashboard.html",
        label: "Account",
        match: ["dashboard.html", "reviewer-dashboard.html", "admin-dashboard.html"],
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`
      },
      {
        href: "./risk-log.html",
        label: "Risk Log",
        match: ["risk-log.html"],
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`
      },
      {
        href: "./sub.html",
        label: "Plans",
        match: ["sub.html", "org-contact.html", "success.html"],
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`
      },
      ...(planLabel ? [{
        href: "./sub.html",
        label: planLabel,
        match: ["sub.html", "org-contact.html", "success.html"],
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l3 6 6 .9-4.3 4.2 1 6-5.7-3-5.7 3 1-6L3 9.9 9 9l3-6z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>`
      }] : []),
      {
        ...authLink
      }
    ];

    const desktopLinkHtml = links.map(link => {
      const active = link.match.some(m => path.endsWith(m)) || (path === "/" && link.href.includes("home"));
      const activeClass = active ? "bg-blue-600 text-white" : "bg-gray-700/50 text-gray-200 hover:bg-gray-700";
      const authAction = link.isLogout ? ` data-auth-action="logout"` : "";
      return `<a href="${link.href}" class="px-3 py-2 rounded text-xs ${activeClass}" aria-current="${active ? "page" : "false"}"${authAction}>${link.label}</a>`;
    }).join("");

    const mobileLinkHtml = links.map(link => {
      const active = link.match.some(m => path.endsWith(m)) || (path === "/" && link.href.includes("home"));
      const authAction = link.isLogout ? ` data-auth-action="logout"` : "";
      return `
        <a href="${link.href}" class="mobile-nav-item ${active ? "active" : ""}" aria-current="${active ? "page" : "false"}"${authAction}>
          <span class="mobile-nav-item-icon">${link.icon}</span>
          <span>${link.label}</span>
        </a>
      `;
    }).join("");

    this.innerHTML = `
      <header class="fixed top-0 inset-x-0 z-50 border-b border-gray-700 bg-gray-900/90 backdrop-blur-sm">
        <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <a href="./home.html" class="flex items-center gap-2 text-sm font-semibold text-blue-300">
            <img id="navbarBrandLogo" src="${this.getThemeLogoPath(theme)}" alt="Sentinel logo" width="28" height="28" style="width:28px;height:28px;object-fit:contain;" />
            <span>Sentinel WatchTower</span>
          </a>
          <nav class="nav-desktop flex items-center gap-2" aria-label="Primary">
            ${desktopLinkHtml}
          </nav>
          <div class="flex items-center gap-2">
            <button id="themeToggle" class="rounded bg-gray-700/50 text-gray-100 px-3 py-2 text-xs" aria-label="Switch to light mode" title="Toggle theme">
              ${this.getThemeIcon(theme)}
            </button>
            <button id="mobileMenuToggle" class="nav-mobile-toggle rounded bg-gray-700/50 text-gray-100 px-3 py-2" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNavPanel">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div id="mobileNavBackdrop" class="mobile-nav-backdrop hidden"></div>
      <aside id="mobileNavPanel" class="mobile-nav-panel" aria-hidden="true">
        <nav class="mobile-nav-links" aria-label="Mobile primary">
          ${mobileLinkHtml}
        </nav>
      </aside>
    `;

    const toggle = this.querySelector("#mobileMenuToggle");
    const themeToggle = this.querySelector("#themeToggle");
    const brandLogo = this.querySelector("#navbarBrandLogo");
    const header = this.querySelector("header");
    const panel = this.querySelector("#mobileNavPanel");
    const backdrop = this.querySelector("#mobileNavBackdrop");

    const menuIcon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    const closeIcon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;

    const openMenu = () => {
      panel.classList.add("open");
      backdrop.classList.remove("hidden");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      toggle.innerHTML = closeIcon;
      panel.setAttribute("aria-hidden", "false");
      document.body.classList.add("mobile-nav-open");
    };

    const closeMenu = () => {
      panel.classList.remove("open");
      backdrop.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      toggle.innerHTML = menuIcon;
      panel.setAttribute("aria-hidden", "true");
      document.body.classList.remove("mobile-nav-open");
    };

    toggle?.addEventListener("click", () => {
      if (panel.classList.contains("open")) closeMenu();
      else openMenu();
    });
    themeToggle?.addEventListener("click", () => {
      const next = this.toggleTheme();
      themeToggle.innerHTML = this.getThemeIcon(next);
      themeToggle.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
      if (brandLogo) brandLogo.src = this.getThemeLogoPath(next);
    });
    backdrop?.addEventListener("click", closeMenu);
    this.querySelectorAll(".mobile-nav-links a").forEach(link => link.addEventListener("click", closeMenu));
    const logoutLinks = this.querySelectorAll("[data-auth-action='logout']");
    logoutLinks.forEach(link => {
      link.addEventListener("click", async evt => {
        evt.preventDefault();
        closeMenu();
        await this.logout(authState.supabaseClient);
      });
    });
    document.addEventListener("keydown", evt => {
      if (evt.key === "Escape" && panel.classList.contains("open")) closeMenu();
    });

    document.body.classList.add("has-sentinel-nav");
    this.updateBodyOffset(header);
    if ("ResizeObserver" in window && header) {
      const observer = new ResizeObserver(() => this.updateBodyOffset(header));
      observer.observe(header);
      this._headerObserver = observer;
    }
  }

  disconnectedCallback() {
    if (this._headerObserver) {
      this._headerObserver.disconnect();
      this._headerObserver = null;
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

  async getPlanLabel(authState) {
    if (!authState?.isSignedIn) return null;
    const contextKey = "authUserContext";
    const storedContext = sessionStorage.getItem(contextKey) || localStorage.getItem(contextKey);
    const user = storedContext ? JSON.parse(storedContext) : null;
    if (!user?.id) return null;
    try {
      const response = await fetch(`/api/subscriptions/user/${user.id}`);
      const data = await response.json();
      if (!response.ok || !data?.plan || data.status !== "success") return null;
      if (data.plan === "individual") return "Individual";
      if (data.plan === "family") return "Family";
      if (data.plan === "organization") return "Organization";
      return null;
    } catch (_) {
      return null;
    }
  }

  getInitialTheme() {
    const THEME_KEY = "sentinelTheme";
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
  }

  toggleTheme() {
    const THEME_KEY = "sentinelTheme";
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "dark" ? "light" : "dark";
    this.applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
    return next;
  }

  getThemeIcon(theme) {
    if (theme === "light") {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.5 17.5l1.57 1.57M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.5 6.5l1.57-1.57" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }

  getThemeLogoPath(theme) {
    return theme === "light"
      ? "./assets/sentinel-mark-light.svg"
      : "./assets/sentinel-mark-dark.svg";
  }

  updateBodyOffset(header) {
    const height = header?.offsetHeight || 66;
    document.documentElement.style.setProperty("--sentinel-nav-offset", `${height + 8}px`);
  }
}

customElements.define("custom-navbar", CustomNavbar);
