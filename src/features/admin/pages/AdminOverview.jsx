import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Megaphone, ScrollText, Users } from 'lucide-react';
import { adminService } from '../../../services/adminService';
export function AdminOverview() {
  const users = useQuery({
    queryKey: ['admin-users', 'count'],
    queryFn: async () => (await adminService.listUsers({
        page: 1,
        pageSize: 1
    })).data
  });
  const logs = useQuery({
    queryKey: ['admin-logs', 'count'],
    queryFn: async () => (await adminService.listLogs({
        page: 1,
        pageSize: 1
    })).data
  });
  const errors = useQuery({
    queryKey: ['admin-logs', 'errors'],
    queryFn: async () => (await adminService.listLogs({
        page: 1,
        pageSize: 5,
        level: 'Error'
    })).data
  });
  const cards = [{
    label: 'Người dùng',
    value: users.data?.total,
    icon: Users,
    to: '/admin/users'
  }, {
    label: 'Dòng log',
    value: logs.data?.total,
    icon: ScrollText,
    to: '/admin/logs'
  }, {
    label: 'Lỗi gần đây',
    value: errors.data?.total,
    icon: AlertTriangle,
    to: '/admin/logs?level=Error'
  }];
  return <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Tổng quan hệ thống</h1>
        <p className="text-sm text-slate-500">Quản trị người dùng, thông báo toàn hệ thống và log.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({
        label,
        value,
        icon: Icon,
        to
      }) => <Link key={label} to={to} className="rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <Icon className="size-5 text-amber-500" />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? '—'}</p>
          </Link>)}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Lỗi gần đây</h2>
        {errors.data && errors.data.items.length > 0 ? <ul className="divide-y divide-slate-100">
            {errors.data.items.map(log => <li key={log.id} className="py-2.5 text-sm">
                <p className="font-medium text-slate-800">{log.action}</p>
                <p className="truncate text-xs text-slate-500">{log.details}</p>
                <p className="text-xs text-slate-400">
                  {new Date(log.createdAt).toLocaleString('vi-VN')}
                </p>
              </li>)}
          </ul> : <p className="text-sm text-slate-500">Không có lỗi nào. 🎉</p>}
      </section>

      <Link to="/admin/broadcast" className="flex items-center gap-2 rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
        <Megaphone className="size-5 text-amber-400" />
        <div>
          <p className="text-sm font-semibold">Gửi thông báo toàn hệ thống</p>
          <p className="text-xs text-slate-400">SignalR cho người đang online, push cho người offline.</p>
        </div>
      </Link>
    </div>;
}