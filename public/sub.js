const PLAN_CONFIG = {
  free: {
    label: "Free",
    amount: 0
  },
  individual: {
    label: "Individual",
    amount: 1000
  },
  family: {
    label: "Family",
    amount: 3500
  },
  organization: {
    label: "Organization",
    amount: 5000
  }
};

const API_BASE = window.SENTINEL_API_BASE || "";
const SUPABASE_URL = 'https://bjmliqvtjjntkgxpwwkp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_P3c1Q3lJqNyGYobS5wy-EA_xKDOetei';

const payModal = document.getElementById("payModal");
const payModalClose = document.getElementById("payModalClose");
const payPlanSummary = document.getElementById("payPlanSummary");
const payEmail = document.getElementById("payEmail");
const payName = document.getElementById("payName");
const payPhone = document.getElementById("payPhone");
const payConfirm = document.getElementById("payConfirm");
const payVerify = document.getElementById("payVerify");
const payStatus = document.getElementById("payStatus");
const receiptPanel = document.getElementById("receiptPanel");
const receiptStatus = document.getElementById("receiptStatus");
const receiptMeta = document.getElementById("receiptMeta");
const receiptPlan = document.getElementById("receiptPlan");
const receiptAmount = document.getElementById("receiptAmount");
const receiptRef = document.getElementById("receiptRef");
const receiptNote = document.getElementById("receiptNote");

let selectedPlan = null;
let pendingReference = null;
let currentUser = null;
let currentPlan = null;

