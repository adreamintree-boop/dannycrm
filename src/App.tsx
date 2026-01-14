import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import BuyerWorkspace from "./pages/BuyerWorkspace";
import BLSearch from "./pages/BLSearch";
import CompanyAggregation from "./pages/CompanyAggregation";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import MyProfile from "./pages/MyProfile";
import OnboardingSurvey from "./pages/OnboardingSurvey";
import StrategyResult from "./pages/StrategyResult";
import Email from "./pages/Email";
import EmailCallback from "./pages/EmailCallback";
import TopHeader from "./components/layout/TopHeader";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { CreditsProvider } from "./context/CreditsContext";
import { BuyerTabsProvider } from "./context/BuyerTabsContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CreditsProvider>
            <AppProvider>
            <BuyerTabsProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Onboarding route */}
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Protected routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              } />
              <Route path="/buyers/:buyerId" element={
                <ProtectedRoute>
                  <BuyerWorkspace />
                </ProtectedRoute>
              } />
              <Route path="/bl-search" element={
                <ProtectedRoute>
                  <div className="min-h-screen flex flex-col bg-background">
                    <TopHeader />
                    <BLSearch />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/company-aggregation" element={
                <ProtectedRoute>
                  <CompanyAggregation />
                </ProtectedRoute>
              } />
              <Route path="/my-profile" element={
                <ProtectedRoute>
                  <MyProfile />
                </ProtectedRoute>
              } />
              <Route path="/onboarding-survey" element={
                <ProtectedRoute>
                  <OnboardingSurvey />
                </ProtectedRoute>
              } />
              <Route path="/strategy" element={
                <ProtectedRoute>
                  <StrategyResult />
                </ProtectedRoute>
              } />
              <Route path="/email/callback" element={
                <ProtectedRoute>
                  <EmailCallback />
                </ProtectedRoute>
              } />
              <Route path="/email/*" element={
                <ProtectedRoute>
                  <Email />
                </ProtectedRoute>
              } />
            </Routes>
            </BuyerTabsProvider>
            </AppProvider>
          </CreditsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
