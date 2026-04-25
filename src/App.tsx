import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import DataPage from "./pages/DataPage";
import SPCPage from "./pages/SPCPage";
import CapabilityPage from "./pages/CapabilityPage";
import MSAPage from "./pages/MSAPage";
import UncertaintyPage from "./pages/UncertaintyPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/spc" element={<SPCPage />} />
          <Route path="/capability" element={<CapabilityPage />} />
          <Route path="/msa" element={<MSAPage />} />
          <Route path="/uncertainty" element={<UncertaintyPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
