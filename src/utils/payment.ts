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

export const initiateRazorpayPayment = async (
  amountRupees: number,
  userEmail: string,
  userName: string,
  receipt: string
): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        alert("Failed to load Razorpay gateway SDK. Please check your internet connection.");
        resolve(false);
        return;
      }

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T7i2gHREMW3YL2';
      const amountInPaise = Math.max(100, amountRupees * 100); // Minimum 100 paise (₹1)

      // Step 1: Attempt backend order creation
      let orderId: string | undefined;
      try {
        const orderRes = await fetch(getPaymentApiUrl('create-order'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
          },
          body: JSON.stringify({ amount: amountInPaise, receipt })
        });
        
        if (!orderRes.ok) {
          let errMsg = 'Failed to create order on server';
          try {
            const errData = await orderRes.json();
            if (errData.error) errMsg = errData.error;
          } catch (_) {}
          alert(`Order creation failed: ${errMsg}. Please check if Razorpay environment variables (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are configured in your Netlify/hosting dashboard.`);
          resolve(false);
          return;
        }

        const orderData = await orderRes.json();
        if (orderData.order_id) {
          orderId = orderData.order_id;
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

      // Step 2: Open Razorpay Standard Checkout Modal
      const options: any = {
        key: razorpayKey,
        amount: amountInPaise,
        currency: 'INR',
        name: 'JEE Nexus AI',
        description: `Official JEE Paper Micro-Unlock (₹${amountRupees})`,
        image: 'https://cdn-icons-png.flaticon.com/512/2083/2083213.png',
        ...(orderId ? { order_id: orderId } : {}),
        handler: async function (response: RazorpayResponse) {
          console.log("Razorpay Payment Response Received:", response);

          // Step 3: Attempt backend signature verification if order_id exists
          if (response.razorpay_order_id && response.razorpay_signature) {
            try {
              const verifyRes = await fetch(getPaymentApiUrl('verify-payment'), {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                })
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || verifyData.status === 'error') {
                alert("Payment verification failed signature check. Access declined.");
                resolve(false);
                return;
              }
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
          name: userName || 'Student Aspirant',
          email: userEmail || 'student@example.com',
          contact: '9812345678'
        },
        theme: {
          color: '#4f46e5'
        }
      };

      if (orderId) {
        options.order_id = orderId;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        console.error("Razorpay Payment Failed Event:", resp.error);
        alert(`Payment Failed: ${resp.error?.description || 'Transaction cancelled or declined'}`);
        resolve(false);
      });
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
    } else {
      return true;
    }
  }

  // 3. Check local storage overrides (fallback if schema sync hasn't run)
  const localTier = localStorage.getItem('user_subscription_tier');
  const localExpiry = localStorage.getItem('user_subscription_expires_at');
  if (localTier === 'premium' || localTier === 'ultimate') {
    if (localExpiry) {
      const expiry = new Date(localExpiry);
      if (expiry > new Date()) return true;
    } else {
      return true;
    }
  }

  return false;
};

