import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { AppProvider } from "@/contexts/AppContext";
import { AttendanceProvider } from "@/contexts/AttendanceContext";
import { MemberProvider } from "@/contexts/MemberContext";
import { ReportsProvider } from "@/contexts/ReportsContext";
import { MaterialsProvider } from "@/contexts/MaterialsContext";
import { AnnouncementsProvider } from "@/contexts/AnnouncementsContext";
import { FollowUpsProvider } from "@/contexts/FollowUpsContext";
import { PrayerProvider } from "@/contexts/PrayerContext";
import { TestimoniesProvider } from "@/contexts/TestimoniesContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import { LandingPage } from "@/pages/LandingPage";
import { JoinPage } from "@/pages/JoinPage";
import { LoginPage } from "@/pages/LoginPage";

// Authenticated pages
import { DashboardPage } from "@/pages/DashboardPage";
import { AttendancePage } from "@/pages/AttendancePage";
import { MarkAttendancePage } from "@/pages/MarkAttendancePage";
import { MembersPage } from "@/pages/MembersPage";
import { AddMemberPage } from "@/pages/AddMemberPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { NewReportPage } from "@/pages/NewReportPage";
import { MaterialsPage } from "@/pages/MaterialsPage";
import { AnnouncementsPage } from "@/pages/AnnouncementsPage";
import { CreateAnnouncementPage } from "@/pages/CreateAnnouncementPage";
import { AdminAnnouncementsPage } from "@/pages/AdminAnnouncementsPage";
import { MorePage } from "@/pages/MorePage";
import { ProfilePage } from "@/pages/ProfilePage";
import { FollowUpsPage } from "@/pages/FollowUpsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { PrayerPage } from "@/pages/PrayerPage";
import { TestimoniesPage } from "@/pages/TestimoniesPage";
import { InvitePage } from "@/pages/InvitePage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { CellSettingsPage } from "@/pages/CellSettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PermissionsProvider>
        <AppProvider>
          <AttendanceProvider>
            <MemberProvider>
              <ReportsProvider>
                <MaterialsProvider>
                  <AnnouncementsProvider>
                    <FollowUpsProvider>
                   <PrayerProvider>
                    <TestimoniesProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        <Routes>
                          {/* ---------------- Public ---------------- */}
                          <Route path="/" element={<LandingPage />} />
                          <Route path="/cell/:code" element={<LandingPage />} />
                          <Route path="/join" element={<JoinPage />} />
                          <Route path="/join/:code" element={<JoinPage />} />
                          <Route path="/login" element={<LoginPage />} />

                          {/* ---------------- Authenticated ---------------- */}
                          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

                          <Route path="/attendance" element={
                            <ProtectedRoute requiredPermissions={['mark_attendance']}><AttendancePage /></ProtectedRoute>
                          } />
                          <Route path="/attendance/mark" element={
                            <ProtectedRoute requiredPermissions={['mark_attendance']}><MarkAttendancePage /></ProtectedRoute>
                          } />

                          <Route path="/members" element={
                            <ProtectedRoute requiredPermissions={['view_homecell_members']}><MembersPage /></ProtectedRoute>
                          } />
                          <Route path="/members/add" element={
                            <ProtectedRoute requiredPermissions={['add_homecell_members']}><AddMemberPage /></ProtectedRoute>
                          } />

                          <Route path="/reports" element={
                            <ProtectedRoute requiredPermissions={['view_homecell_reports']}><ReportsPage /></ProtectedRoute>
                          } />
                          <Route path="/reports/new" element={
                            <ProtectedRoute requiredPermissions={['submit_homecell_reports']}><NewReportPage /></ProtectedRoute>
                          } />

                          <Route path="/materials" element={<ProtectedRoute><MaterialsPage /></ProtectedRoute>} />
                          <Route path="/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
                          <Route path="/announcements/create" element={
                            <ProtectedRoute requiredPermissions={['create_announcements']}><CreateAnnouncementPage /></ProtectedRoute>
                          } />
                          <Route path="/announcements/admin" element={
                            <ProtectedRoute requiredPermissions={['manage_announcements']}><AdminAnnouncementsPage /></ProtectedRoute>
                          } />

                          <Route path="/followups" element={
                            <ProtectedRoute requiredPermissions={['view_followups']}><FollowUpsPage /></ProtectedRoute>
                          } />

                          <Route path="/more" element={<ProtectedRoute><MorePage /></ProtectedRoute>} />
                          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                          <Route path="/prayer" element={<ProtectedRoute><PrayerPage /></ProtectedRoute>} />
                          <Route path="/testimonies" element={<ProtectedRoute><TestimoniesPage /></ProtectedRoute>} />
                          <Route path="/invite" element={
                            <ProtectedRoute requiredPermissions={['manage_invitations']}><InvitePage /></ProtectedRoute>
                          } />
                          <Route path="/privacy" element={<ProtectedRoute><PrivacyPage /></ProtectedRoute>} />
                          <Route path="/cell-settings" element={
                            <ProtectedRoute requiredPermissions={['manage_homecell_settings']}><CellSettingsPage /></ProtectedRoute>
                          } />

                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </BrowserRouter>
                      </TooltipProvider>
                    </TestimoniesProvider>
                   </PrayerProvider>
                  </FollowUpsProvider>
                  </AnnouncementsProvider>
                </MaterialsProvider>
              </ReportsProvider>
            </MemberProvider>
          </AttendanceProvider>
        </AppProvider>
      </PermissionsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
