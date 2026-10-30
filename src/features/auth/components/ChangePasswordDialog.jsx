import { useState } from 'react';
import { X } from 'lucide-react';
import { authService } from '../../../services/authService';
import { errorMessage } from '../../../services/apiClient';
import { Field, PasswordInput, SubmitButton, inputClass } from './AuthShell';

const EMPTY = { email: '', currentPassword: '', newPassword: '', confirm: '' };

/**
 * Hộp thoại đổi mật khẩu ngay ở trang đăng nhập (tự phục vụ).
 * Phải nhập đúng mật khẩu hiện tại — an toàn hơn "quên mật khẩu" khi chưa có email.
 */
export function ChangePasswordDialog({ onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (form.newPassword.length < 8) return setError('Mật khẩu mới cần ít nhất 8 ký tự.');
    if (form.newPassword !== form.confirm) return setError('Xác nhận mật khẩu không khớp.');
    setBusy(true);
    try {
      await authService.changePassword({
        email: form.email,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setDone(true);
      setForm(EMPTY);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Đã đổi mật khẩu. Các thiết bị khác đã đăng xuất — hãy đăng nhập lại bằng mật khẩu mới.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-water-600 py-3 font-semibold text-white"
            >
              Xong
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email tài khoản">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
                placeholder="ban@email.com"
                className={inputClass}
              />
            </Field>
            <Field label="Mật khẩu hiện tại">
              <PasswordInput value={form.currentPassword} onChange={(v) => set({ currentPassword: v })} />
            </Field>
            <Field label="Mật khẩu mới (≥ 8 ký tự)">
              <PasswordInput value={form.newPassword} onChange={(v) => set({ newPassword: v })} />
            </Field>
            <Field label="Nhập lại mật khẩu mới">
              <PasswordInput value={form.confirm} onChange={(v) => set({ confirm: v })} />
            </Field>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <SubmitButton busy={busy}>Đổi mật khẩu</SubmitButton>
            <p className="text-center text-xs text-slate-400">
              Quên mật khẩu? Nhờ admin đặt lại trong mục Người dùng.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChangePasswordDialog;
