import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { apiClient } from '../lib/apiClient';
import {
  ShieldCheck, Wifi, User, Globe, ArrowRight, ArrowLeft,
  AlertCircle, Sun, Moon,
} from 'lucide-react';

type Toast = (text: string, type: 'success' | 'error' | 'info') => void;

export const Auth: React.FC<{ addToast: Toast }> = ({ addToast }) => {
  const { registerBusiness, login, allUsers } = useAuth();
  const { t, dir } = useI18n();
  const { theme, toggleTheme, primaryColor, logoUrl } = useTheme();

  // Tab selector: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Registration wizard state (preserved)
  const [step, setStep] = useState(1);
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [industry, setIndustry] = useState('Retail General');
  const [country, setCountry] = useState('Kenya');
  const [currency, setCurrency] = useState('KES');
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('Africa/Nairobi');

  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login state (preserved)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Password policy (kept: 8+ chars, upper, lower, digit)
  const passwordValid = (p: string) =>
    p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);

  // ---- Registration submit (preserved logic + welcome mail dispatch) ----
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName || !ownerName || !ownerPhone || !ownerEmail) {
      addToast(t('auth.err.missingFields', 'Please complete all required fields, including Owner Email.'), 'error');
      return;
    }
    if (!password) {
      addToast(t('auth.err.passwordRequired', 'Password is required for credentials security.'), 'error');
      return;
    }
    if (!passwordValid(password)) {
      addToast(t('auth.err.passwordWeak', 'Password does not meet the strength requirements.'), 'error');
      return;
    }
    if (password !== confirmPassword) {
      addToast(t('auth.err.passwordMismatch', 'Password Confirmation mismatch. Please cross-check.'), 'error');
      return;
    }

    try {
      const registered = await registerBusiness({
        legalName, tradeName, industry, country, currency,
        language, timezone,
        ownerName, ownerPhone, ownerEmail, password,
      });

      addToast(t('auth.ok.onboarded', 'Onboarding Complete: Brand registered and synced to cloud!'), 'success');

      // --- Mailing: welcome + business activation confirmation ---
      // Fire-and-forget so slow SMTP never blocks the UI; offline goes to queue.
      const welcomePayload = {
        to: ownerEmail,
        template: 'owner_welcome',
        locale: language,
        theme: { primary: primaryColor, mode: theme, logoUrl },
        data: {
          ownerName,
          legalName,
          tradeName: tradeName || legalName,
          tenantId: (registered as any)?.tenantId,
        },
      };
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          localStorage.setItem('pending_welcome_email', JSON.stringify(welcomePayload));
        } else {
          apiClient.post('/api/mail/welcome', welcomePayload).catch(() => {
            localStorage.setItem('pending_welcome_email', JSON.stringify(welcomePayload));
          });
          apiClient.post('/api/mail/activation', {
            ...welcomePayload,
            template: 'business_activation',
          }).catch(() => { /* non-fatal */ });
        }
      } catch { /* mailing is best-effort */ }
    } catch (err: any) {
      addToast(err?.message || t('auth.err.registerFailed', 'Registration failed.'), 'error');
    }
  };

  // ---- Login submit (preserved) ----
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername) {
      addToast(t('auth.err.usernameRequired', 'Username is required.'), 'error');
      return;
    }
    const success = await login(loginUsername, loginPass);
    if (success) {
      addToast(t('auth.ok.welcomeBack', 'Welcome back, {name}! Till session active.').replace('{name}', loginUsername), 'success');
    } else {
      addToast(t('auth.err.badCredentials', 'Staff credentials mismatch or database context error.'), 'error');
    }
  };

  // Seeded user quicklinks (preserved sandbox helper)
  const selectSeededUser = (uname: string) => {
    setLoginUsername(uname);
    setLoginPass('Demo@1234');
    addToast(t('auth.ok.demoSelected', 'Demo operator selected: {name}').replace('{name}', uname), 'success');
  };

  // Density + theme utility groups
  const inputCls =
    'w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 ' +
    'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 ' +
    'placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ' +
    'text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand,#2563EB)]/25 ' +
    'focus:border-[color:var(--brand,#2563EB)] transition-colors';
  const labelCls =
    'block text-[11px] font-bold tracking-wide uppercase ' +
    'text-zinc-600 dark:text-zinc-300 mb-1';
  const primaryBtnCls =
    'w-full text-white font-bold text-sm tracking-wide uppercase py-3 rounded-lg ' +
    'shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 ' +
    'bg-[color:var(--brand,#2563EB)] hover:brightness-110';

  return (
    <div
      dir={dir}
      className="min-h-screen flex flex-col justify-between p-3 md:p-5 font-sans
                 bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
      id="auth-onboarding-container"
      style={{ ['--brand' as any]: primaryColor }}
    >
      {/* Brand bar */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <img
            src={logoUrl || 'https://res.cloudinary.com/plj6rk0o/image/upload/v1783949717/og-image_rxcpkm.jpg'}
            alt={t('brand.name', 'BuzzNa')}
            className="w-9 h-9 rounded-lg object-cover shadow-sm border border-zinc-200 dark:border-zinc-700"
            referrerPolicy="no-referrer"
          />
          <span className="font-extrabold tracking-tight text-base uppercase leading-none">
            {t('brand.fullName', 'BuzzNa D74')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t('common.toggleTheme', 'Toggle theme')}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700
                       bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 text-[11px] font-semibold
                          text-emerald-800 dark:text-emerald-300
                          bg-emerald-50 dark:bg-emerald-900/30
                          border border-emerald-100 dark:border-emerald-800/60
                          px-2.5 py-1 rounded-full" id="auth-offline-notice">
            <Wifi className="w-3.5 h-3.5" />
            <span>{t('auth.offlineNotice', 'Works offline. Auto-syncs to Cloud.')}</span>
          </div>
        </div>
      </header>

      {/* Primary card */}
      <main
        className="max-w-md w-full mx-auto my-6 rounded-2xl shadow-md overflow-hidden
                   bg-white dark:bg-zinc-900
                   border border-zinc-200 dark:border-zinc-800"
        id="auth-main-card"
      >
        {/* Tab selector */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => { setAuthMode('login'); setStep(1); }}
            className={`flex-1 py-3 text-center font-bold text-xs tracking-wide uppercase transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-[color:var(--brand,#2563EB)]/10 border-b-2 border-[color:var(--brand,#2563EB)] text-[color:var(--brand,#2563EB)]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100'
            }`}
            style={{ minHeight: 44 }}
            id="auth-tab-login"
          >
            {t('auth.tab.login', 'Staff Login')}
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-3 text-center font-bold text-xs tracking-wide uppercase transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-[color:var(--brand,#2563EB)]/10 border-b-2 border-[color:var(--brand,#2563EB)] text-[color:var(--brand,#2563EB)]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100'
            }`}
            style={{ minHeight: 44 }}
            id="auth-tab-register"
          >
            {t('auth.tab.register', 'Business Registration')}
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6">
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4" id="login-form">
              <div className="text-center mb-2">
                <h2 className="text-base font-extrabold tracking-tight uppercase">
                  {t('auth.login.title', 'Access Operator Panel')}
                </h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  {t('auth.login.subtitle', 'Provide your staff username or PIN to access this terminal')}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelCls}>{t('auth.login.username', 'Username or ID')}</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={t('auth.login.usernamePlaceholder', 'e.g., Mary Kawira')}
                    className={inputCls}
                    id="login-username-input"
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('auth.login.pin', 'Passcode / PIN')}</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder={t('auth.login.pinPlaceholder', 'Enter till pin code')}
                    className={inputCls}
                    id="login-pin-input"
                  />
                </div>
              </div>

              <button type="submit" className={primaryBtnCls} style={{ minHeight: 44 }} id="login-submit-btn">
                <span>{t('auth.login.submit', 'Authorize Session')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {allUsers.length > 0 && (
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold uppercase mb-2">
                    {t('auth.login.demoOperators', 'Demo Operators (Sandbox):')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allUsers.slice(0, 3).map((user) => (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => selectSeededUser(user.username)}
                        className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer
                                   bg-zinc-100 dark:bg-zinc-800 hover:bg-[color:var(--brand,#2563EB)]/10
                                   text-zinc-700 dark:text-zinc-200
                                   hover:text-[color:var(--brand,#2563EB)]
                                   border border-zinc-200 dark:border-zinc-700
                                   hover:border-[color:var(--brand,#2563EB)]/40"
                      >
                        {user.username}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4" id="register-wizard">
              {step === 1 && (
                <div className="space-y-4" id="wizard-step-1">
                  <div className="text-center mb-2">
                    <h2 className="text-base font-extrabold tracking-tight uppercase">
                      {t('auth.reg.step1.title', 'Business Profile')}
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      {t('auth.reg.step1.subtitle', 'Register your legal entity and set vertical defaults')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>{t('auth.reg.legalName', 'Legal Business Name *')}</label>
                      <input
                        type="text" required value={legalName}
                        onChange={(e) => { setLegalName(e.target.value); if (!tradeName) setTradeName(e.target.value); }}
                        placeholder={t('auth.reg.legalNamePh', 'e.g., Kamau Butcheries Ltd')}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>{t('auth.reg.tradeName', 'Trade Name / DBA')}</label>
                      <input
                        type="text" value={tradeName}
                        onChange={(e) => setTradeName(e.target.value)}
                        placeholder={t('auth.reg.tradeNamePh', 'e.g., Kamau Butchery')}
                        className={inputCls}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t('auth.reg.industry', 'Sector Vertical *')}</label>
                        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
                          <option value="Retail General">{t('industry.retail', 'General Retail')}</option>
                          <option value="Butchery Meat">{t('industry.butchery', 'Butchery Shop')}</option>
                          <option value="Mitumba Apparel">{t('industry.mitumba', 'Mitumba Apparel')}</option>
                          <option value="Hardware Store">{t('industry.hardware', 'Hardware / Agrovet')}</option>
                          <option value="Cyber Point">{t('industry.cyber', 'Cyber Cafe / Services')}</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelCls}>{t('auth.reg.country', 'Country *')}</label>
                        <select
                          value={country}
                          onChange={(e) => {
                            const c = e.target.value;
                            setCountry(c);
                            setCurrency(c === 'Tanzania' ? 'TZS' : c === 'Uganda' ? 'UGX' : 'KES');
                            setTimezone(
                              c === 'Tanzania' ? 'Africa/Dar_es_Salaam' :
                              c === 'Uganda' ? 'Africa/Kampala' : 'Africa/Nairobi'
                            );
                          }}
                          className={inputCls}
                        >
                          <option value="Kenya">{t('country.ke', 'Kenya (KES)')}</option>
                          <option value="Tanzania">{t('country.tz', 'Tanzania (TZS)')}</option>
                          <option value="Uganda">{t('country.ug', 'Uganda (UGX)')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t('auth.reg.language', 'Language')}</label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
                          <option value="en">{t('lang.en', 'English')}</option>
                          <option value="sw">{t('lang.sw', 'Kiswahili')}</option>
                          <option value="fr">{t('lang.fr', 'Français')}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t('auth.reg.timezone', 'Timezone')}</label>
                        <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!legalName) {
                        addToast(t('auth.err.legalNameRequired', 'Legal business name is required.'), 'error');
                        return;
                      }
                      setStep(2);
                    }}
                    className={primaryBtnCls}
                    style={{ minHeight: 44 }}
                  >
                    <span>{t('auth.reg.next', 'Proceed to Owner Setup')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4" id="wizard-step-2">
                  <div className="text-center mb-2">
                    <h2 className="text-base font-extrabold tracking-tight uppercase">
                      {t('auth.reg.step2.title', 'Owner Credentials')}
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      {t('auth.reg.step2.subtitle', 'Specify credentials for the principal administrator')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>{t('auth.reg.ownerName', 'Owner Legal Name *')}</label>
                      <input type="text" required value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder={t('auth.reg.ownerNamePh', 'e.g., Mary Kawira')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('auth.reg.ownerPhone', 'Safaricom Phone Number *')}</label>
                      <input type="tel" required value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder={t('auth.reg.ownerPhonePh', 'e.g., +254790435584')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('auth.reg.ownerEmail', 'Primary Email Address *')}</label>
                      <input type="email" required value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder={t('auth.reg.ownerEmailPh', 'e.g., mary@gmail.com')} className={inputCls} />
                    </div>

                    <div className="p-2.5 rounded-lg border
                                    bg-amber-50 border-amber-200
                                    dark:bg-amber-900/20 dark:border-amber-800/60">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-300 mt-0.5 flex-shrink-0" />
                        <div className="text-[11px] text-amber-800 dark:text-amber-200">
                          <p className="font-bold">{t('auth.reg.pwdReq.title', 'Password Requirements:')}</p>
                          <ul className="mt-1 space-y-0.5 text-[10px]">
                            <li>• {t('auth.reg.pwdReq.len', 'At least 8 characters')}</li>
                            <li>• {t('auth.reg.pwdReq.upper', 'One uppercase letter')}</li>
                            <li>• {t('auth.reg.pwdReq.lower', 'One lowercase letter')}</li>
                            <li>• {t('auth.reg.pwdReq.digit', 'One number')}</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t('auth.reg.password', 'Password *')}</label>
                        <input type="password" required value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{t('auth.reg.confirm', 'Confirm Password *')}</label>
                        <input type="password" required value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••" className={inputCls} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 font-bold text-xs tracking-wide uppercase py-2.5 rounded-lg
                                 bg-zinc-100 dark:bg-zinc-800
                                 hover:bg-zinc-200 dark:hover:bg-zinc-700
                                 text-zinc-700 dark:text-zinc-200
                                 border border-zinc-200 dark:border-zinc-700
                                 transition-all cursor-pointer flex items-center justify-center gap-1"
                      style={{ minHeight: 44 }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t('common.back', 'Back')}</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 font-bold text-xs tracking-wide uppercase py-2.5 rounded-lg
                                 text-white shadow-sm transition-all cursor-pointer
                                 flex items-center justify-center gap-2
                                 bg-emerald-600 hover:bg-emerald-700
                                 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                      style={{ minHeight: 44 }}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{t('auth.reg.submit', 'Register Business')}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto w-full text-center py-4 border-t border-zinc-200 dark:border-zinc-800 mt-4">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {t('auth.footer.security', 'BuzzNa D74 Cloud OS is secured with end-to-end multi-tenant Row-Level Security guards.')}
        </p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-1">
          {t('auth.footer.support', 'Support: support@buzznad74.com | WhatsApp: +254790435584 | Email: buzznad74@gmail.com')}
        </p>
      </footer>
    </div>
  );
};

export default Auth;
