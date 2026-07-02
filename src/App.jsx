import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
import PendingApproval from '@/pages/PendingApproval';
import RejectedApproval from '@/pages/RejectedApproval';
import Admin from '@/pages/Admin';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const { data: profile, isLoading: isLoadingProfile, refreshProfile } = useProfile(user?.id);

  if (isLoadingAuth || (isAuthenticated && !isAdmin && isLoadingProfile)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">טוען...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Admin bypasses onboarding / approval gate
  if (!isAdmin) {
    if (!profile) {
      return <Onboarding onComplete={refreshProfile} />;
    }
    if (profile.status === 'pending') {
      return <PendingApproval profile={profile} onApproved={refreshProfile} />;
    }
    if (profile.status === 'rejected') {
      return <RejectedApproval />;
    }
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      {isAdmin && (
        <Route path="/Admin" element={<Admin />} />
      )}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
