import { Zap, ShieldCheck, Fingerprint, RefreshCcw, ArrowRight, Sparkles, IndianRupee } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: 'register' | 'checkout' | 'admin') => void;
}

export const HomePage: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl animate-float-delay" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-pink-600/8 blur-3xl animate-float-slow" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-text-primary tracking-tight">Bolt Checkout</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('admin')}
            className="hidden sm:block text-xs font-semibold text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors"
          >
            Superadmin Portal 🛡️
          </button>
          <button
            onClick={() => onNavigate('register')}
            className="hidden sm:block text-sm font-medium text-text-secondary hover:text-text-primary transition-colors px-4 py-2 rounded-lg hover:bg-surface-hover"
          >
            Register
          </button>
          <button
            onClick={() => onNavigate('checkout')}
            className="text-sm font-semibold text-white btn-gradient px-5 py-2.5 rounded-xl"
          >
            Go to Checkout
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 sm:px-10 lg:px-16 pt-20 sm:pt-28 lg:pt-36 pb-20 max-w-6xl mx-auto">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-text-secondary animate-slide-down">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>OTP-Based Shopper Recognition</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold">Demo</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <span className="text-text-primary">One-Click Checkout</span>
            <br />
            <span className="gradient-text font-serif-heading font-bold">Powered by OTP</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-text-secondary leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Register once, get recognized everywhere. Type your email at checkout and we'll know it's you — verify with a 6-digit code and skip the forms.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto btn-gradient text-white font-bold text-base px-8 py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              Register as Shopper <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('checkout')}
              className="w-full sm:w-auto text-text-secondary hover:text-text-primary font-semibold text-base px-8 py-4 rounded-2xl border border-border hover:border-text-muted hover:bg-surface-hover transition-all flex items-center justify-center gap-2"
            >
              <IndianRupee className="w-4 h-4" /> Try Checkout Demo
            </button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 px-6 sm:px-10 lg:px-16 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="group glass-card rounded-2xl p-7 hover:border-indigo-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:bg-indigo-500/20 transition-colors">
              <Fingerprint className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Instant Recognition</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              As you type your email, a background debounced request checks if you're a known shopper — no form submission needed.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group glass-card rounded-2xl p-7 hover:border-purple-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition-colors">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Secure 6-Digit OTP</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Cryptographic <code className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-indigo-400 font-mono-num">crypto/rand</code> generated codes with 10-minute expiry, rate limiting, and single-use protection.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group glass-card rounded-2xl p-7 hover:border-pink-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/5 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-5 group-hover:bg-pink-500/20 transition-colors">
              <RefreshCcw className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Idempotent Checkout</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Every order submission includes an <code className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-indigo-400 font-mono-num">Idempotency-Key</code> header — no duplicate charges on retry or double-click.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack Footer */}
      <footer className="relative z-10 border-t border-border-subtle px-6 sm:px-10 lg:px-16 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            Built with <span className="text-text-secondary font-medium">Go + React + Supabase</span> · Bolt Assessment Demo
          </p>
          <div className="flex items-center gap-2">
            {['Go', 'React', 'PostgreSQL', 'Razorpay'].map((tech) => (
              <span key={tech} className="px-2.5 py-1 rounded-lg bg-surface text-text-muted text-xs font-medium border border-border">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
