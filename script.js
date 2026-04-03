// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const navbar = document.getElementById('navbar');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            if (mobileMenu.classList.contains('hidden')) {
                icon.setAttribute('data-lucide', 'menu');
            } else {
                icon.setAttribute('data-lucide', 'x');
            }
            lucide.createIcons();
        }
    });
}

// Navbar scroll effect
if (navbar) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            navbar.classList.add('shadow-md');
            if (currentScroll > lastScroll && currentScroll > 200) {
                // Scrolling down
                navbar.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                navbar.style.transform = 'translateY(0)';
            }
        } else {
            navbar.classList.remove('shadow-md');
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            if (mobileMenu) {
                mobileMenu.classList.add('hidden');
            }
        }
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards
document.querySelectorAll('.group').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
    observer.observe(el);
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.parallax');
    
    parallaxElements.forEach(el => {
        const speed = el.dataset.speed || 0.5;
        el.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// Waitlist Modal Functions
function getWaitlistConfig() {
    const config = window.SENTINEL_CONFIG || {};
    return {
        waitlistEndpoint: (config.waitlistEndpoint || '/api/waitlist').trim()
    };
}

function getCrimeNewsConfig() {
    const config = window.SENTINEL_CONFIG || {};
    const configuredEndpoint = (config.crimeNewsEndpoint || '/api/crime-news').trim();
    const endpointCandidates = [];

    if (configuredEndpoint) {
        endpointCandidates.push(configuredEndpoint);
    }

    if (window.location.protocol === 'file:' || window.location.port !== '3000') {
        endpointCandidates.push('http://127.0.0.1:3000/api/crime-news');
        endpointCandidates.push('http://localhost:3000/api/crime-news');
    }

    return {
        crimeNewsEndpoint: configuredEndpoint,
        crimeNewsEndpoints: [...new Set(endpointCandidates)],
        crimeNewsRefreshMs: Number(config.crimeNewsRefreshMs || 5 * 60 * 1000)
    };
}

function injectCrimeNavigationLinks() {
    const isCrimePage = window.location.pathname.endsWith('/crime.html') || window.location.pathname.endsWith('crime.html');
    const crimeLinkHref = 'crime.html';

    const desktopMenu = document.querySelector('nav .hidden.md\\:flex.items-center.gap-8');
    if (desktopMenu && !desktopMenu.querySelector('[data-crime-link="desktop"]')) {
        const aboutGroup = desktopMenu.querySelector('.relative.group');
        const desktopLink = document.createElement('a');
        desktopLink.href = crimeLinkHref;
        desktopLink.dataset.crimeLink = 'desktop';
        desktopLink.textContent = 'Crime Feed';
        desktopLink.className = isCrimePage
            ? 'text-blue-600 dark:text-blue-400 font-semibold transition-colors'
            : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors';
        desktopMenu.insertBefore(desktopLink, aboutGroup || null);
    }

    const mobileMenuContainer = document.querySelector('#mobile-menu .space-y-4');
    if (mobileMenuContainer && !mobileMenuContainer.querySelector('[data-crime-link="mobile"]')) {
        const detailsBlock = mobileMenuContainer.querySelector('details.group');
        const mobileLink = document.createElement('a');
        mobileLink.href = crimeLinkHref;
        mobileLink.dataset.crimeLink = 'mobile';
        mobileLink.textContent = 'Crime Feed';
        mobileLink.className = isCrimePage
            ? 'block text-blue-600 dark:text-blue-400 font-semibold py-2 transition-colors'
            : 'block text-slate-600 dark:text-slate-300 font-medium py-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors';
        mobileMenuContainer.insertBefore(mobileLink, detailsBlock || null);
    }

    document.querySelectorAll('footer').forEach((footer) => {
        const productList = footer.querySelector('ul.space-y-2.text-sm');
        if (!productList || productList.querySelector('[data-crime-link="footer"]')) {
            return;
        }
        const waitlistItem = Array.from(productList.querySelectorAll('a')).find((link) => link.getAttribute('href') === 'index.html#download')?.parentElement;
        const item = document.createElement('li');
        item.innerHTML = `<a href="${crimeLinkHref}" data-crime-link="footer" class="hover:text-blue-400 transition-colors">Crime Feed</a>`;
        productList.insertBefore(item, waitlistItem || null);
    });
}

const REDIRECT_ALLOWLIST = new Set([
    window.location.origin,
    'https://sentinel-watchtower.com',
    'https://www.sentinel-watchtower.com'
]);

function isAllowedRedirect(targetUrl) {
    if (!targetUrl) {
        return false;
    }
    try {
        const parsed = new URL(targetUrl, window.location.href);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        return REDIRECT_ALLOWLIST.has(parsed.origin);
    } catch (_) {
        return false;
    }
}

function safeRedirect(targetUrl, fallbackUrl = '/') {
    if (isAllowedRedirect(targetUrl)) {
        window.location.href = targetUrl;
        return;
    }
    const fallback = isAllowedRedirect(fallbackUrl) ? fallbackUrl : '/';
    window.location.href = fallback;
}

async function saveWaitlistSignup(payload) {
    const { waitlistEndpoint } = getWaitlistConfig();

    if (!waitlistEndpoint) {
        throw new Error('Waitlist endpoint is not configured yet.');
    }

    const response = await fetch(waitlistEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let message = 'Unable to join waitlist right now.';
        try {
            const err = await response.json();
            if (response.status === 409 || err?.code === '23505') {
                message = 'This email is already on the waitlist.';
            } else if (err?.message) {
                message = err.message;
            }
        } catch (_) {
            // ignore JSON parse errors and keep generic message
        }
        throw new Error(message);
    }

    return null;
}

function openWaitlistModal() {
    const modal = document.getElementById('waitlist-modal');
    const modalContent = document.getElementById('modal-content');
    const successDiv = document.getElementById('waitlist-success');
    const formElement = document.getElementById('waitlist-form-modal');

    if (!modal || !modalContent) {
        safeRedirect('index.html#download');
        return;
    }

    // Always reset modal state before opening.
    formElement?.classList.remove('hidden');
    successDiv?.classList.add('hidden');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Small delay to allow display:flex to apply before opacity transition
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
    }, 10);
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

function closeWaitlistModal() {
    const modal = document.getElementById('waitlist-modal');
    const modalContent = document.getElementById('modal-content');
    if (!modal || !modalContent) {
        return;
    }
    modal.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }, 300);
}

