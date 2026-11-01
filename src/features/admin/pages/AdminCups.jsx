import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CupSoda, Plus, Trash2 } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useToast } from '../../../components/Toast';

/** Quản lý catalog cốc mẫu: mọi người dùng thấy các cốc này trong ô "Chọn loại cốc". */
export function AdminCups() {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('250');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState(null);

  const { data: cups = [], isLoading } = useQuery({
    queryKey: ['admin-cups'],
    queryFn: async () => (await adminService.listCatalogCups()).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('volumeMl', String(Number(volume) || 0));
      if (file) form.append('image', file);
      return adminService.createCatalogCup(form);
    },
    onSuccess: async () => {
      toast.show('Đã thêm cốc mẫu', 'Người dùng sẽ thấy cốc này trong ô chọn loại cốc.');
      setName('');
      setVolume('250');
      setFile(null);
      setPreview('');
      await qc.invalidateQueries({ queryKey: ['admin-cups'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: async (id) => adminService.deleteCatalogCup(id),
    onSuccess: async () => {
      toast.show('Đã xoá cốc mẫu');
      await qc.invalidateQueries({ queryKey: ['admin-cups'] });
    },
    onError: (err) => toast.show('Không xoá được', errorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Loại cốc mẫu</h1>
        <p className="text-sm text-slate-500">
          Cốc ở đây hiện cho mọi người dùng trong ô “Chọn loại cốc” khi thêm nước.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Plus className="size-4" /> Thêm cốc mẫu
        </h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Tên cốc (vd: Cốc sứ mèo)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-water-400 focus:outline-none"
          />
          <input
            type="number"
            min={50}
            max={5000}
            step={10}
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-water-400 focus:outline-none"
            aria-label="Dung tích ml"
          />
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-water-400 hover:text-water-700">
            <CupSoda className="size-4" />
            {file ? 'Đổi ảnh' : 'Chọn ảnh'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFile(f ?? null);
                setPreview((old) => {
                  if (old) URL.revokeObjectURL(old);
                  return f ? URL.createObjectURL(f) : '';
                });
              }}
            />
          </label>
        </div>
        {preview && <img src={preview} alt="Xem trước ảnh cốc" className="mt-2 h-24 rounded-xl object-contain ring-1 ring-slate-200" />}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !name.trim() || !Number(volume)}
          className="mt-3 rounded-xl bg-water-600 px-4 py-2 text-sm font-semibold text-white hover:bg-water-700 disabled:opacity-50"
        >
          {create.isPending ? 'Đang thêm…' : 'Thêm vào catalog'}
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
          Catalog hiện tại ({cups.length})
        </div>
        {isLoading ? (
          <div className="p-4"><DearlyLoader size="sm" /></div>
        ) : cups.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">Chưa có cốc mẫu nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cups.map((cup) => (
              <li key={cup.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">
                  {cup.cutoutUrl || cup.imageUrl ? (
                    <img src={mediaUrl(cup.cutoutUrl || cup.imageUrl)} alt={cup.name} className="size-full object-contain" />
                  ) : (
                    <CupSoda className="size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{cup.name}</span>
                  <span className="block text-xs text-slate-500">{cup.volumeMl} ml</span>
                </span>
                <button
                  onClick={() => {
                    if (window.confirm(`Xoá cốc mẫu “${cup.name}”?`)) remove.mutate(cup.id);
                  }}
                  disabled={remove.isPending}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  aria-label={`Xoá cốc ${cup.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdminCups;
