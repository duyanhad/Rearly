import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken } from '../services/apiClient';
import { authService } from '../services/authService';
import { disconnect } from '../services/realtime';
import { queryClient } from '../queryClient';
const AuthContext = createContext(null);
export function AuthProvider({
  children
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    // Chỉ đăng xuất khi token thật sự sai (401/403). Lỗi mạng/5xx (backend đang khởi động lại)
    // thì giữ token để lần mở sau không phải đăng nhập lại.
    authService.getProfile()
      .then(r => setUser(r.data))
      .catch(err => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);
  const login = useCallback(async (email, password) => {
    const {
      data
    } = await authService.login({
      email,
      password
    });
    // Đổi tài khoản trên cùng tab → bỏ dữ liệu của phiên trước.
    queryClient.clear();
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);
  const register = useCallback(async (email, password, fullName) => {
    const {
      data
    } = await authService.register({
      email,
      password,
      fullName
    });
    queryClient.clear();
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);
  const logout = useCallback(() => {
    // Báo server đổi SecurityStamp để token cũ (kể cả bị đánh cắp) không dùng lại được.
    void authService.logout().catch(() => undefined);
    // Xoá cache + ngắt realtime: không để lộ chat/thông báo của tài khoản trước trên máy dùng chung.
    queryClient.clear();
    void disconnect();
    setToken(null);
    setUser(null);
  }, []);
  const refreshProfile = useCallback(async () => {
    const {
      data
    } = await authService.getProfile();
    setUser(data);
  }, []);
  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    refreshProfile
  }), [user, loading, login, register, logout, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}