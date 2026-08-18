import { useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Copy, Check, ArrowRight, UserPlus, ShieldCheck, Zap, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onNavigateToCheckout: () => void;
  onNavigateHome: () => void;
}

export const RegisterPage: React.FC<RegisterProps> = ({ onNavigateToCheckout, onNavigateHome }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) {
      toast.error('Validation Error', { description: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    setGeneratedCode(null);

    try {
      const res = await api.register(email, firstName, lastName);
      setGeneratedCode(res.code);
      toast.success('Registration successful!', {
        description: 'Save your 6-digit code below to log in at checkout.',
      });
    } catch (err: any) {
      toast.error('Registration failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.info('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-600/8 blur-3xl animate-float" />
        <div className="absolute bottom-20 -left-32 w-72 h-72 rounded-full bg-purple-600/8 blur-3xl animate-float-delay" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 border-b border-border-subtle">
        <button onClick={onNavigateHome} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-text-primary tracking-tight">Bolt Checkout</span>
        </button>
        <button onClick={onNavigateHome} className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </nav>

      <div className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 space-y-6 animate-slide-up">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Create Bolt Shopper Account</h1>
            <p className="text-sm text-text-secondary">
              Register once to enable automatic shopper recognition at checkout.
            </p>
          </div>

          {generatedCode ? (
            <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/15 text-center space-y-4 animate-slide-down">
              <div className="flex items-center justify-center gap-1.5 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> Your 6-Digit OTP Code
              </div>

              <div className="bg-canvas py-4 px-6 rounded-xl border border-border flex items-center justify-between">
                <span className="font-mono-num text-3xl font-extrabold tracking-[0.3em] gradient-text">
                  {generatedCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 text-text-muted hover:text-indigo-400 rounded-lg hover:bg-surface-hover transition-colors"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Use this code during checkout when your email (<span className="font-semibold text-text-primary">{email}</span>) is recognized.
              </p>

              <button
                onClick={onNavigateToCheckout}
                className="w-full py-3.5 px-4 btn-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.smith@example.com"
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 btn-gradient text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registering...' : 'Register & Generate Code'}
              </button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-border">
            <button
              onClick={onNavigateToCheckout}
              className="text-xs font-medium text-text-muted hover:text-indigo-400 transition-colors"
            >
              Already have a code? Go straight to Checkout →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
