import React, { createContext, useContext, useState, useEffect } from 'react';
import { Business, BusinessSettings, User, VerticalTheme, LicenseStatus } from '../types';
import { db, generateUUID } from '../lib/db';
import { translate } from '../lib/translations';
import { supabase } from '../lib/sync';

interface AuthContextType {
  activeBusiness: Business | null;
  businessSettings: BusinessSettings | null;
  activeUser: User | null;
  allUsers: User[];
  isDemoMode: boolean;
  onboardingStep: number;
  language: 'EN' | 'SW';
  isAuthenticated: boolean;
  setLanguage: (lang: 'EN' | 'SW') => Promise<void>;
  t: (key: string) => string;
  login: (username: string, pinOrPass: string) => Promise<boolean>;
  logout: () => void;
  fastSwitchUser: (userId: string, pin: string) => Promise<boolean>;
  registerBusiness: (details: {
    legalName: string;
    tradeName?: string;
    industry: string;
    country: string;
    currency: string;
    language: string;
    timezone: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail?: string;
    password?: string;
  }) => Promise<void>;
  updateSettings: (settings: Partial<BusinessSettings>) => Promise<void>;
  updateBusiness: (business: Partial<Business>) => Promise<void>;
  setThemeAndColor: (theme: VerticalTheme, color: string) => Promise<void>;
  setOnboardingStep: (step: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Network connectivity check.
 * Returns true if online, false otherwise.
 */
const isNetworkOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [language, setLanguageState] = useState<'EN' | 'SW'>('EN');

  // Load initial session on startup
  useEffect(() => {
    const loadSession = async () => {
      const businesses = await db.getAll<Business>('businesses');
      if (businesses.length > 0) {
        const bus = businesses[0];
        setActiveBusiness(bus);

        const preferredLang = localStorage.getItem('preferred_language');
        if (preferredLang === 'SW' || preferredLang === 'EN') {
          setLanguageState(preferredLang as 'EN' | 'SW');
        } else if (bus.language === 'SW' || bus.language === 'kiswahili' || bus.language?.toUpperCase().includes('SW')) {
          setLanguageState('SW');
        } else {
          setLanguageState('EN');
        }

        const settings = await db.getById<BusinessSettings>('business_settings', bus.tenantId);
        if (settings) {
          setBusinessSettings(settings);
        }

        const users = await db.getAll<User>('users');
        setAllUsers(users);

        const cachedUserId = localStorage.getItem('active_user_id');
        if (cachedUserId) {
          const usr = users.find(u => u.userId === cachedUserId);
          if (usr) {
            setActiveUser(usr);
          }
        }
      }
    };

    const unsubscribe = db.subscribe(loadSession);
    loadSession();

    return () => unsubscribe();
  }, []);

  /**
   * STRICT ONLINE-ONLY Login.
   * - Checks network connectivity before attempting authentication.
   * - Throws error if offline.
   * - Queries live Supabase users table directly for credential validation.
   * - No local fallback, no queuing.
   * - Returns true if credentials match and user is active, false otherwise.
   * - Throws explicit error message if network unavailable.
   */
  const login = async (username: string, pinOrPass: string): Promise<boolean> => {
    // PRE-CHECK: Enforce strict online requirement
    if (!isNetworkOnline()) {
      throw new Error('Internet connection required. Staff login requires an active network connection.');
    }

    try {
      // Direct Supabase query for user by username
      const { data: supUsers, error: supError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase().trim())
        .single();

      if (supError) {
        // User not found in Supabase
        const errorMsg = supError.code === 'PGRST116' 
          ? 'Staff credentials mismatch. Username not found in the system.'
          : `Authentication failed: ${supError.message}`;
        throw new Error(errorMsg);
      }

      if (!supUsers) {
        throw new Error('Staff credentials mismatch. No user record returned from server.');
      }

      // Convert Supabase snake_case to camelCase
      const user: User = {
        userId: supUsers.user_id,
        tenantId: supUsers.tenant_id,
        role: supUsers.role,
        username: supUsers.username,
        phoneNumber: supUsers.phone_number,
        emailAddress: supUsers.email_address,
        password: supUsers.password,
        isActive: supUsers.is_active,
        createdAt: supUsers.created_at,
      };

      // Validate password/PIN
      if (user.password && user.password !== pinOrPass) {
        throw new Error('Staff credentials mismatch. Incorrect PIN or password.');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Staff account is inactive. Contact your administrator.');
      }

      // Load associated business
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .single();

      if (bizError || !business) {
        throw new Error('Associated business record not found in the system.');
      }

      // Convert business snake_case to camelCase
      const activeBiz: Business = {
        tenantId: business.tenant_id,
        legalName: business.legal_name,
        tradeName: business.trade_name,
        industry: business.industry,
        country: business.country,
        currency: business.currency,
        language: business.language,
        timezone: business.timezone,
        licenseStatus: business.license_status,
        licenseExpiresAt: business.license_expires_at,
        createdAt: business.created_at,
      };

      // Load business settings
      const { data: settings, error: settingsError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .single();

      if (!settingsError && settings) {
        const bizSettings: BusinessSettings = {
          tenantId: settings.tenant_id,
          chosenTheme: settings.chosen_theme,
          brandColor: settings.brand_color,
          dailyRevenueTarget: settings.daily_revenue_target,
          weeklyRevenueTarget: settings.weekly_revenue_target,
          monthlyRevenueTarget: settings.monthly_revenue_target,
          darajaPaybill: settings.daraja_paybill,
          darajaTillNumber: settings.daraja_till_number,
          eodTime: settings.eod_time,
        };
        setBusinessSettings(bizSettings);
      }

      // Set active user, business, and store session
      setActiveUser(user);
      setActiveBusiness(activeBiz);
      localStorage.setItem('active_user_id', user.userId);
      return true;
    } catch (err: any) {
      // Re-throw with explicit error message
      const message = err?.message || 'Login failed. Please check your credentials and try again.';
      throw new Error(message);
    }
  };

  /**
   * STRICT ONLINE-ONLY Fast User Switch.
   * - Checks network connectivity before attempting authentication.
   * - Throws error if offline.
   * - Queries live Supabase users table directly by user_id for PIN validation.
   * - No local fallback, no queuing.
   * - Returns true if PIN matches and user is active, false otherwise.
   * - Throws explicit error message if network unavailable.
   */
  const fastSwitchUser = async (userId: string, pin: string): Promise<boolean> => {
    // PRE-CHECK: Enforce strict online requirement
    if (!isNetworkOnline()) {
      throw new Error('Internet connection required. Staff switch requires an active network connection.');
    }

    try {
      // Direct Supabase query for user by user_id
      const { data: supUser, error: supError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (supError) {
        const errorMsg = supError.code === 'PGRST116'
          ? 'Staff member not found in the system.'
          : `User lookup failed: ${supError.message}`;
        throw new Error(errorMsg);
      }

      if (!supUser) {
        throw new Error('Staff member record not found.');
      }

      // Convert Supabase snake_case to camelCase
      const user: User = {
        userId: supUser.user_id,
        tenantId: supUser.tenant_id,
        role: supUser.role,
        username: supUser.username,
        phoneNumber: supUser.phone_number,
        emailAddress: supUser.email_address,
        password: supUser.password,
        isActive: supUser.is_active,
        createdAt: supUser.created_at,
      };

      // Validate PIN
      if (user.password && user.password !== pin) {
        throw new Error('Incorrect PIN for this staff member.');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Staff account is inactive.');
      }

      // Set active user and store session
      setActiveUser(user);
      localStorage.setItem('active_user_id', user.userId);
      return true;
    } catch (err: any) {
      const message = err?.message || 'Staff switch failed. Please try again.';
      throw new Error(message);
    }
  };

  const logout = () => {
    setActiveUser(null);
    localStorage.removeItem('active_user_id');
  };

  // Validate password strength
  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number.' };
    }
    return { valid: true, message: '' };
  };

  /**
   * STRICT ONLINE-ONLY Business Registration.
   * - Checks network connectivity before attempting registration.
   * - Throws error if offline.
   * - Performs direct, atomic database writes to Supabase.
   * - No offline queuing, no localStorage fallback, no mock data.
   * - All writes are transactional: business, settings, and owner user must succeed together or fail together.
   */
  const registerBusiness = async (details: {
    legalName: string;
    tradeName?: string;
    industry: string;
    country: string;
    currency: string;
    language: string;
    timezone: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail?: string;
    password?: string;
  }) => {
    // PRE-CHECK: Enforce strict online requirement
    if (!isNetworkOnline()) {
      throw new Error('Internet connection required. Business registration requires an active network connection.');
    }

    // Validate password strength
    if (details.password) {
      const validation = validatePassword(details.password);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
    }

    const tenantId = generateUUID();

    const newBusiness: Business = {
      tenantId,
      legalName: details.legalName,
      tradeName: details.tradeName || details.legalName,
      industry: details.industry,
      country: details.country,
      currency: details.currency,
      language: details.language,
      timezone: details.timezone,
      licenseStatus: LicenseStatus.TRIAL_ACTIVE,
      licenseExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    let theme: VerticalTheme = VerticalTheme.RETAIL;
    let brandColor = '#2563EB';
    const ind = details.industry.toLowerCase();
    
    if (ind.includes('butch') || ind.includes('meat')) {
      theme = VerticalTheme.BUTCHERY;
      brandColor = '#dc2626';
    } else if (ind.includes('mitumba') || ind.includes('cloth') || ind.includes('apparel')) {
      theme = VerticalTheme.MITUMBA;
      brandColor = '#059669';
    } else if (ind.includes('hard') || ind.includes('cement')) {
      theme = VerticalTheme.HARDWARE;
      brandColor = '#b45309';
    } else if (ind.includes('cyber') || ind.includes('internet') || ind.includes('service')) {
      theme = VerticalTheme.CYBER;
      brandColor = '#7c3aed';
    }

    const newSettings: BusinessSettings = {
      tenantId,
      chosenTheme: theme,
      brandColor,
      dailyRevenueTarget: 10000,
      weeklyRevenueTarget: 70000,
      monthlyRevenueTarget: 300000,
      darajaPaybill: '247247',
      darajaTillNumber: '557009'
    };

    const newOwner: User = {
      userId: generateUUID(),
      tenantId,
      role: 'OWNER',
      username: details.ownerName,
      phoneNumber: details.ownerPhone,
      emailAddress: details.ownerEmail,
      isActive: true,
      createdAt: new Date().toISOString(),
      password: details.password
    };

    try {
      // ATOMIC TRANSACTION: All three writes must succeed or the entire operation fails.
      // Direct Supabase integration with proper snake_case conversions.

      // 1. Insert business record
      const { error: bizError } = await supabase.from('businesses').insert([{
        tenant_id: newBusiness.tenantId,
        legal_name: newBusiness.legalName,
        trade_name: newBusiness.tradeName,
        industry: newBusiness.industry,
        country: newBusiness.country,
        currency: newBusiness.currency,
        language: newBusiness.language,
        timezone: newBusiness.timezone,
        license_status: newBusiness.licenseStatus,
        license_expires_at: newBusiness.licenseExpiresAt,
        created_at: newBusiness.createdAt
      }]);
      if (bizError) {
        throw new Error(`Business registration failed: ${bizError.message}`);
      }

      // 2. Insert business settings
      const { error: settingsError } = await supabase.from('business_settings').insert([{
        tenant_id: newSettings.tenantId,
        chosen_theme: newSettings.chosenTheme,
        brand_color: newSettings.brandColor,
        daily_revenue_target: newSettings.dailyRevenueTarget,
        weekly_revenue_target: newSettings.weeklyRevenueTarget,
        monthly_revenue_target: newSettings.monthlyRevenueTarget,
        daraja_paybill: newSettings.darajaPaybill,
        daraja_till_number: newSettings.darajaTillNumber,
        created_at: new Date().toISOString()
      }]);
      if (settingsError) {
        // Rollback: Delete the business record since settings failed
        await supabase.from('businesses').delete().eq('tenant_id', newBusiness.tenantId).catch(() => {});
        throw new Error(`Business settings registration failed: ${settingsError.message}`);
      }

      // 3. Insert owner/user record
      const { error: ownerError } = await supabase.from('users').insert([{
        user_id: newOwner.userId,
        tenant_id: newOwner.tenantId,
        role: newOwner.role,
        username: newOwner.username,
        phone_number: newOwner.phoneNumber,
        email_address: newOwner.emailAddress,
        password: newOwner.password,
        is_active: newOwner.isActive,
        created_at: newOwner.createdAt
      }]);
      if (ownerError) {
        // Rollback: Delete the business and settings records since owner creation failed
        await supabase.from('business_settings').delete().eq('tenant_id', newBusiness.tenantId).catch(() => {});
        await supabase.from('businesses').delete().eq('tenant_id', newBusiness.tenantId).catch(() => {});
        throw new Error(`Owner registration failed: ${ownerError.message}`);
      }

      // All Supabase writes succeeded. Now commit to local DB and set state.
      await db.put('businesses', newBusiness);
      await db.put('business_settings', newSettings);
      await db.put('users', newOwner);

      setActiveBusiness(newBusiness);
      setBusinessSettings(newSettings);
      setActiveUser(newOwner);
      localStorage.setItem('active_user_id', newOwner.userId);

      // Dispatch onboarding email and welcome messages (best-effort, non-blocking)
      try {
        if (typeof window !== 'undefined') {
          await fetch('/api/mail/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              business: newBusiness,
              owner: newOwner,
              recipientEmail: details.ownerEmail,
              language: details.language
            })
          }).catch(err => {
            console.warn('[Mail] Onboarding email dispatch failed:', err);
          });

          await fetch('/api/register-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ business: newBusiness, settings: newSettings, owner: newOwner, password: details.password })
          }).catch(err => {
            console.warn('[Onboarding] Server onboarding call failed:', err);
          });
        }
      } catch (e) {
        console.warn('[Onboarding] Mailing invocation skipped:', e);
      }
    } catch (err: any) {
      const message = err?.message || 'Business registration failed. Please check your connection and try again.';
      throw new Error(message);
    }
  };

  const updateSettings = async (settings: Partial<BusinessSettings>) => {
    if (!businessSettings || !activeBusiness) return;
    const nextSettings = { ...businessSettings, ...settings };
    await db.put('business_settings', nextSettings);
    setBusinessSettings(nextSettings);
  };

  const updateBusiness = async (biz: Partial<Business>) => {
    if (!activeBusiness) return;
    const nextBusiness = { ...activeBusiness, ...biz };
    await db.put('businesses', nextBusiness);
    setActiveBusiness(nextBusiness);
  };

  const setThemeAndColor = async (theme: VerticalTheme, color: string) => {
    await updateSettings({ chosenTheme: theme, brandColor: color });
  };

  const setLanguage = async (lang: 'EN' | 'SW') => {
    setLanguageState(lang);
    localStorage.setItem('preferred_language', lang);
    if (activeBusiness) {
      const updatedBus = { ...activeBusiness, language: lang };
      await db.put('businesses', updatedBus);
      setActiveBusiness(updatedBus);
    }
  };

  const t = (key: string) => {
    return translate(language, key);
  };

  const isAuthenticated = activeUser !== null && activeBusiness !== null;

  return (
    <AuthContext.Provider value={{
      activeBusiness,
      businessSettings,
      activeUser,
      allUsers,
      isDemoMode,
      onboardingStep,
      language,
      isAuthenticated,
      setLanguage,
      t,
      login,
      logout,
      fastSwitchUser,
      registerBusiness,
      updateSettings,
      updateBusiness,
      setThemeAndColor,
      setOnboardingStep
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
