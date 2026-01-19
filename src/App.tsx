import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";

// Pages
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AttendancePage } from "./pages/AttendancePage";
import { MarkAttendancePage } from "./pages/MarkAttendancePage";
import { MembersPage } from "./pages/MembersPage";
import { AddMemberPage } from "./pages/AddMemberPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NewReportPage } from "./pages/NewReportPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { MorePage } from "./pages/MorePage";
import { ProfilePage } from "./pages/ProfilePage";
import { FollowUpsPage } from "./pages/FollowUpsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Onboarding */}
              <Route path="/" element={<OnboardingPage />} />
              
              {/* Main App */}
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Attendance */}
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/attendance/mark" element={<MarkAttendancePage />} />
              
              {/* Members */}
              <Route path="/members" element={<MembersPage />} />
              <Route path="/members/add" element={<AddMemberPage />} />
              
              {/* Reports */}
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reports/new" element={<NewReportPage />} />
              
              {/* Resources */}
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              
              {/* Profile & Settings */}
              <Route path="/more" element={<MorePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              
              {/* Follow-ups */}
              <Route path="/followups" element={<FollowUpsPage />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
