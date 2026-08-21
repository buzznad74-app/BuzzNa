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
   * Direct Supabase login with fallback to local DB.
   * Queries Supabase users table directly for credential validation.
   * Returns true if credentials match and user is active, false otherwise.
   */
  const login = async (username: string, pinOrPass: string): Promise<boolean> => {
    try {
      // Direct Supabase query for user by username
      const { data: supUsers, error: supError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase().trim())
        .single();

      if (supError) {
        // User not found in Supabase; fall back to local DB
        console.warn('[Auth] Supabase user lookup failed, falling back to local DB:', supError.message);
        const localUsers = await db.getAll<User>('users');
        const matched = localUsers.find(u => u.username.toLowerCase().trim() === username.toLowerCase().trim());

        if (!matched) {
          return false;
        }
        if (matched.password && matched.password !== pinOrPass) {
          return false;
        }
        setActiveUser(matched);
        localStorage.setItem('active_user_id', matched.userId);
        return true;
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
        return false;
      }

      // Check if user is active
      if (!user.isActive) {
        console.warn('[Auth] User is inactive in Supabase');
        return false;
      }

      // Set active user and store session
      setActiveUser(user);
      localStorage.setItem('active_user_id', user.userId);
      return true;
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      // Ultimate fallback: try local DB
      const localUsers = await db.getAll<User>('users');
      const matched = localUsers.find(u => u.username.toLowerCase().trim() === username.toLowerCase().trim());

      if (!matched || (matched.password && matched.password !== pinOrPass)) {
        return false;
      }
      setActiveUser(matched);
      localStorage.setItem('active_user_id', matched.userId);
      return true;
    }
  };

  /**
   * Fast user switcher with direct Supabase lookup.
   * Queries Supabase users table directly by user_id for PIN validation.
   * Returns true if PIN matches and user is active, false otherwise.
   */
  const fastSwitchUser = async (userId: string, pin: string): Promise<boolean> => {
    try {
      // Direct Supabase query for user by user_id
      const { data: supUser, error: supError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (supError) {
        // User not found in Supabase; fall back to local DB
        console.warn('[Auth] Supabase user lookup for switch failed, falling back to local DB:', supError.message);
        const localUsers = await db.getAll<User>('users');
        const matched = localUsers.find(u => u.userId === userId);

        if (!matched || (matched.password && matched.password !== pin)) {
          return false;
        }
        setActiveUser(matched);
        localStorage.setItem('active_user_id', matched.userId);
        return true;
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
        return false;
      }

      // Check if user is active
      if (!user.isActive) {
        console.warn('[Auth] User is inactive in Supabase');
        return false;
      }

      // Set active user and store session
      setActiveUser(user);
      localStorage.setItem('active_user_id', user.userId);
      return true;
    } catch (err: any) {
      console.error('[Auth] fastSwitchUser error:', err);
      // Ultimate fallback: try local DB
      const localUsers = await db.getAll<User>('users');
      const matched = localUsers.find(u => u.userId === userId);

      if (!matched || (matched.password && matched.password !== pin)) {
        return false;
      }
      setActiveUser(matched);
      localStorage.setItem('active_user_id', matched.userId);
      return true;
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

  // Business registration with direct Supabase integration
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
    // Default to Blue placeholder branding as requested (#2563EB)
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

    // Direct Supabase integration with proper snake_case conversions
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
    if (bizError) throw new Error(bizError.message || 'Failed to initialize business in Cloud.');

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
    if (settingsError) throw new Error(settingsError.message || 'Failed to initialize settings in Cloud.');

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
    if (ownerError) throw new Error(ownerError.message || 'Failed to initialize owner in Cloud.');

    // Dispatch onboarding email and welcome messages
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

        // Trigger onboarding hooks (SMS, in-app notifications)
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

    // Commit to local DB
    await db.put('businesses', newBusiness);
    await db.put('business_settings', newSettings);
    await db.put('users', newOwner);

    setActiveBusiness(newBusiness);
    setBusinessSettings(newSettings);
    setActiveUser(newOwner);
    localStorage.setItem('active_user_id', newOwner.userId);
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
