import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeProvider';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { CRM } from './pages/CRM';
import { Expenses } from './pages/Expenses';
import { Shift } from './pages/Shift';
import { Settings } from './pages/Settings';
import { Toast, ToastMessage } from './components/Toast';
import { generateUUID } from './lib/db';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Realtime Active Tab Routing State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Auto-route to Settings tab if returning from Paystack payment verification
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'verify' && params.get('reference')) {
      setActiveTab('settings');
    }
  }, []);

  // Realtime Toast State Engine
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add toast helper
  const addToast = (text: string, type: 'success' | 'error' | 'info' | 'sync') => {
    const id = generateUUID();
    const newToast: ToastMessage = { id, text, type };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss standard alerts in 4 seconds
    if (type !== 'sync') {
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSessionChange = () => {
    // Force clean check of state on till status transitions
    addToast('Terminal session state refreshed.', 'info');
  };

  return (
    <>
      {isAuthenticated ? (
        <Layout 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          addToast={addToast}
        >
          {activeTab === 'dashboard' && <Dashboard addToast={addToast} />}
          {activeTab === 'pos' && <POS addToast={addToast} />}
          {activeTab === 'inventory' && <Inventory addToast={addToast} />}
          {activeTab === 'sales' && <Sales addToast={addToast} />}
          {activeTab === 'crm' && <CRM addToast={addToast} />}
          {activeTab === 'expenses' && <Expenses addToast={addToast} />}
          {activeTab === 'shift' && <Shift addToast={addToast} onSessionChange={handleSessionChange} />}
          {activeTab === 'settings' && <Settings addToast={addToast} />}
        </Layout>
      ) : (
        <Auth addToast={addToast} />
      )}

      {/* Global Notifications Panel overlay */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
