import { useState, useEffect, useRef } from 'react';
import { api, type ShippingAddress, type Product } from '../lib/api';
import { OrderSummaryPanel, type CartItem } from '../components/OrderSummaryPanel';
import { OtpModal } from '../components/OtpModal';
import { toast } from 'sonner';
import { CheckCircle2, Sparkles, UserCheck, Zap, ArrowLeft, IndianRupee, CreditCard, ShieldCheck, Plus } from 'lucide-react';

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface CheckoutProps {
  onNavigateToRegister: () => void;
  onNavigateHome: () => void;
  onNavigateAdmin?: () => void;
}

export const CheckoutPage: React.FC<CheckoutProps> = ({ onNavigateToRegister, onNavigateHome, onNavigateAdmin }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
  });

  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
  const [recognizeLoading, setRecognizeLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Dynamic Store Catalog & Cart State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const idempotencyKeyRef = useRef<string>(`key_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // Fetch catalog products from DB on mount
  useEffect(() => {
    api.getProducts()
      .then((res) => {
        const list = res.products || [];
        setProducts(list);
        if (list.length >= 2) {
          setCart([
            { product: list[0], quantity: 1 },
            { product: list[1], quantity: 1 },
          ]);
        } else if (list.length > 0) {
          setCart([{ product: list[0], quantity: 1 }]);
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success('Added to Cart', { description: product.name });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gst;
  const totalPaise = totalAmount * 100;

  // Check current session on mount
  useEffect(() => {
    api.me()
      .then((res) => {
        if (res.authenticated) {
          setUser({ firstName: res.firstName, lastName: res.lastName, email: res.email });
          setEmail(res.email);
        }
      })
      .catch(() => {});
  }, []);

  // Debounced email recognition
  useEffect(() => {
    if (user && user.email === email) return;
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) return;

    setRecognizeLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.recognize(email);
        if (res.recognized) setIsModalOpen(true);
      } catch (err) {
        console.error('Recognize failed:', err);
      } finally {
        setRecognizeLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email, user]);

  const handleOtpSuccess = (firstName: string, lastName: string, userEmail: string) => {
    setUser({ firstName, lastName, email: userEmail });
    setIsModalOpen(false);
    setAddress((prev) => ({
      ...prev,
      fullName: prev.fullName || `${firstName} ${lastName}`,
    }));
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      toast.info('Signed out of Bolt Checkout');
    } catch (err) {}
  };

  const openRazorpay = async () => {
    if (!email || !phone || !address.street || !address.city || !address.zipCode) {
      toast.error('Missing fields', { description: 'Please complete all required shipping fields' });
      return;
    }

    setSubmitting(true);
    const loaded = await loadRazorpayScript();

    if (!loaded) {
      toast.error('Razorpay SDK failed to load');
      setSubmitting(false);
      return;
    }

    const options = {
      key: RAZORPAY_KEY,
      amount: totalPaise > 0 ? totalPaise : 530700,
      currency: 'INR',
      name: 'Bolt Checkout',
      description: `Bolt Order — ${cart.length} item(s) from catalog`,
      image: '',
      handler: async (response: { razorpay_payment_id: string }) => {
        setPaymentId(response.razorpay_payment_id);
        try {
          const res = await api.checkout(
            {
              email,
              phone,
              shippingAddress: address,
              items: cart.map((i) => ({
                productId: i.product.id,
                name: i.product.name,
                price: i.product.price,
                quantity: i.quantity,
              })),
              razorpayPaymentId: response.razorpay_payment_id,
              totalAmount: totalAmount,
            },
            idempotencyKeyRef.current
          );
          setOrderCompleted(res.orderId);
          toast.success(res.duplicate ? 'Order Already Placed' : 'Payment Successful!', {
            description: `Order ID: ${res.orderId}`,
            duration: 8000,
          });
        } catch (err: any) {
          toast.error('Checkout error', { description: err.message });
        } finally {
          setSubmitting(false);
        }
      },
      prefill: {
        name: address.fullName || (user ? `${user.firstName} ${user.lastName}` : ''),
        email: email,
        contact: phone,
      },
      theme: {
        color: '#6366F1',
        backdrop_color: 'rgba(0,0,0,0.8)',
      },
      modal: {
        ondismiss: () => setSubmitting(false),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (orderCompleted) {
    return (
      <div className="min-h-screen py-16 px-4 flex justify-center items-center relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-600/5 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-lg glass-card rounded-3xl p-8 text-center space-y-6 animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto animate-glow">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-text-primary font-serif-heading">Payment Successful!</h1>
            <p className="text-sm text-text-secondary">
              Your order has been confirmed. Confirmation sent to{' '}
              <span className="font-semibold text-indigo-400">{email}</span>
            </p>
          </div>

          <div className="p-4 bg-surface rounded-2xl border border-border text-left text-xs font-mono-num space-y-1.5">
            <div className="text-text-muted uppercase tracking-wider font-sans font-bold text-[10px]">Order Details</div>
            <div className="text-text-secondary">Order ID: <span className="font-bold text-text-primary">{orderCompleted}</span></div>
            {paymentId && (
              <div className="text-text-secondary">Razorpay ID: <span className="font-bold text-text-primary">{paymentId}</span></div>
            )}
            <div className="text-text-secondary">Amount: <span className="font-bold text-success">₹{totalAmount.toLocaleString()}</span></div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 btn-gradient text-white font-semibold rounded-xl"
          >
            Start New Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 right-0 w-72 h-72 rounded-full bg-indigo-600/5 blur-3xl animate-float" />
        <div className="absolute bottom-0 -left-20 w-60 h-60 rounded-full bg-purple-600/5 blur-3xl animate-float-delay" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-10 lg:px-16 py-5 border-b border-border-subtle">
        <button onClick={onNavigateHome} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Bolt Checkout</h1>
            <p className="text-[10px] text-text-muted -mt-0.5">OTP Shopper Recognition</p>
          </div>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onNavigateHome} className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
          </button>
          <button
            onClick={onNavigateToRegister}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors"
          >
            Register →
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Form Panel */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={(e) => { e.preventDefault(); openRazorpay(); }} className="space-y-6">
              {/* Step 1: Contact */}
              <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs flex items-center justify-center font-bold">1</span>
                    Contact Information
                  </h2>
                  {user && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/15">
                      <UserCheck className="w-3.5 h-3.5" /> Recognized
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.smith@example.com"
                      className={`w-full px-4 py-3 rounded-xl text-sm ${
                        user ? 'input-dark border-emerald-500/30 bg-emerald-500/5' : 'input-dark'
                      }`}
                    />
                    {recognizeLoading && (
                      <div className="absolute right-3 top-3.5 text-xs text-indigo-400 font-medium animate-pulse flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" /> Checking...
                      </div>
                    )}
                  </div>
                  {user ? (
                    <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Welcome back {user.firstName}! Code verified.
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted mt-1">Enter a registered email for OTP recognition.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                  />
                </div>
              </div>

              {/* Step 2: Address */}
              <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="border-b border-border pb-3">
                  <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs flex items-center justify-center font-bold">2</span>
                    Shipping Address
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Full Name</label>
                  <input type="text" required value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} placeholder="Alex Smith" className="w-full px-4 py-3 rounded-xl input-dark text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Street Address</label>
                  <input type="text" required value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder="123 MG Road, Indiranagar" className="w-full px-4 py-3 rounded-xl input-dark text-sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">City</label>
                    <input type="text" required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="Bengaluru" className="w-full px-4 py-3 rounded-xl input-dark text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">State</label>
                    <input type="text" required value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder="Karnataka" className="w-full px-4 py-3 rounded-xl input-dark text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">PIN Code</label>
                    <input type="text" required value={address.zipCode} onChange={(e) => setAddress({ ...address, zipCode: e.target.value })} placeholder="560038" className="w-full px-4 py-3 rounded-xl input-dark text-sm" />
                  </div>
                </div>
              </div>

              {/* Step 3: Dynamic Store Catalog */}
              <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="border-b border-border pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-400 text-xs flex items-center justify-center font-bold">3</span>
                    Store Collection (Dynamic Supabase Catalog)
                  </h2>
                  {onNavigateAdmin && (
                    <button
                      type="button"
                      onClick={onNavigateAdmin}
                      className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Superadmin Portal
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((item) => {
                    const inCart = cart.find((i) => i.product.id === item.id);
                    return (
                      <div key={item.id} className="p-3 bg-surface hover:bg-surface-hover rounded-xl border border-border flex items-center justify-between transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{item.imageEmoji || '📦'}</span>
                          <div>
                            <p className="font-bold text-xs text-text-primary">{item.name}</p>
                            <p className="text-[10px] text-text-muted">₹{item.price.toLocaleString()}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add {inCart ? `(${inCart.quantity})` : ''}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pay Button */}
              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full py-4 px-6 btn-gradient text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-5 h-5" />
                {submitting ? 'Processing Order...' : `Pay ₹${totalAmount.toLocaleString()} with Razorpay`}
              </button>

              <p className="text-center text-xs text-text-muted flex items-center justify-center gap-1.5">
                <IndianRupee className="w-3 h-3" /> Powered by Razorpay Test Mode · No real charges
              </p>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-5">
            <OrderSummaryPanel
              user={user}
              recognizeLoading={recognizeLoading}
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      <OtpModal isOpen={isModalOpen} email={email} onSuccess={handleOtpSuccess} onSkip={() => setIsModalOpen(false)} />
    </div>
  );
};
