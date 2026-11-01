import { Navigate, Route, Routes } from 'react-router-dom';
import { DearlyLoader } from './components/DearlyLoader';
import { useAuth } from './context/AuthProvider';
import { AppLayout } from './layouts/AppLayout';
import { RealtimeBridge } from './components/RealtimeBridge';
import { LandingPage } from './features/landing/pages/LandingPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { TodayPage } from './features/today/TodayPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { HabitSettingsPage } from './features/settings/pages/HabitSettingsPage';
import { SleepSettingsPage } from './features/settings/pages/SleepSettingsPage';
import { WeightSettingsPage } from './features/settings/pages/WeightSettingsPage';
import { SleepHomePage } from './features/sleep/pages/SleepHomePage';
import { PartnerSleepPage } from './features/partner/pages/PartnerSleepPage';
import { CalendarPage } from './features/water/pages/CalendarPage';
import { FriendsPage } from './features/social/pages/FriendsPage';
import { FriendProfilePage } from './features/social/pages/FriendProfilePage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { ChatPage } from './features/chat/pages/ChatPage';
import { PartnerPage } from './features/partner/pages/PartnerPage';
import { MascotLabPage } from './features/mascot/pages/MascotLabPage';
import { VoiceNotePage } from './features/voice/pages/VoiceNotePage';
import { AdminLayout } from './features/admin/layouts/AdminLayout';
import { AdminOverview } from './features/admin/pages/AdminOverview';
import { AdminUsers } from './features/admin/pages/AdminUsers';
import { AdminBroadcast } from './features/admin/pages/AdminBroadcast';
import { AdminLogs } from './features/admin/pages/AdminLogs';
import { AdminEras } from './features/admin/pages/AdminEras';
import { AdminCups } from './features/admin/pages/AdminCups';
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
          <Route path="/mascot" element={<MascotLabPage />} />
          <Route path="/voice-notes" element={<VoiceNotePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>;
}