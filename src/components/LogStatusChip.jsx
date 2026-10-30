const styles = {
  Approved: {
    label: 'Đã duyệt',
    className: 'bg-emerald-50 text-emerald-700'
  },
  Pending: {
    label: 'Chờ duyệt',
    className: 'bg-amber-50 text-amber-700'
  },
  Rejected: {
    label: 'Bị từ chối',
    className: 'bg-red-50 text-red-600'
  },
  Unverified: {
    label: 'Chưa xác minh',
    className: 'bg-slate-100 text-slate-500'
  },
  Deducted: {
    label: 'Bị trừ nước',
    className: 'bg-rose-50 text-rose-600'
  }
};
export function LogStatusChip({
  status
}) {
  const style = styles[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-500'
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.className}`}>
      {style.label}
    </span>;
}