import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider';
import { errorMessage } from '../../../services/apiClient';
import {
  AuthShell,
  Field,
  PasswordInput,
  SubmitButton,
  inputClass
} from '../components/AuthShell';
export function RegisterPage() {
  const {
    register
  } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, password, fullName);
      location.href = '/';
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return <AuthShell footer={<>
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-water-600 hover:underline">
            Đăng nhập
          </Link>
        </>}>
      <h2 className="text-2xl font-bold text-slate-900">Tạo tài khoản</h2>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Mục tiêu mặc định 2000 ml/ngày, đổi được ngay sau khi đăng nhập.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field icon={<User className="size-4" />} label="Họ tên">
          <input required maxLength={100} value={fullName} placeholder="Nguyễn Văn A" onChange={e => setFullName(e.target.value)} className={inputClass} />
        </Field>

        <Field icon={<Mail className="size-4" />} label="Email">
          <input type="email" required value={email} placeholder="ban@email.com" onChange={e => setEmail(e.target.value)} className={inputClass} />
        </Field>

        <Field icon={<Lock className="size-4" />} label="Mật khẩu">
          <PasswordInput value={password} onChange={setPassword} placeholder="Tối thiểu 6 ký tự" minLength={6} />
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <SubmitButton busy={busy}>Đăng ký</SubmitButton>
      </form>
    </AuthShell>;
}
