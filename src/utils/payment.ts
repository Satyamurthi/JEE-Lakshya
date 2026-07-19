import { getPaymentApiUrl } from '../supabase';

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initiate a Razorpay payment flow.
 * All payment details (user_id, user_email, plan_id, amount, stream) are
 * sent to the backend so every transaction is persisted in payment_logs.
 */
export const initiateRazorpayPayment = async (
  amountRupees: number,
  userEmail: string,
  userName: string,
  receipt: string,
  options?: {
    userId?: string;
    planId?: string;
    planName?: string;
    stream?: string;
  }
): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        alert("Failed to load Razorpay gateway SDK. Please check your internet connection.");
        resolve(false);
        return;
      }

      const razorpayKey = (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_live_T7ivdfyBiKsv73';
      const amountInPaise = Math.max(100, amountRupees * 100); // Minimum 100 paise (₹1)

      // Ensure receipt is under Razorpay's 40-character limit
      let sanitizedReceipt = receipt;
      if (sanitizedReceipt.length > 40) {
        const parts = sanitizedReceipt.split('_');
        const prefix = parts[0] || 'rcpt';
        const timePart = Date.now().toString().slice(-8);
        const randomPart = Math.random().toString(36).substring(2, 6);
        sanitizedReceipt = `${prefix}_${timePart}_${randomPart}`.substring(0, 40);
      }

      // Resolve user profile for metadata
      let userId = options?.userId || '';
      try {
        if (!userId) {
          const profileRaw = localStorage.getItem('user_profile');
          if (profileRaw) {
            const p = JSON.parse(profileRaw);
            userId = p.id || '';
          }
        }
      } catch (_) {}

      const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
      const planId   = options?.planId   || '';
      const planName = options?.planName || '';
      const stream   = options?.stream   || activeStream;

      // ── Step 1: Create Razorpay order on backend ──────────────────────────
      let orderId: string | undefined;
      let serverKeyId: string | undefined;
      try {
        const paymentUrl = await getPaymentApiUrl('create-order');
        const orderRes = await fetch(paymentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount:     amountInPaise,
            receipt:    sanitizedReceipt,
            // Metadata for DB logging
            user_id:    userId,
            user_email: userEmail,
            user_name:  userName,
            plan_id:    planId,
            plan_name:  planName,
            stream:     stream
          })
        });

        if (!orderRes.ok) {
          let errMsg = 'Failed to create order on server';
          let detailsMsg = '';
          try {
            const errData = await orderRes.json();
            if (errData.error) errMsg = errData.error;
            if (errData.details?.error?.description) {
              detailsMsg = ` Reason: ${errData.details.error.description}`;
            } else if (errData.details) {
              detailsMsg = ` Details: ${JSON.stringify(errData.details)}`;
            }
          } catch (_) {}
          alert(`Order creation failed: ${errMsg}.${detailsMsg}`);
          resolve(false);
          return;
        }

        const orderData = await orderRes.json();
        if (orderData.order_id) {
          orderId     = orderData.order_id;
          serverKeyId = orderData.key_id;
        } else {
          alert("Payment gateway returned an invalid order ID. Please try again.");
          resolve(false);
          return;
        }
      } catch (e: any) {
        console.warn("Backend order creation failed:", e);
        alert(`Could not connect to payment server: ${e.message || e}. Please ensure the server is running.`);
        resolve(false);
        return;
      }

      // ── Step 2: Open Razorpay Checkout Modal ─────────────────────────────
      const rzpOptions: any = {
        key: serverKeyId || razorpayKey,
        amount: amountInPaise,
        currency: 'INR',
        name: 'JEE Nexus AI',
        description: `${planName || 'Subscription'} (₹${amountRupees})`,
        image: 'https://cdn-icons-png.flaticon.com/512/2083/2083213.png',
        order_id: orderId,
        handler: async function (response: RazorpayResponse) {
          console.log("Razorpay Payment Response Received:", response);

          // ── Step 3: Verify + log payment on backend ──────────────────────
          if (response.razorpay_order_id && response.razorpay_signature) {
            try {
              const verifyUrl = await getPaymentApiUrl('verify-payment');
              const verifyRes = await fetch(verifyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_signature:  response.razorpay_signature,
                  // Full metadata for payment_logs table
                  user_id:    userId,
                  user_email: userEmail,
                  user_name:  userName,
                  amount:     amountInPaise,
                  plan_id:    planId,
                  plan_name:  planName,
                  stream:     stream
                })
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || verifyData.status === 'error') {
                alert("Payment verification failed signature check. Access declined.");
                resolve(false);
                return;
              }
              console.log("[Payment] Logged to DB with ID:", verifyData.payment_log_id);
            } catch (vErr) {
              console.warn("Signature verification endpoint bypass:", vErr);
            }
          }

          resolve(true);
        },
        modal: {
          ondismiss: function () {
            console.log("Razorpay Checkout Modal Closed by User");
            resolve(false);
          }
        },
        prefill: {
          name:    userName  || 'Student Aspirant',
          email:   userEmail || 'student@example.com',
          contact: '9812345678'
        },
        theme: { color: '#4f46e5' }
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay checkout launch error:", err);
      alert("Encountered an error opening Razorpay Checkout modal.");
      resolve(false);
    }
  });
};

/**
 * Checks if the current user profile or local storage has an active premium/ultimate subscription.
 */
export const checkSubscriptionActive = (profile: any): boolean => {
  if (!profile) return false;

  // 1. Bypass check for admin, super_admin, or students affiliated with a coaching center (admin_id set)
  if (profile.role === 'admin' || profile.role === 'super_admin' || profile.admin_id) {
    return true;
  }

  // 2. Check profile fields in database/synced user profile
  if (profile.subscription_tier === 'premium' || profile.subscription_tier === 'ultimate') {
    if (profile.subscription_expires_at) {
      const expiry = new Date(profile.subscription_expires_at);
      if (expiry > new Date()) return true;
    }
  }

  // 3. Check local storage overrides (fallback if schema sync hasn't run)
  const localTier   = localStorage.getItem('user_subscription_tier');
  const localExpiry = localStorage.getItem('user_subscription_expires_at');
  if (localTier === 'premium' || localTier === 'ultimate') {
    if (localExpiry) {
      const expiry = new Date(localExpiry);
      if (expiry > new Date()) return true;
    }
  }

  return false;
};
