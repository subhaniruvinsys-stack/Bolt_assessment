import { CheckCircle2, ShoppingBag, Sparkles, IndianRupee } from 'lucide-react';

interface OrderSummaryPanelProps {
  user: { firstName: string; lastName: string; email: string } | null;
  recognizeLoading: boolean;
  onLogout?: () => void;
}

export const OrderSummaryPanel: React.FC<OrderSummaryPanelProps> = ({
  user,
  recognizeLoading,
  onLogout,
}) => {
  return (
    <div className="glass-card rounded-2xl p-6 sticky top-8 space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-text-primary">Order Summary</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-hover text-text-secondary border border-border">
          2 items
        </span>
      </div>

      {/* Shopper Recognition Card */}
      {recognizeLoading ? (
        <div className="p-3.5 bg-surface-hover rounded-xl border border-border animate-pulse space-y-2">
          <div className="h-4 bg-border rounded w-1/3"></div>
          <div className="h-3 bg-border rounded w-2/3"></div>
        </div>
      ) : user ? (
        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/15 animate-slide-down flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-text-primary">
                  {user.firstName} {user.lastName}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider border border-emerald-500/15">
                  <Sparkles className="w-2.5 h-2.5" /> Bolt Recognized
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{user.email}</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-xs text-text-muted hover:text-text-secondary font-medium transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      ) : null}

      {/* Product List */}
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-surface-hover rounded-lg flex items-center justify-center text-2xl border border-border">
              👕
            </div>
            <div>
              <p className="font-semibold text-text-primary">Classic Cotton Tee</p>
              <p className="text-xs text-text-muted">Size: M | Color: Navy</p>
            </div>
          </div>
          <span className="font-mono-num font-bold text-text-primary">₹2,999</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-surface-hover rounded-lg flex items-center justify-center text-2xl border border-border">
              🧢
            </div>
            <div>
              <p className="font-semibold text-text-primary">Minimalist Cap</p>
              <p className="text-xs text-text-muted">Color: Charcoal</p>
            </div>
          </div>
          <span className="font-mono-num font-bold text-text-primary">₹1,499</span>
        </div>
      </div>

      {/* Subtotal Calculation */}
      <div className="border-t border-border pt-4 space-y-2.5 text-sm text-text-secondary">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-mono-num font-medium text-text-primary">₹4,498</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="font-mono-num font-medium text-success">FREE</span>
        </div>
        <div className="flex justify-between">
          <span>GST (18%)</span>
          <span className="font-mono-num font-medium text-text-primary">₹809</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between items-center">
          <span className="font-bold text-base text-text-primary">Total</span>
          <span className="font-mono-num font-bold text-xl gradient-text flex items-center gap-0.5">
            <IndianRupee className="w-4 h-4 text-indigo-400" />5,307
          </span>
        </div>
      </div>

      <div className="p-3 bg-surface-hover rounded-xl text-xs text-text-muted flex items-center gap-2 border border-border">
        <span className="text-base">🔒</span>
        <span>256-bit SSL Encrypted · Idempotent Checkout · Razorpay Secure</span>
      </div>
    </div>
  );
};
