import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
export function AdminLogs() {
  const [params, setParams] = useSearchParams();
  const level = params.get('level') ?? '';
  const {
    data
  } = useQuery({
    queryKey: ['admin-logs', level],
    queryFn: async () => (await adminService.listLogs({
        page: 1,
        pageSize: 100,
        level: level || undefined
    })).data
  });
  const colors = {
    Info: 'bg-slate-100 text-slate-600',
    Warning: 'bg-amber-100 text-amber-700',
    Error: 'bg-red-100 text-red-700'
  };
  return <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">System log</h1>
        <p className="text-sm text-slate-500">Đăng nhập, thao tác admin và lỗi hệ thống.</p>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <select value={level} onChange={e => {
          const value = e.target.value;
          if (value) setParams({
            level: value
          });else setParams({});
        }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Tất cả mức</option>
            <option value="Info">Info</option>
            <option value="Warning">Warning</option>
            <option value="Error">Error</option>
          </select>
          <span className="text-xs text-slate-400">Tổng: {data?.total ?? 0}</span>
        </div>

        <ul className="divide-y divide-slate-100">
          {(data?.items ?? []).map(log => <li key={log.id} className="py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[log.logLevel] ?? ''}`}>
                  {log.logLevel}
                </span>
                <span className="font-medium">{log.action}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(log.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              {log.details && <p className="mt-1 truncate text-xs text-slate-500">{log.details}</p>}
            </li>)}
          {(data?.items.length ?? 0) === 0 && <li className="py-2 text-sm text-slate-500">Chưa có log.</li>}
        </ul>
      </section>
    </div>;
}