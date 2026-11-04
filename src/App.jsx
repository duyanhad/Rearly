import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DearlyLoader } from './components/DearlyLoader';
import { useAuth } from './context/AuthProvider';
import { AppLayout } from './layouts/AppLayout';
import { RealtimeBridge } from './components/RealtimeBridge';
const LandingPage = lazy(() => import('./features/landing/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { TodayPage } from './features/today/TodayPage';
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const HabitSettingsPage = lazy(() => import('./features/settings/pages/HabitSettingsPage').then((m) => ({ default: m.HabitSettingsPage })));
const SleepSettingsPage = lazy(() => import('./features/settings/pages/SleepSettingsPage').then((m) => ({ default: m.SleepSettingsPage })));
const WeightSettingsPage = lazy(() => import('./features/settings/pages/WeightSettingsPage').then((m) => ({ default: m.WeightSettingsPage })));
const SleepHomePage = lazy(() => import('./features/sleep/pages/SleepHomePage').then((m) => ({ default: m.SleepHomePage })));
const PartnerSleepPage = lazy(() => import('./features/partner/pages/PartnerSleepPage').then((m) => ({ default: m.PartnerSleepPage })));
const CalendarPage = lazy(() => import('./features/water/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const FriendsPage = lazy(() => import('./features/social/pages/FriendsPage').then((m) => ({ default: m.FriendsPage })));
const FriendProfilePage = lazy(() => import('./features/social/pages/FriendProfilePage').then((m) => ({ default: m.FriendProfilePage })));
const ProfilePage = lazy(() => import('./features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ChatPage = lazy(() => import('./features/chat/pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const PartnerPage = lazy(() => import('./features/partner/pages/PartnerPage').then((m) => ({ default: m.PartnerPage })));
const DutyCreatePage = lazy(() => import('./features/duties/pages/DutyCreatePage').then((m) => ({ default: m.DutyCreatePage })));
const MascotLabPage = lazy(() => import('./features/mascot/pages/MascotLabPage').then((m) => ({ default: m.MascotLabPage })));
const VoiceNotePage = lazy(() => import('./features/voice/pages/VoiceNotePage').then((m) => ({ default: m.VoiceNotePage })));
const AdminLayout = lazy(() => import('./features/admin/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminOverview = lazy(() => import('./features/admin/pages/AdminOverview').then((m) => ({ default: m.AdminOverview })));
const AdminUsers = lazy(() => import('./features/admin/pages/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminBroadcast = lazy(() => import('./features/admin/pages/AdminBroadcast').then((m) => ({ default: m.AdminBroadcast })));
const AdminLogs = lazy(() => import('./features/admin/pages/AdminLogs').then((m) => ({ default: m.AdminLogs })));
const AdminEras = lazy(() => import('./features/admin/pages/AdminEras').then((m) => ({ default: m.AdminEras })));
const AdminCups = lazy(() => import('./features/admin/pages/AdminCups').then((m) => ({ default: m.AdminCups })));
function Loading() {
  return <DearlyLoader full />;
}
function RequireAuth({
  children
}) {
  const {
    user,
    loading
  } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/landing" replace />;
  // Tài khoản admin chỉ dùng giao diện admin, không trộn với giao diện người dùng.
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
  }
function RequireAdmin({
  children
}) {
  const {
    user,
    loading
  } = useAuth();
  if (loading) return <Loading />;
  return user?.role === 'Admin' ? <>{children}</> : <Navigate to="/login" replace />;
}
function GuestOnly({
  children
}) {
  const {
    user,
    loading
  } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <>{children}</>;
  return <Navigate to={user.role === 'Admin' ? '/admin' : '/'} replace />;
}
export default function App() {
  return <>
      <RealtimeBridge />
      <Suspense fallback={<Loading />}>
        <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

        {/* Admin has its own shell, outside the user layout. */}
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="broadcast" element={<AdminBroadcast />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="eras" element={<AdminEras />} />
          <Route path="cups" element={<AdminCups />} />
        </Route>

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<TodayPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/medicine" element={<HabitSettingsPage kind="medicine" />} />
          <Route path="/settings/meal" element={<HabitSettingsPage kind="meal" />} />
          <Route path="/settings/study" element={<HabitSettingsPage kind="study" />} />
          <Route path="/settings/sleep" element={<SleepSettingsPage />} />
        <Route path="/settings/weight" element={<WeightSettingsPage />} />
          <Route path="/sleep" element={<SleepHomePage />} />
          <Route path="/partner/sleep" element={<PartnerSleepPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friends/:id" element={<FriendProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/partner" element={<PartnerPage />} />
          <Route path="/duties/new" element={<DutyCreatePage />} />
          <Route path="/mascot" element={<MascotLabPage />} />
          <Route path="/voice-notes" element={<VoiceNotePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>;
}