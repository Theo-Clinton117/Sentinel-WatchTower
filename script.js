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
