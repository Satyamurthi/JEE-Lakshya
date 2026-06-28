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

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T6jwrmWb1Tu6GG';
      const amountInPaise = Math.max(100, amountRupees * 100); // Minimum 100 paise (₹1)

      // Step 1: Attempt backend order creation
      let orderId: string | undefined;
      try {
        const orderRes = await fetch(getPaymentApiUrl('create-order'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountInPaise, receipt })
        });
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          if (orderData.order_id) {
            orderId = orderData.order_id;
          }
        }
      } catch (e) {
        console.warn("Backend order creation endpoint bypassed/unavailable, initializing Razorpay client modal:", e);
      }

      // Step 2: Open Razorpay Standard Checkout Modal
      const options: any = {
        key: razorpayKey,
        amount: amountInPaise,
        currency: 'INR',
        name: 'JEE Nexus AI',
        description: `Official JEE Paper Micro-Unlock (₹${amountRupees})`,
        image: 'https://cdn-icons-png.flaticon.com/512/2083/2083213.png',
        handler: async function (response: RazorpayResponse) {
          console.log("Razorpay Payment Response Received:", response);

          // Step 3: Attempt backend signature verification if order_id exists
          if (response.razorpay_order_id && response.razorpay_signature) {
            try {
              const verifyRes = await fetch(getPaymentApiUrl('verify-payment'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
          contact: '9999999999'
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
