import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyRound, Lock, Search, Unlock } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { adminService } from '../../../services/adminService';
import { Avatar } from '../../../components/Avatar';
export function AdminUsers() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  // Mật khẩu tạm vừa sinh: chỉ hiện 1 lần để admin gửi cho người dùng.
  const [issued, setIssued] = useState(null);
  const queryClient = useQueryClient();
  const {
    data
  } = useQuery({
    queryKey: ['admin-users', query],
    queryFn: async () => (await adminService.listUsers({
        page: 1,
        pageSize: 50,
        q: query || undefined
    })).data
  });
  const refresh = () => void queryClient.invalidateQueries({
    queryKey: ['admin-users']
  });
  const setStatus = useMutation({
    mutationFn: async ({
      id,
      isLocked
    }) => adminService.setUserStatus(id, isLocked),
    onSuccess: refresh,
    onError: err => setError(errorMessage(err))
  });
  const setRole = useMutation({
    mutationFn: async ({
      id,
      role
    }) => adminService.setUserRole(id, role),
    onSuccess: refresh,
    onError: err => setError(errorMessage(err))
  });
  const resetPassword = useMutation({
    mutationFn: async (id) => adminService.resetPassword(id),
    onSuccess: res => {
      setError(null);
      setIssued(res.data);
    },
    onError: err => setError(errorMessage(err))
  });
  return <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Người dùng</h1>
        <p className="text-sm text-slate-500">Khóa/mở khóa tài khoản, đổi quyền và đặt lại mật khẩu.</p>
      </header>

      {issued && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <KeyRound className="size-4 shrink-0" />
          <span>
            Mật khẩu tạm của <b>{issued.email}</b>:
            <code className="mx-2 rounded bg-white px-2 py-0.5 font-mono text-base tracking-wide">
              {issued.password}
            </code>
            (chỉ hiện một lần — hãy gửi cho người dùng)
          </span>
          <button
            onClick={() => setIssued(null)}
            className="ml-auto rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-semibold"
          >
            Đã lưu
          </button>
        </div>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
        <form onSubmit={e => {
        e.preventDefault();
        setQuery(search);
      }} className="mb-4 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo email hoặc tên" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
          </div>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Tìm
          </button>
        </form>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Người dùng</th>
                <th className="py-2">Role</th>
                <th className="py-2">Trạng thái</th>
                <th className="py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items ?? []).map(u => <tr key={u.id}>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar url={u.avatarUrl} name={u.fullName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.fullName}</p>
                        <p className="truncate text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <select value={u.role} onChange={e => setRole.mutate({
                  id: u.id,
                  role: e.target.value
                })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs">
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isLocked ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {u.isLocked ? 'Đã khóa' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => {
                          if (confirm(`Đặt lại mật khẩu cho ${u.email}? Mọi thiết bị của họ sẽ bị đăng xuất.`))
                            resetPassword.mutate(u.id);
                        }}
                        disabled={resetPassword.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs disabled:opacity-50"
                      >
                        <KeyRound className="size-3.5" />
                        Reset MK
                      </button>
                      <button onClick={() => setStatus.mutate({
                  id: u.id,
                  isLocked: !u.isLocked
                })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                        {u.isLocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
                        {u.isLocked ? 'Mở khóa' : 'Khóa'}
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-400">Tổng: {data?.total ?? 0} người dùng</p>
      </section>
    </div>;
}