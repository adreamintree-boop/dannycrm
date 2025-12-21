import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import BuyerDetail from "./pages/BuyerDetail";
import BLSearch from "./pages/BLSearch";
import CompanyAggregation from "./pages/CompanyAggregation";
import TopHeader from "./components/layout/TopHeader";
import { AppProvider } from "./context/AppContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/*" element={<MainLayout />} />
            <Route path="/buyers/:buyerId" element={<BuyerDetail />} />
            <Route path="/bl-search" element={
              <div className="min-h-screen flex flex-col bg-background">
                <TopHeader />
                <BLSearch />
              </div>
            } />
            <Route path="/company-aggregation" element={<CompanyAggregation />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
