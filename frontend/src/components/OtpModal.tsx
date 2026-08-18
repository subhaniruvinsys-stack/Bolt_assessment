import { useState, useEffect } from 'react';
import { OtpBoxInput } from './OtpBoxInput';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { ShieldCheck, RefreshCw, X } from 'lucide-react';

interface OtpModalProps {
  isOpen: boolean;
  email: string;
  onSuccess: (firstName: string, lastName: string, email: string) => void;
  onSkip: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({ isOpen, email, onSuccess, onSkip }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCode('');
    setErrorMsg(null);
    setRemainingAttempts(null);
    setSecondsLeft(600);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (codeToSubmit: string = code) => {
    if (codeToSubmit.length !== 6) {
      setErrorMsg('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login(email, codeToSubmit);
      toast.success(`Welcome back, ${res.firstName}!`, {
        description: 'You are now signed in to Bolt Checkout.',
      });
      onSuccess(res.firstName, res.lastName, res.email);
    } catch (err: any) {
      const msg = err.message || 'Invalid code';
      setErrorMsg(msg);
      if (msg.includes('remainingAttempts')) {
        setRemainingAttempts(err.remainingAttempts ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMsg(null);
    try {
      const res = await api.resendCode(email);
      setSecondsLeft(600);
      setCode('');
      toast.info('New verification code generated!', {
        description: `Your code is: ${res.code}`,
        duration: 8000,
      });
    } catch (err: any) {
      toast.error('Failed to resend code', { description: err.message });
    } finally {
      setResending(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-card rounded-2xl shadow-2xl overflow-hidden animate-slide-down">
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2 text-indigo-400">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold text-sm tracking-wide uppercase text-text-secondary">Recognized Shopper</span>
          </div>
          <button
            onClick={onSkip}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 text-center space-y-5">
          <div>
            <h3 className="text-xl font-bold text-text-primary">Welcome Back</h3>
            <p className="text-sm text-text-secondary mt-1">
              Enter the 6-digit code for <span className="font-semibold text-indigo-400">{email}</span>
            </p>
          </div>

          {/* OTP Box Input */}
          <div className={errorMsg ? 'animate-shake' : ''}>
            <OtpBoxInput
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
              disabled={loading || secondsLeft === 0}
              hasError={!!errorMsg}
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="text-sm font-medium text-error bg-error/5 py-2 px-3 rounded-lg border border-error/15">
              {errorMsg}
              {remainingAttempts !== null && (
                <span className="block text-xs text-error/70 mt-0.5">
                  {remainingAttempts} attempt(s) remaining before temporary lockout.
                </span>
              )}
            </div>
          )}

          {/* Expiry & Resend */}
          <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
            <span>
              Code expires in:{' '}
              <span className="font-mono-num font-semibold text-indigo-400">
                {secondsLeft > 0 ? formatTime(secondsLeft) : 'Expired'}
              </span>
            </span>
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              Resend Code
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleVerify()}
              disabled={loading || code.length !== 6 || secondsLeft === 0}
              className="w-full py-3.5 px-4 btn-gradient text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              onClick={onSkip}
              className="w-full py-2 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
            >
              Skip for now (Continue as guest)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
