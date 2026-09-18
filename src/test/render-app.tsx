import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { AppProvider } from '@/contexts/AppContext';
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import { MemberProvider } from '@/contexts/MemberContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import { MaterialsProvider } from '@/contexts/MaterialsContext';
import { AnnouncementsProvider } from '@/contexts/AnnouncementsContext';
import { FollowUpsProvider } from '@/contexts/FollowUpsContext';
import { PrayerProvider } from '@/contexts/PrayerContext';
import { TestimoniesProvider } from '@/contexts/TestimoniesContext';

/**
 * Render a page inside the real provider stack, in the same nesting order as
 * `App.tsx`. The providers hit the live API, so this exercises the actual
 * context -> adapter -> API path rather than hand-built fixtures.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
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
                              <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
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
    </QueryClientProvider>,
    options,
  );
}