// Close modal when clicking outside
document.getElementById('waitlist-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeWaitlistModal();
    }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeWaitlistModal();
    }
});

// Handle Waitlist Form Submission
async function handleWaitlistSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value.trim();
    const cityInput = form.querySelector('input[type="text"]');
    const city = cityInput ? cityInput.value.trim() : '';
    const consentInput = form.querySelector('input[type="checkbox"][required]');
    const hasConsent = consentInput ? consentInput.checked : true;

    if (!hasConsent) {
        showNotification('Please provide consent to join the waitlist.');
        return;
    }
    
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Joining...';
    submitButton.disabled = true;
    submitButton.classList.add('opacity-75', 'cursor-not-allowed');

    try {
        await saveWaitlistSignup({
            email,
            city: city || null,
            consent: true,
            source_form: form.id || 'unknown',
            updated_at: new Date().toISOString()
        });

        const isModalForm = form.id === 'waitlist-form-modal';
        const successDiv = isModalForm ? document.getElementById('waitlist-success') : null;
        const formElement = isModalForm ? document.getElementById('waitlist-form-modal') : null;

        if (isModalForm && successDiv && formElement) {
            formElement.classList.add('hidden');
            successDiv.classList.remove('hidden');
        }

        showNotification("You're on the waitlist. We'll email you updates.");
        
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-75', 'cursor-not-allowed');
        
        form.reset();
        
        if (isModalForm) {
            setTimeout(() => {
                closeWaitlistModal();
                setTimeout(() => {
                    formElement?.classList.remove('hidden');
                    successDiv?.classList.add('hidden');
                }, 300);
            }, 2000);
        }
    } catch (error) {
        if ((error.message || '').toLowerCase().includes('already on the waitlist')) {
            showNotification("This email is already on the waitlist.");
        } else {
            showNotification(error.message || 'Could not join waitlist. Please try again.');
        }
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

// Add click tracking for waitlist buttons
document.querySelectorAll('button').forEach(button => {
    if (button.textContent.toLowerCase().includes('join waitlist') || 
        button.textContent.toLowerCase().includes('notify me')) {
        button.addEventListener('click', (e) => {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('absolute', 'bg-white/30', 'rounded-full', 'animate-ping', 'pointer-events-none');
            
            button.style.position = 'relative';
            button.style.overflow = 'hidden';
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    }
});

// Notification helper
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl z-50 transform translate-y-full transition-transform duration-300 flex items-center gap-3';
    notification.innerHTML = `
        <i data-lucide="info" class="w-5 h-5 text-blue-400"></i>
        <span class="font-medium">${message}</span>
    `;
    
    document.body.appendChild(notification);
    lucide.createIcons();
    
    setTimeout(() => notification.style.transform = 'translateY(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateY(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatCrimeTimestamp(value) {
    if (!value) {
        return 'Time unavailable';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Time unavailable';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
}

function renderCrimeArticles(articles) {
    return articles.map((article) => {
        const imageMarkup = article.imageUrl
            ? `<img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title)}" class="h-52 w-full object-cover">`
            : `<div class="h-52 w-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
                    <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                        <i data-lucide="shield-alert" class="w-7 h-7 text-blue-300"></i>
                    </div>
               </div>`;

        return `
            <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900">
                ${imageMarkup}
                <div class="p-6 space-y-4">
                    <div class="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        <span>${escapeHtml(article.source)}</span>
                        <span>${escapeHtml(formatCrimeTimestamp(article.publishedAt))}</span>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white leading-snug">${escapeHtml(article.title)}</h3>
                    <p class="text-sm leading-7 text-slate-600 dark:text-slate-300">${escapeHtml(article.description || 'No summary was provided for this story.')}</p>
                    <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50">
                        Read full story
                        <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
                    </a>
                </div>
            </article>
        `;
    }).join('');
}

function initCrimeFeed() {
    const feedRoot = document.getElementById('crime-feed');
    if (!feedRoot) {
        return;
    }

    const statusEl = document.getElementById('crime-feed-status');
    const lastUpdatedEl = document.getElementById('crime-feed-last-updated');
    const countEl = document.getElementById('crime-feed-count');
    const gridEl = document.getElementById('crime-feed-grid');
    const emptyEl = document.getElementById('crime-feed-empty');
    const refreshButton = document.getElementById('crime-refresh-button');
    const { crimeNewsEndpoint, crimeNewsEndpoints, crimeNewsRefreshMs } = getCrimeNewsConfig();

    let isLoading = false;

    async function fetchCrimePayload() {
        const candidates = (crimeNewsEndpoints && crimeNewsEndpoints.length)
            ? crimeNewsEndpoints
            : [crimeNewsEndpoint].filter(Boolean);
        let lastError = null;

        for (const endpoint of candidates) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        Accept: 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('No crime news endpoint is configured.');
    }

    async function loadCrimeNews({ manual = false } = {}) {
        if (isLoading || (!crimeNewsEndpoint && !crimeNewsEndpoints?.length) || !gridEl || !statusEl || !lastUpdatedEl || !countEl || !emptyEl) {
            return;
        }

        isLoading = true;
        statusEl.textContent = manual ? 'Refreshing live feed...' : 'Loading live Nigerian crime stories...';
        refreshButton?.setAttribute('disabled', 'disabled');
        refreshButton?.classList.add('opacity-70', 'cursor-not-allowed');

        if (!gridEl.children.length) {
            gridEl.innerHTML = Array.from({ length: 6 }).map(() => `
                <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div class="skeleton h-52 w-full"></div>
                    <div class="space-y-4 p-6">
                        <div class="skeleton h-3 rounded-full"></div>
                        <div class="skeleton h-6 rounded-full"></div>
                        <div class="skeleton h-20 rounded-2xl"></div>
                    </div>
                </div>
            `).join('');
        }

        try {
            const payload = await fetchCrimePayload();
            const articles = Array.isArray(payload.articles) ? payload.articles : [];

            if (articles.length) {
                gridEl.innerHTML = renderCrimeArticles(articles);
                emptyEl.classList.add('hidden');
            } else {
                gridEl.innerHTML = '';
                emptyEl.classList.remove('hidden');
            }

            countEl.textContent = `${articles.length}`;
            lastUpdatedEl.textContent = formatCrimeTimestamp(payload.fetchedAt || new Date().toISOString());
            statusEl.textContent = articles.length
                ? 'Live feed is active and updating automatically.'
                : 'No matching stories found right now. We will check again automatically.';

            lucide.createIcons();
        } catch (_) {
            statusEl.textContent = 'Live crime news could not be reached. Start the local app server on port 3000 if you are previewing this page statically.';
            gridEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
        } finally {
            isLoading = false;
            refreshButton?.removeAttribute('disabled');
            refreshButton?.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    }

    refreshButton?.addEventListener('click', () => {
        loadCrimeNews({ manual: true });
    });

    loadCrimeNews();
    window.setInterval(() => {
        loadCrimeNews();
    }, Math.max(crimeNewsRefreshMs, 60_000));
}

// Theme Toggle Functionality
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    
    // Store preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Update Lucide icons
    lucide.createIcons();
}

// Initialize theme on page load
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        if (e.matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
});

// Initialize theme immediately
initTheme();
injectCrimeNavigationLinks();
initCrimeFeed();

// Dynamic year in footer
const yearSpan = document.querySelector('footer .text-sm');
if (yearSpan) {
    yearSpan.textContent = yearSpan.textContent.replace('2024', new Date().getFullYear());
}

// Performance optimization: Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
}

// Initialize Lucide icons after dynamic content
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    // Ensure theme icons are correct on load
    initTheme();
});