function formatAmount(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

function openModal(planKey) {
  selectedPlan = planKey;
  const plan = PLAN_CONFIG[planKey];
  payPlanSummary.textContent = `${plan.label} plan • ${formatAmount(plan.amount)}/month`;
  payStatus.className = "text-xs text-gray-300 hidden";
  payStatus.textContent = "";
  payConfirm.disabled = false;
  payModal.classList.remove("hidden");
  payModal.classList.add("flex");
}

function closeModal() {
  payModal.classList.add("hidden");
  payModal.classList.remove("flex");
}

function showStatus(msg, tone = "neutral") {
  const cls = tone === "error"
    ? "text-xs text-red-400"
    : tone === "success"
      ? "text-xs text-green-400"
      : "text-xs text-gray-300";
  payStatus.className = cls;
  payStatus.textContent = msg;
}

async function initializePaystack(planKey, payload) {
  const response = await fetch(`${API_BASE}/api/paystack/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: planKey, ...payload })
  });
  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error || "Unable to initialize payment.";
    throw new Error(msg);
  }
  return data;
}

async function handleCheckout() {
  if (!selectedPlan) return;
  const email = payEmail.value.trim();
  const name = payName.value.trim();
  const phone = payPhone.value.trim();

  if (!email) {
    showStatus("Please enter a valid email address.", "error");
    return;
  }

  payConfirm.disabled = true;
  showStatus("Initializing payment...");

  try {
  const returnUrl = `${window.location.origin}/success.html`;
    const result = await initializePaystack(selectedPlan, { email, name, phone, return_url: returnUrl });
    pendingReference = result.reference;
    sessionStorage.setItem("sentinel_paystack_ref", result.reference || "");
    sessionStorage.setItem("sentinel_paystack_plan", selectedPlan);
    if (!result?.access_code) {
      throw new Error("Missing Paystack access code.");
    }
    if (typeof Paystack !== "function") {
      throw new Error("Paystack script not loaded.");
    }
    showStatus("Opening Paystack checkout...", "success");
    const popup = new Paystack();
    popup.resumeTransaction(result.access_code);
  } catch (err) {
    const fallback = "Unable to reach the payment server. Check that the backend is running and API base is set.";
    showStatus(err?.message || fallback, "error");
    payConfirm.disabled = false;
  }
}

function renderReceipt({ status, reference, plan, amount, message }) {
  if (!receiptPanel) return;
  receiptPanel.classList.remove("hidden");
  receiptStatus.textContent = status;
  receiptMeta.textContent = message || "";
  receiptPlan.textContent = plan ? PLAN_CONFIG[plan]?.label || plan : "-";
  receiptAmount.textContent = amount ? formatAmount(amount) : "-";
  receiptRef.textContent = reference || "-";
  receiptNote.textContent = "If the status is pending, you can refresh this page after a few seconds.";
}

async function verifyPayment(reference) {
  if (!reference) return null;
  const response = await fetch(`${API_BASE}/api/paystack/verify/${reference}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Verification failed.");
  }
  return data;
}

async function recordSubscription(reference, status, plan, amount) {
  const payload = {
    reference,
    status,
    plan,
    amount,
    user_id: currentUser?.id || null,
    user_email: currentUser?.email || null
  };
  const response = await fetch(`${API_BASE}/api/subscriptions/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Unable to record subscription.");
  return data;
}

function setPlanButtonState(planKey, isCurrent) {
  const button = document.querySelector(`[data-plan="${planKey}"]`);
  if (!button) return;
  if (isCurrent) {
    button.textContent = "Current Plan";
    button.setAttribute("disabled", "disabled");
    button.classList.add("cursor-not-allowed");
  } else {
    button.removeAttribute("disabled");
    button.classList.remove("cursor-not-allowed");
  }
}

async function hydrateCurrentUser() {
  const rawUser = sessionStorage.getItem("authUserContext") || localStorage.getItem("authUserContext");
  const storedUser = rawUser ? JSON.parse(rawUser) : null;
  if (storedUser?.id) currentUser = storedUser;

  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      currentUser = {
        id: data.user.id,
        email: data.user.email || storedUser?.email || ""
      };
    }
  } catch (_) {
    // Fallback to locally stored auth context.
  }

  if (currentUser?.email && payEmail) {
    payEmail.value = currentUser.email;
  }
}

async function hydrateCurrentPlan() {
  if (!currentUser?.id) return;
  try {
    const response = await fetch(`${API_BASE}/api/subscriptions/user/${currentUser.id}`);
    const data = await response.json();
    if (!response.ok || !data?.plan) return;
    currentPlan = data.plan;
    Object.keys(PLAN_CONFIG).forEach(planKey => setPlanButtonState(planKey, planKey === currentPlan));
  } catch (_) {
    // Keep default controls if lookup fails.
  }
}

async function hydrateReceiptFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("reference") || sessionStorage.getItem("sentinel_paystack_ref");
  const plan = sessionStorage.getItem("sentinel_paystack_plan") || null;
  if (!ref) return;

  try {
    const result = await verifyPayment(ref);
    if (result.status === "success") {
      try {
        await recordSubscription(ref, result.status, result.plan || plan, result.amount);
      } catch (err) {
        console.warn("Subscription record failed:", err);
      }
    }
    renderReceipt({
      status: result.status === "success" ? "Payment successful" : "Payment pending",
      reference: ref,
      plan: result.plan || plan,
      amount: result.amount,
      message: result.message
    });
  } catch (err) {
    renderReceipt({
      status: "Verification failed",
      reference: ref,
      plan,
      amount: null,
      message: err?.message || "Unable to verify payment yet."
    });
  }
}

async function handleVerifyClick() {
  const ref = pendingReference || sessionStorage.getItem("sentinel_paystack_ref");
  if (!ref) {
    showStatus("No payment reference available yet.", "error");
    return;
  }
  showStatus("Verifying payment...");
  try {
    const result = await verifyPayment(ref);
    if (result.status === "success") {
      try {
        await recordSubscription(ref, result.status, result.plan || selectedPlan, result.amount);
      } catch (err) {
        console.warn("Subscription record failed:", err);
      }
    }
    renderReceipt({
      status: result.status === "success" ? "Payment successful" : "Payment pending",
      reference: ref,
      plan: result.plan || selectedPlan,
      amount: result.amount,
      message: result.message
    });
    showStatus("Verification complete.", "success");
  } catch (err) {
    showStatus(err?.message || "Unable to verify yet.", "error");
  }
}

document.querySelectorAll("[data-plan]").forEach(btn => {
  btn.addEventListener("click", event => {
    const planKey = event.currentTarget.getAttribute("data-plan");
    if (!planKey || !PLAN_CONFIG[planKey]) return;
    if (planKey === currentPlan) {
      showStatus("This plan is already active.", "success");
      return;
    }
    if (planKey === "free") {
      const freeReference = `FREE-${Date.now()}`;
      recordSubscription(freeReference, "success", "free", 0).catch(() => {});
      renderReceipt({
        status: "Free plan active",
        reference: freeReference,
        plan: "free",
        amount: 0,
        message: "Free tier is active with limited daily alert sends."
      });
      currentPlan = "free";
      Object.keys(PLAN_CONFIG).forEach(key => setPlanButtonState(key, key === currentPlan));
      return;
    }
    if (planKey === "organization") {
      // Organization flow is handled on the contact page for now.
      return;
    }
    openModal(planKey);
  });
});

payModalClose?.addEventListener("click", closeModal);
payConfirm?.addEventListener("click", handleCheckout);
payVerify?.addEventListener("click", handleVerifyClick);
payModal?.addEventListener("click", event => {
  if (event.target === payModal) closeModal();
});

hydrateReceiptFromUrl().catch(() => {});
(async () => {
  await hydrateCurrentUser();
  await hydrateCurrentPlan();
})();
