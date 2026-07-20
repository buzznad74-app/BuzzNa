import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Wifi, Cpu, Landmark, User, Globe, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

export const Auth: React.FC<{ addToast: (text: string, type: 'success' | 'error') => void }> = ({ addToast }) => {
  const { registerBusiness, login, allUsers } = useAuth();
  
  // Tab selector: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Registration States
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

  // Login States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Handle Wizard Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName || !ownerName || !ownerPhone || !ownerEmail) {
      addToast('Please complete all required fields, including Owner Email.', 'error');
      return;
    }

    if (!password) {
      addToast('Password is required for credentials security.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Password Confirmation mismatch. Please cross-check.', 'error');
      return;
    }

    try {
      await registerBusiness({
        legalName,
        tradeName,
        industry,
        country,
        currency,
        language,
        timezone,
        ownerName,
        ownerPhone,
        ownerEmail,
        password
      });
      addToast('Onboarding Complete: Brand registered and synced to cloud!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Registration failed.', 'error');
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername) {
      addToast('Username is required.', 'error');
      return;
    }

    const success = await login(loginUsername, loginPass);
    if (success) {
      addToast(`Welcome back, ${loginUsername}! Till session active.`, 'success');
    } else {
      addToast('Staff credentials mismatch or database context error.', 'error');
    }
  };

  // Select seeded user for fast login click (Developer sandbox assist)
  const selectSeededUser = (uname: string) => {
    setLoginUsername(uname);
    setLoginPass('Demo@1234');
    addToast(`Demo operator selected: ${uname}`, 'success');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-4 md:p-6 font-sans text-zinc-900" id="auth-onboarding-container">
      {/* Upper Brand bar */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <img 
            src="https://res.cloudinary.com/plj6rk0o/image/upload/v1783949717/og-image_rxcpkm.jpg" 
            alt="BuzzNa" 
            className="w-10 h-10 rounded-xl object-cover shadow-sm border border-zinc-200"
            referrerPolicy="no-referrer"
          />
          <span className="font-extrabold tracking-tight text-lg text-zinc-950 uppercase leading-none">BuzzNa D74</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full" id="auth-offline-notice">
          <Wifi className="w-3.5 h-3.5" />
          <span>Works offline. Auto-syncs to Cloud.</span>
        </div>
      </header>

      {/* Primary Container card */}
      <main className="max-w-lg w-full mx-auto my-12 bg-white rounded-3xl shadow-lg border border-zinc-200 overflow-hidden" id="auth-main-card">
        
        {/* Switch Selector Header */}
        <div className="flex border-b border-zinc-100">
          <button
            onClick={() => { setAuthMode('login'); setStep(1); }}
            className={`flex-1 py-4 text-center font-bold text-sm tracking-wide transition-all uppercase cursor-pointer ${
              authMode === 'login' 
                ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-700' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            style={{ minHeight: '48px' }}
            id="auth-tab-login"
          >
            Staff Login
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-4 text-center font-bold text-sm tracking-wide transition-all uppercase cursor-pointer ${
              authMode === 'register' 
                ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-700' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            style={{ minHeight: '48px' }}
            id="auth-tab-register"
          >
            Business Registration
          </button>
        </div>

        {/* Auth Body Forms */}
        <div className="p-6 md:p-8">
          
          {authMode === 'login' ? (
            /* Staff Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-6" id="login-form">
              <div className="text-center mb-6">
                <h2 className="text-lg font-extrabold tracking-tight text-zinc-950 uppercase">Access Operator Panel</h2>
                <p className="text-xs text-zinc-500 mt-1">Provide your staff username or PIN to access this terminal</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1.5">Username or ID</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g., Mary Kawira"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                    id="login-username-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1.5">Passcode / PIN</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Enter till pin code"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                    id="login-pin-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide uppercase py-3.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                style={{ minHeight: '48px' }}
                id="login-submit-btn"
              >
                <span>Authorize Session</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Demo Users Quicklinks */}
              {allUsers.length > 0 && (
                <div className="pt-4 border-t border-zinc-100">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Demo Operators (Sandbox):</p>
                  <div className="flex flex-wrap gap-2">
                    {allUsers.slice(0, 3).map(user => (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => selectSeededUser(user.username)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-blue-100 text-zinc-700 hover:text-blue-700 font-semibold transition-all cursor-pointer border border-zinc-200 hover:border-blue-300"
                      >
                        {user.username}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* SaaS Wizard Registration */
            <form onSubmit={handleRegisterSubmit} className="space-y-6" id="register-wizard">
              
              {/* Step 1: Legal Brand details */}
              {step === 1 && (
                <div className="space-y-5" id="wizard-step-1">
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-extrabold tracking-tight text-zinc-950 uppercase">Business Profile</h2>
                    <p className="text-xs text-zinc-500 mt-1">Register your legal entity and set vertical defaults</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Legal Business Name *</label>
                      <input
                        type="text"
                        required
                        value={legalName}
                        onChange={(e) => { setLegalName(e.target.value); if (!tradeName) setTradeName(e.target.value); }}
                        placeholder="e.g., Kamau Butcheries Ltd"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Trade Name / DBA</label>
                      <input
                        type="text"
                        value={tradeName}
                        onChange={(e) => setTradeName(e.target.value)}
                        placeholder="e.g., Kamau Butchery"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Sector Vertical *</label>
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-3 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                        >
                          <option value="Retail General">General Retail</option>
                          <option value="Butchery Meat">Butchery Shop</option>
                          <option value="Mitumba Apparel">Mitumba Apparel</option>
                          <option value="Hardware Store">Hardware / Agrovet</option>
                          <option value="Cyber Point">Cyber Cafe / Services</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Country *</label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-3 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                        >
                          <option value="Kenya">Kenya (KES)</option>
                          <option value="Tanzania">Tanzania (TZS)</option>
                          <option value="Uganda">Uganda (UGX)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!legalName) {
                        addToast('Legal business name is required.', 'error');
                        return;
                      }
                      setStep(2);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide uppercase py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    style={{ minHeight: '48px' }}
                  >
                    <span>Proceed to Owner Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2: Owner profile details */}
              {step === 2 && (
                <div className="space-y-5" id="wizard-step-2">
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-extrabold tracking-tight text-zinc-950 uppercase">Owner Credentials</h2>
                    <p className="text-xs text-zinc-500 mt-1">Specify credentials for the principal administrator</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Owner Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g., Mary Kawira"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Safaricom Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="e.g., +254790435584"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Primary Email Address *</label>
                      <input
                        type="email"
                        required
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="e.g., mary@gmail.com"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                      />
                    </div>

                    <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                        <div className="text-[11px] text-amber-800">
                          <p className="font-bold">Password Requirements:</p>
                          <ul className="mt-1 space-y-0.5 text-[10px]">
                            <li>• At least 8 characters</li>
                            <li>• One uppercase letter</li>
                            <li>• One lowercase letter</li>
                            <li>• One number</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Password *</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold tracking-wide uppercase text-zinc-600 mb-1">Confirm Password *</label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs tracking-wide uppercase py-3 rounded-xl border border-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-1"
                      style={{ minHeight: '48px' }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide uppercase py-3 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                      style={{ minHeight: '48px' }}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Register Business</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}

        </div>
      </main>

      {/* Footer Branding & help tags */}
      <footer className="max-w-7xl mx-auto w-full text-center py-6 border-t border-zinc-200 mt-6">
        <p className="text-xs text-zinc-500">
          BuzzNa D74 Cloud OS is secured with end-to-end multi-tenant Row-Level Security guards. 
        </p>
        <p className="text-[10px] text-zinc-400 font-mono mt-1">
          Support: support@buzznad74.com | WhatsApp: +254790435584 | Email: buzznad74@gmail.com
        </p>
      </footer>
    </div>
  );
};

export default Auth;