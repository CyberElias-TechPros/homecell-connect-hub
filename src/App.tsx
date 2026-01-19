import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { AppProvider } from "@/contexts/AppContext";
import { AttendanceProvider } from "@/contexts/AttendanceContext";
import { ReportsProvider } from "@/contexts/ReportsContext";
import { MaterialsProvider } from "@/contexts/MaterialsContext";
import { AnnouncementsProvider } from "@/contexts/AnnouncementsContext";
import { FollowUpsProvider } from "@/contexts/FollowUpsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
import { CreateAnnouncementPage } from "./pages/CreateAnnouncementPage";
import { AdminAnnouncementsPage } from "./pages/AdminAnnouncementsPage";
import { MorePage } from "./pages/MorePage";
import { ProfilePage } from "./pages/ProfilePage";
import { FollowUpsPage } from "./pages/FollowUpsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PermissionsProvider>
        <AppProvider>
          <AttendanceProvider>
            <ReportsProvider>
              <MaterialsProvider>
                <AnnouncementsProvider>
                  <FollowUpsProvider>
                    <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Onboarding - Public */}
                <Route path="/" element={<OnboardingPage />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />

                {/* Attendance */}
                <Route path="/attendance" element={
                  <ProtectedRoute requiredPermissions={['mark_attendance']}>
                    <AttendancePage />
                  </ProtectedRoute>
                } />
                <Route path="/attendance/mark" element={
                  <ProtectedRoute requiredPermissions={['mark_attendance']}>
                    <MarkAttendancePage />
                  </ProtectedRoute>
                } />

                {/* Members */}
                <Route path="/members" element={
                  <ProtectedRoute requiredPermissions={['view_homecell_members']}>
                    <MembersPage />
                  </ProtectedRoute>
                } />
                <Route path="/members/add" element={
                  <ProtectedRoute requiredPermissions={['add_homecell_members']}>
                    <AddMemberPage />
                  </ProtectedRoute>
                } />

                {/* Reports */}
                <Route path="/reports" element={
                  <ProtectedRoute requiredPermissions={['view_homecell_reports']}>
                    <ReportsPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports/new" element={
                  <ProtectedRoute requiredPermissions={['submit_homecell_reports']}>
                    <NewReportPage />
                  </ProtectedRoute>
                } />

                {/* Resources */}
                <Route path="/materials" element={
                  <ProtectedRoute>
                    <MaterialsPage />
                  </ProtectedRoute>
                } />
                <Route path="/announcements" element={
                  <ProtectedRoute>
                    <AnnouncementsPage />
                  </ProtectedRoute>
                } />
                <Route path="/announcements/create" element={
                  <ProtectedRoute requiredPermissions={['create_announcements']}>
                    <CreateAnnouncementPage />
                  </ProtectedRoute>
                } />
                <Route path="/announcements/admin" element={
                  <ProtectedRoute requiredPermissions={['manage_announcements']}>
                    <AdminAnnouncementsPage />
                  </ProtectedRoute>
                } />

                {/* Profile & Settings */}
                <Route path="/more" element={
                  <ProtectedRoute>
                    <MorePage />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute requiredPermissions={['view_own_profile']}>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                } />

                {/* Follow-ups */}
                <Route path="/followups" element={
                  <ProtectedRoute>
                    <FollowUpsPage />
                  </ProtectedRoute>
                } />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
                      </TooltipProvider>
                    </FollowUpsProvider>
                  </AnnouncementsProvider>
                </MaterialsProvider>
              </ReportsProvider>
            </AttendanceProvider>
        </AppProvider>
      </PermissionsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
