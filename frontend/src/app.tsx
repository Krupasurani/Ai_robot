import 'src/global.css';

import { Toaster } from 'sonner';
import { Provider } from 'react-redux';
import { Router } from 'src/routes/sections';
import { useScrollToTop } from 'src/hooks/use-scroll-to-top';

import { AdminProvider } from 'src/context/AdminContext';
import { I18nProvider } from 'src/locales/i18n-provider';
import { ServicesHealthProvider } from 'src/context/ServiceHealthContext';
import { GroupsProvider } from 'src/context/GroupsContext';

import { ProgressBar } from 'src/components/custom/progress-bar';
import { HealthGate } from 'src/components/custom/health-gate';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

import { AuthProvider as JwtAuthProvider } from 'src/auth/context/jwt';

import store from './store/store';
import { ErrorProvider } from './utils/axios';
import { SidebarProvider } from './components/ui/sidebar';
import { CustomThemeProvider } from './theme/theme-provider';
import { ReactQueryProvider } from './context/react-query';

const AuthProvider = JwtAuthProvider;

export default function App() {
  useScrollToTop();

  return (
    <I18nProvider>
      <AuthProvider>
        <Provider store={store}>
          <ReactQueryProvider>
            <SettingsProvider settings={defaultSettings}>
              <CustomThemeProvider storageKey="theme-mode">
                <AdminProvider>
                  <MotionLazy>
                    <Toaster
                      expand
                      gap={12}
                      closeButton
                      offset={16}
                      visibleToasts={4}
                      position="top-right"
                    />
                    <ProgressBar />
                    <SettingsDrawer />
                    <ErrorProvider>
                      <ServicesHealthProvider>
                        <HealthGate>
                          <SidebarProvider>
                            <GroupsProvider>
                              <Router />
                            </GroupsProvider>
                          </SidebarProvider>
                        </HealthGate>
                      </ServicesHealthProvider>
                    </ErrorProvider>
                  </MotionLazy>
                </AdminProvider>
              </CustomThemeProvider>
            </SettingsProvider>
          </ReactQueryProvider>
        </Provider>
      </AuthProvider>
    </I18nProvider>
  );
}
