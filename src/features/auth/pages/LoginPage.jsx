import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider';
import { errorMessage } from '../../../services/apiClient';
import { ChangePasswordDialog } from '../components/ChangePasswordDialog';
import {
  AuthShell,
  Field,
  PasswordInput,
  SubmitButton,
  inputClass
} from '../components/AuthShell';
export function LoginPage() {
  const {
    login
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      location.href = '/';
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return <AuthShell footer={<>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-water-600 hover:underline">
            Đăng ký ngay
          </Link>
        </>}>
      <h2 className="text-2xl font-bold text-slate-900">Chào mừng trở lại</h2>
      <p className="mb-6 mt-1 text-sm text-slate-500">Đăng nhập để tiếp tục hành trình chăm sóc bản thân.</p>

      <form onSubmit={submit} className="space-y-4">
        <Field icon={<Mail className="size-4" />} label="Email">
          <input type="email" required value={email} placeholder="ban@email.com" onChange={e => setEmail(e.target.value)} className={inputClass} />
        </Field>

        <Field icon={<Lock className="size-4" />} label="Mật khẩu">
          <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <SubmitButton busy={busy}>Đăng nhập</SubmitButton>

        <button
          type="button"
          onClick={() => setChanging(true)}
          className="w-full text-center text-sm font-medium text-water-600 hover:underline"
        >
          Đổi mật khẩu
        </button>
      </form>

      {changing && <ChangePasswordDialog onClose={() => setChanging(false)} />}
    </AuthShell>;
}
