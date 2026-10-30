import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Coins,
  GripVertical,
  ImagePlus,
  Layers,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { cleanSpriteFile } from '../../../utils/cleanSprite';
import { CURRENCY_ICON_KEYS } from '../../../features/mascot/currencyIcons';
import { CurrencyIcon } from '../../mascot/components/CurrencyIcon';

const emptyLevel = (level) => ({
  level,
  name: `Cấp ${level}`,
  description: '',
  artifact: '',
  price: level === 1 ? 40 : level * 120,
  imageUrl: '',
});

const emptyEra = () => ({
  id: null,
  order: 0,
  title: '',
  subtitle: '',
  bgFrom: '#f4fbff',
  bgTo: '#aedcf0',
  unlockPrice: 300,
  isActive: true,
  groupId: null,
  groupName: null,
  levels: [1, 2, 3, 4, 5].map(emptyLevel),
});

const inputClass = 'rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-water-400';
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500';

/** Admin tạo/sửa kỷ nguyên: thông tin, nhóm, 5 cấp (tên/mô tả/giá/ảnh). */
export function AdminEras() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(0);
  const [dragId, setDragId] = useState(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [groupOpen, setGroupOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  // Popup xác nhận sau mỗi lần lưu (tự tắt sau 2,4s).
  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  };

  const { data: eras = [], isLoading } = useQuery({
    queryKey: ['admin-eras'],
    queryFn: async () => (await adminService.listEras()).data,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['admin-era-groups'],
    queryFn: async () => (await adminService.listEraGroups()).data,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['admin-currencies'],
    queryFn: async () => (await adminService.listCurrencies()).data,
  });

  // Không dùng effect: giá trị hiển thị suy ra từ draft hoặc kỷ nguyên đầu tiên.
  const form = draft ?? eras[0] ?? emptyEra();

  const shown = useMemo(
    () =>
      eras.filter((e) => {
        if (groupFilter === 'none' && e.groupId) return false;
        if (groupFilter && groupFilter !== 'none' && e.groupId !== groupFilter) return false;
        if (search.trim() && !e.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
        return true;
      }),
    [eras, groupFilter, search],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-eras'] });
  const invalidateGroups = () => qc.invalidateQueries({ queryKey: ['admin-era-groups'] });

  // Kéo thả: dời kỷ nguyên đang kéo tới vị trí của kỷ nguyên đích rồi lưu lại Order 1..n.
  const reorder = useMutation({
    mutationFn: (ids) => adminService.reorderEras(ids),
    onSuccess: async () => {
      notify('Đã cập nhật thứ tự kỷ nguyên.');
      await invalidate();
    },
    onError: async () => {
      setStatus('Đổi thứ tự thất bại.');
      await invalidate();
    },
  });

  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = eras.findIndex((e) => e.id === dragId);
    const to = eras.findIndex((e) => e.id === targetId);
    setDragId(null);
    if (from < 0 || to < 0) return;

    const next = [...eras];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Cập nhật sớm để danh sách không nhảy về vị trí cũ trong lúc chờ server.
    qc.setQueryData(
      ['admin-eras'],
      next.map((e, i) => ({ ...e, order: i + 1 })),
    );
    reorder.mutate(next.map((e) => e.id));
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        order: Number(form.order) || 0,
        title: form.title,
        subtitle: form.subtitle,
        bgFrom: form.bgFrom,
        bgTo: form.bgTo,
        unlockPrice: Number(form.unlockPrice) || 0,
        isActive: form.isActive,
        groupId: form.groupId || null,
        levels: form.levels.map((l) => ({
          level: l.level,
          name: l.name,
          description: l.description,
          artifact: l.artifact,
          price: Number(l.price) || 0,
          imageUrl: l.imageUrl || null,
        })),
      };
      return form.id ? adminService.updateEra(form.id, payload) : adminService.createEra(payload);
    },
    onSuccess: async (res) => {
      setDraft(res.data);
      notify('Đã lưu kỷ nguyên.');
      await invalidate();
      await invalidateGroups();
    },
    onError: (err) => setStatus(err?.response?.data?.title ?? 'Lưu thất bại.'),
  });

  const remove = useMutation({
    mutationFn: (id) => adminService.deleteEra(id),
    onSuccess: async () => {
      setDraft(null);
      notify('Đã xoá kỷ nguyên.');
      await invalidate();
      await invalidateGroups();
    },
    onError: () => setStatus('Xoá thất bại.'),
  });

  const upload = async (level, file) => {
    if (!form.id || !file) {
      setStatus('Lưu kỷ nguyên trước rồi mới tải ảnh được.');
      return;
    }
    setUploading(level);
    try {
      // Làm sạch trước khi gửi: tách nền trắng, cắt sát nhân vật, bỏ dải nhãn/chữ ở đáy.
      let cleaned = file;
      try {
        cleaned = await cleanSpriteFile(file);
      } catch {
        cleaned = file; // ảnh lạ (không đọc được bằng canvas) thì gửi nguyên bản
      }

      const body = new FormData();
      body.append('image', cleaned);
      const res = await adminService.uploadEraLevelImage(form.id, level, body);
      setDraft(res.data);
      notify(`Đã tải ảnh cho cấp ${level}.`);
      await invalidate();
    } catch {
      setStatus('Tải ảnh thất bại (chỉ nhận JPEG/PNG/WebP ≤ 5 MB).');
    } finally {
      setUploading(0);
    }
  };

  const setLevel = (level, patch) =>
    setDraft((f) => {
      const base = f ?? form;
      return { ...base, levels: base.levels.map((l) => (l.level === level ? { ...l, ...patch } : l)) };
    });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kỷ nguyên linh vật</h1>
          <p className="text-sm text-slate-500">
            Kéo thả để đổi thứ tự · gán nhóm · đặt giá và tải ảnh từng cấp, không cần sửa code.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCurrencyOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            <Coins className="size-4" /> Tiền tệ ({currencies.length})
          </button>
          <button
            onClick={() => setGroupOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            <Layers className="size-4" /> Nhóm ({groups.length})
          </button>
          <button
            onClick={() => {
              setDraft(emptyEra());
              setStatus('Đang tạo kỷ nguyên mới.');
            }}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> Kỷ nguyên mới
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[270px_1fr]">
        <aside className="h-fit space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 md:sticky md:top-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kỷ nguyên…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-water-400"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {[{ id: '', name: 'Tất cả' }, ...groups, { id: 'none', name: 'Chưa nhóm' }].map((g) => (
              <button
                key={g.id || 'all'}
                onClick={() => setGroupFilter(g.id)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  groupFilter === g.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {isLoading && <p className="text-sm text-slate-500">Đang tải…</p>}

          <div className="space-y-1">
            {shown.map((e) => (
              <div
                key={e.id}
                draggable
                onDragStart={() => setDragId(e.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={() => dropOn(e.id)}
                className={`group flex cursor-grab items-center gap-1 rounded-xl px-1 py-1.5 active:cursor-grabbing ${
                  form.id === e.id ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-slate-50'
                } ${dragId === e.id ? 'opacity-40' : ''}`}
              >
                <GripVertical className="size-3.5 shrink-0 text-slate-300" />
                <button onClick={() => setDraft(e)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                    style={{ background: e.bgTo }}
                  >
                    {e.levels?.[0]?.imageUrl ? (
                      <img src={e.levels[0].imageUrl} alt="" className="size-8 object-contain" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">#{e.order}</span>
                      <span
                        className={`truncate text-[13px] ${
                          form.id === e.id ? 'font-semibold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {e.title}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1">
                      {e.groupName ? (
                        <span className="rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-500">
                          {e.groupName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">chưa nhóm</span>
                      )}
                      {!e.isActive && <span className="text-[10px] text-slate-400">· ẩn</span>}
                    </span>
                  </span>
                </button>
              </div>
            ))}
            {!isLoading && shown.length === 0 && (
              <p className="px-1 py-2 text-xs text-slate-500">Không có kỷ nguyên khớp bộ lọc.</p>
            )}
          </div>

          {eras.length > 1 && (
            <p className="border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-400">
              Kéo thả để đổi vị trí — kỷ nguyên trên cùng hiện đầu tiên cho người dùng.
            </p>
          )}
        </aside>

        <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="space-y-2 rounded-xl border border-slate-100 p-3">
            <p className="text-xs font-semibold text-slate-700">Thông tin chung</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={labelClass}>
                Tên kỷ nguyên
                <input
                  value={form.title}
                  onChange={(e) => setDraft({ ...form, title: e.target.value })}
                  className={`mt-1 w-full ${inputClass}`}
                  placeholder="Kỷ nguyên Băng giá"
                />
              </label>
              <label className={labelClass}>
                Mô tả ngắn
                <input
                  value={form.subtitle}
                  onChange={(e) => setDraft({ ...form, subtitle: e.target.value })}
                  className={`mt-1 w-full ${inputClass}`}
                  placeholder="Băng, tuyết, sức mạnh vĩnh cửu"
                />
              </label>
              <label className={labelClass}>
                Giá mở khoá (giọt)
                <input
                  type="number"
                  value={form.unlockPrice}
                  onChange={(e) => setDraft({ ...form, unlockPrice: e.target.value })}
                  className={`mt-1 w-full ${inputClass}`}
                />
              </label>
              <label className={labelClass}>
                Thứ tự (đổi bằng kéo thả)
                <input
                  type="number"
                  value={form.order}
                  readOnly
                  disabled
                  className={`mt-1 w-full ${inputClass} bg-slate-50 text-slate-500`}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Nền từ
                <input
                  type="color"
                  value={form.bgFrom || '#f4fbff'}
                  onChange={(e) => setDraft({ ...form, bgFrom: e.target.value })}
                  className="h-8 w-12 rounded border border-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                đến
                <input
                  type="color"
                  value={form.bgTo || '#aedcf0'}
                  onChange={(e) => setDraft({ ...form, bgTo: e.target.value })}
                  className="h-8 w-12 rounded border border-slate-200"
                />
              </label>
              <span
                className="h-8 flex-1 rounded-md"
                style={{ background: `linear-gradient(120deg, ${form.bgFrom}, ${form.bgTo})` }}
              />
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setDraft({ ...form, isActive: e.target.checked })}
                />
                Hiển thị cho người dùng
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 p-3">
            <label className={`${labelClass} min-w-[200px] flex-1`}>
              <span className="flex items-center gap-1">
                <Layers className="size-3.5" /> Nhóm kỷ nguyên
              </span>
              <select
                value={form.groupId ?? ''}
                onChange={(e) => {
                  const g = groups.find((x) => x.id === e.target.value);
                  setDraft({ ...form, groupId: g?.id ?? null, groupName: g?.name ?? null });
                }}
                className={`mt-1 w-full ${inputClass}`}
              >
                <option value="">— Chưa xếp nhóm —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} · {g.slug}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setGroupOpen(true)}
              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Quản lý nhóm
            </button>
            {(() => {
              const g = groups.find((x) => x.id === form.groupId);
              if (!g) return null;
              return (
                <GroupEconomyEditor
                  key={`${g.id}|${g.currencyId ?? ''}|${g.awardBase}|${g.awardPerStreakDay}`}
                  group={g}
                  currencies={currencies}
                  notify={notify}
                  onSaved={async () => {
                    await invalidateGroups();
                    notify(`Đã lưu tiền & luật phát điểm cho nhóm “${g.name}”.`);
                  }}
                />
              );
            })()}
            <p className="w-full text-[11px] text-slate-400">
              Nhắc nhở sau này lấy kỷ nguyên theo nhóm: <code>/api/eras?group=slug</code>. Nhớ bấm “Lưu thay đổi”.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">5 cấp của kỷ nguyên</p>
              <p className="flex items-center gap-1 text-[11px] text-water-700">
                <Sparkles className="size-3.5" /> Ảnh tự tách nền, cắt sát, bỏ chữ/số ở đáy
              </p>
            </div>
            {form.levels.map((l) => (
              <div key={l.level} className="rounded-xl border border-slate-100 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-bold text-slate-500 ring-1 ring-slate-100"
                    style={{ background: form.bgTo }}
                    title={`Cấp ${l.level}`}
                  >
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt="" className="size-11 object-contain" />
                    ) : (
                      `C${l.level}`
                    )}
                  </span>
                  <input
                    value={l.name}
                    onChange={(e) => setLevel(l.level, { name: e.target.value })}
                    placeholder="Tên cấp"
                    className={`min-w-0 flex-1 ${inputClass}`}
                  />
                  <input
                    type="number"
                    value={l.price}
                    onChange={(e) => setLevel(l.level, { price: e.target.value })}
                    className={`w-24 ${inputClass}`}
                    aria-label={`Giá cấp ${l.level}`}
                  />
                  <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                    {uploading === l.level ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    Ảnh
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => upload(l.level, e.target.files?.[0])}
                    />
                  </label>
                </div>
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  <input
                    value={l.artifact}
                    onChange={(e) => setLevel(l.level, { artifact: e.target.value })}
                    placeholder="Thần khí / phụ kiện"
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-water-400"
                  />
                  <input
                    value={l.description}
                    onChange={(e) => setLevel(l.level, { description: e.target.value })}
                    placeholder="Mô tả ngắn"
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-water-400"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.title.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-water-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {form.id ? 'Lưu thay đổi' : 'Tạo kỷ nguyên'}
            </button>
            {form.id && (
              <button
                onClick={() => {
                  if (confirm(`Xoá kỷ nguyên "${form.title}"? Tiến độ của người dùng trong kỷ nguyên này cũng mất.`))
                    remove.mutate(form.id);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
              >
                <Trash2 className="size-4" /> Xoá
              </button>
            )}
            {status && <span className="text-xs font-medium text-slate-600">{status}</span>}
          </div>
        </section>
      </div>

      {groupOpen && (
        <GroupDialog
          groups={groups}
          notify={notify}
          currencies={currencies}
          onCurrenciesChanged={() => qc.invalidateQueries({ queryKey: ['admin-currencies'] })}
          onClose={() => setGroupOpen(false)}
          onCreated={async (g) => {
            setDraft((f) => ({ ...(f ?? form), groupId: g.id, groupName: g.name }));
            setStatus(`Đã tạo nhóm “${g.name}” — bấm “Lưu thay đổi” để gán vào kỷ nguyên này.`);
            await invalidateGroups();
          }}
          onChanged={invalidateGroups}
          onDeleted={async () => {
            await invalidateGroups();
            await invalidate();
          }}
        />
      )}

      {toast && (
        <div className="fixed right-4 top-3 z-[60] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <Check className="size-4" /> {toast}
        </div>
      )}

      {currencyOpen && (
        <CurrencyDialog
          currencies={currencies}
          notify={notify}
          onClose={() => setCurrencyOpen(false)}
          onChanged={async () => {
            await qc.invalidateQueries({ queryKey: ['admin-currencies'] });
            await invalidateGroups();
          }}
        />
      )}
    </div>
  );
}

/** Hộp thoại quản lý nhóm: tạo, đổi tên (kèm slug), chọn tiền + luật phát điểm và xoá nhóm. */
function GroupDialog({ groups, currencies, notify, onClose, onCreated, onChanged, onCurrenciesChanged, onDeleted }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('#aedcf0');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { id, name, slug, color, currencyId, awardBase, awardPerStreakDay }

  const create = useMutation({
    mutationFn: () => adminService.createEraGroup({ name, slug, color }),
    onSuccess: async (res) => {
      setName('');
      setSlug('');
      setColor('#aedcf0');
      setError('');
      notify?.(`Đã tạo nhóm “${res.data.name}”.`);
      await onCreated(res.data);
    },
    onError: (err) => setError(err?.response?.data?.title ?? 'Tạo nhóm thất bại.'),
  });

  const rename = useMutation({
    mutationFn: () =>
      adminService.updateEraGroup(editing.id, {
        name: editing.name,
        slug: editing.slug,
        color: editing.color,
        currencyId: editing.currencyId || null,
        awardBase: Number(editing.awardBase) || 0,
        awardPerStreakDay: Number(editing.awardPerStreakDay) || 0,
      }),
    onSuccess: async () => {
      setEditing(null);
      setError('');
      notify?.('Đã lưu nhóm kỷ nguyên.');
      await onChanged();
      await onCurrenciesChanged?.();
    },
    onError: (err) => setError(err?.response?.data?.title ?? 'Lưu nhóm thất bại.'),
  });

  const remove = useMutation({
    mutationFn: (id) => adminService.deleteEraGroup(id),
    onSuccess: async () => {
      setError('');
      notify?.('Đã xoá nhóm.');
      await onDeleted();
    },
    onError: () => setError('Xoá nhóm thất bại.'),
  });

  const edit = (g) =>
    setEditing({
      id: g.id,
      name: g.name,
      slug: g.slug,
      color: g.color,
      currencyId: g.currencyId ?? '',
      awardBase: g.awardBase,
      awardPerStreakDay: g.awardPerStreakDay,
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl space-y-3 rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">Nhóm kỷ nguyên</h2>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-[11px] leading-snug text-slate-500">
          Mỗi nhóm là một <b>bộ giao diện</b> (Nước, Uống thuốc, Ăn, Ngủ…). Chọn <b>tiền</b> dùng để mua kỷ nguyên trong
          nhóm và <b>luật phát điểm</b> của nhóm đó.
        </p>

        <div className="max-h-72 space-y-1.5 overflow-auto">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-slate-100 p-2">
              {editing?.id === g.id ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={editing.color || '#aedcf0'}
                      onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                      className="h-8 w-9 shrink-0 rounded border border-slate-200"
                      aria-label="Màu nhóm"
                    />
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className="min-w-0 flex-1 rounded border border-slate-200 px-1.5 py-1 text-sm"
                    />
                    <input
                      value={editing.slug}
                      onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                      className="w-24 rounded border border-slate-200 px-1.5 py-1 text-xs"
                      placeholder="slug"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex flex-1 items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Coins className="size-3.5" /> Tiền
                      <select
                        value={editing.currencyId || ''}
                        onChange={(e) => setEditing({ ...editing, currencyId: e.target.value })}
                        className="min-w-0 flex-1 rounded border border-slate-200 px-1.5 py-1 text-xs font-normal text-slate-700"
                      >
                        <option value="">Giọt (mặc định)</option>
                        {currencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {c.code}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      +/lần
                      <input
                        type="number"
                        value={editing.awardBase}
                        onChange={(e) => setEditing({ ...editing, awardBase: e.target.value })}
                        className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      +/ngày chuỗi
                      <input
                        type="number"
                        value={editing.awardPerStreakDay}
                        onChange={(e) => setEditing({ ...editing, awardPerStreakDay: e.target.value })}
                        className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs"
                      />
                    </label>
                    <button
                      onClick={() => rename.mutate()}
                      disabled={!editing.name.trim() || rename.isPending}
                      className="rounded bg-water-600 p-1.5 text-white disabled:bg-slate-300"
                      aria-label="Lưu nhóm"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                      aria-label="Huỷ"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: g.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{g.name}</span>
                  <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    <Coins className="size-3" />
                    {g.currencyName ?? 'Giọt'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    +{g.awardBase}/lần · +{g.awardPerStreakDay}/ngày · {g.eraCount} kỷ nguyên
                  </span>
                  <button
                    onClick={() => edit(g)}
                    className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-water-700 hover:bg-water-50"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Xoá nhóm "${g.name}"? Kỷ nguyên trong nhóm chỉ bị bỏ gán, không bị xoá.`))
                        remove.mutate(g.id);
                    }}
                    className="rounded p-1 text-slate-400 hover:text-red-600"
                    aria-label={`Xoá nhóm ${g.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {groups.length === 0 && <p className="text-xs text-slate-500">Chưa có nhóm nào.</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-9 shrink-0 rounded border border-slate-200"
            aria-label="Màu nhóm mới"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên nhóm mới (Uống thuốc, Ăn, Ngủ…)"
            className={`min-w-0 flex-1 ${inputClass}`}
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug (tuỳ chọn)"
            className={`w-32 ${inputClass}`}
          />
          <button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300"
          >
            {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Tạo nhóm
          </button>
        </div>
        <p className="text-[11px] text-slate-400">Tạo nhóm xong vào “Sửa” để chọn tiền và luật phát điểm.</p>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}

/** Hộp thoại quản lý tiền tệ: tạo loại tiền mới (tên/mã/icon/màu) và tặng thử điểm cho một email. */
function CurrencyDialog({ currencies, notify, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [iconKey, setIconKey] = useState('star');
  const [color, setColor] = useState('#f0b429');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { id, name, code, iconKey, color }
  const [grant, setGrant] = useState({ currencyId: '', email: '', amount: 100 });
  const [grantMsg, setGrantMsg] = useState('');

  const create = useMutation({
    mutationFn: () => adminService.createCurrency({ name, code, iconKey, color }),
    onSuccess: async (res) => {
      setName('');
      setCode('');
      setError('');
      notify?.(`Đã tạo tiền “${res.data.name}”.`);
      await onChanged();
    },
    onError: (err) => setError(err?.response?.data?.title ?? 'Tạo tiền thất bại.'),
  });

  const rename = useMutation({
    mutationFn: () =>
      adminService.updateCurrency(editing.id, {
        name: editing.name,
        code: editing.code,
        iconKey: editing.iconKey,
        color: editing.color,
      }),
    onSuccess: async () => {
      setEditing(null);
      setError('');
      notify?.('Đã lưu loại tiền.');
      await onChanged();
    },
    onError: (err) => setError(err?.response?.data?.title ?? 'Lưu tiền thất bại.'),
  });

  const remove = useMutation({
    mutationFn: (id) => adminService.deleteCurrency(id),
    onSuccess: async () => {
      setError('');
      notify?.('Đã xoá loại tiền.');
      await onChanged();
    },
    onError: (err) => setError(err?.response?.data?.title ?? 'Xoá tiền thất bại.'),
  });

  const doGrant = useMutation({
    mutationFn: () => adminService.grantCurrency(grant.currencyId, { email: grant.email, amount: Number(grant.amount) || 0 }),
    onSuccess: async (res) => {
      setGrantMsg(`Đã phát cho ${grant.email}: còn ${res.data.amount} ${res.data.name}.`);
      notify?.(`Đã phát ${res.data.amount} ${res.data.name} cho ${grant.email}.`);
      await onChanged();
    },
    onError: (err) => setGrantMsg(err?.response?.data?.title ?? 'Phát điểm thất bại.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl space-y-3 rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">Tiền tệ</h2>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-[11px] leading-snug text-slate-500">
          Mỗi nhóm kỷ nguyên tiêu một loại tiền riêng. <b>Giọt</b> là tiền mặc định (kiếm từ chuỗi uống nước); tạo thêm
          loại khác cho nhắc uống thuốc / ăn / ngủ rồi gán ở hộp thoại <b>Nhóm</b>.
        </p>

        <div className="max-h-60 space-y-1.5 overflow-auto">
          {currencies.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-100 p-2">
              {editing?.id === c.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={editing.color || '#f0b429'}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    className="h-8 w-9 shrink-0 rounded border border-slate-200"
                    aria-label="Màu tiền"
                  />
                  <select
                    value={editing.iconKey}
                    onChange={(e) => setEditing({ ...editing, iconKey: e.target.value })}
                    className="rounded border border-slate-200 px-1.5 py-1 text-xs"
                  >
                    {CURRENCY_ICON_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="min-w-0 flex-1 rounded border border-slate-200 px-1.5 py-1 text-sm"
                  />
                  <input
                    value={editing.code}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                    className="w-24 rounded border border-slate-200 px-1.5 py-1 text-xs"
                    placeholder="mã"
                  />
                  <button
                    onClick={() => rename.mutate()}
                    disabled={!editing.name.trim() || rename.isPending}
                    className="rounded bg-water-600 p-1.5 text-white disabled:bg-slate-300"
                    aria-label="Lưu tiền"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                    aria-label="Huỷ"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${c.color}33`, color: c.color }}
                  >
                    <CurrencyIcon iconKey={c.iconKey} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{c.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {c.code}
                  </span>
                  {c.isDefault && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      mặc định
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">{c.amount} đang dùng cho nhóm</span>
                  <button
                    onClick={() => setEditing({ id: c.id, name: c.name, code: c.code, iconKey: c.iconKey, color: c.color })}
                    className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-water-700 hover:bg-water-50"
                  >
                    Sửa
                  </button>
                  {!c.isDefault && (
                    <button
                      onClick={() => {
                        if (confirm(`Xoá tiền "${c.name}"? Nhóm đang dùng sẽ quay về Giọt.`)) remove.mutate(c.id);
                      }}
                      className="rounded p-1 text-slate-400 hover:text-red-600"
                      aria-label={`Xoá tiền ${c.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {currencies.length === 0 && <p className="text-xs text-slate-500">Chưa có loại tiền nào.</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-9 shrink-0 rounded border border-slate-200"
            aria-label="Màu tiền mới"
          />
          <select
            value={iconKey}
            onChange={(e) => setIconKey(e.target.value)}
            className="rounded-lg border border-slate-200 px-1.5 py-1.5 text-xs"
            aria-label="Icon tiền mới"
          >
            {CURRENCY_ICON_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên tiền mới (Sao ngủ, Viên thuốc…)"
            className={`min-w-0 flex-1 ${inputClass}`}
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="mã"
            className={`w-28 ${inputClass}`}
          />
          <button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300"
          >
            {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Tạo tiền
          </button>
        </div>

        <div className="space-y-1.5 rounded-xl bg-slate-50 p-2">
          <p className="text-[11px] font-semibold text-slate-600">Phát điểm thử cho một người (theo email)</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={grant.currencyId}
              onChange={(e) => setGrant({ ...grant, currencyId: e.target.value })}
              className="rounded-lg border border-slate-200 px-1.5 py-1.5 text-xs"
              aria-label="Loại tiền phát"
            >
              <option value="">Chọn tiền…</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={grant.email}
              onChange={(e) => setGrant({ ...grant, email: e.target.value })}
              placeholder="email người nhận"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            />
            <input
              type="number"
              value={grant.amount}
              onChange={(e) => setGrant({ ...grant, amount: e.target.value })}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              aria-label="Số điểm"
            />
            <button
              onClick={() => doGrant.mutate()}
              disabled={!grant.currencyId || !grant.email.trim() || doGrant.isPending}
              className="rounded-lg bg-water-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300"
            >
              Phát
            </button>
          </div>
          {grantMsg && <p className="text-[11px] font-medium text-slate-600">{grantMsg}</p>}
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}

/** Chọn tiền + luật phát điểm cho nhóm ngay trong form kỷ nguyên (không phải mở hộp thoại Nhóm). */
function GroupEconomyEditor({ group, currencies, onSaved, notify }) {
  const [currencyId, setCurrencyId] = useState(group.currencyId ?? '');
  const [awardBase, setAwardBase] = useState(group.awardBase ?? 10);
  const [awardPerStreakDay, setAwardPerStreakDay] = useState(group.awardPerStreakDay ?? 3);

  const save = useMutation({
    mutationFn: () =>
      adminService.updateEraGroup(group.id, {
        name: group.name,
        slug: group.slug,
        color: group.color,
        currencyId: currencyId || null,
        awardBase: Number(awardBase) || 0,
        awardPerStreakDay: Number(awardPerStreakDay) || 0,
      }),
    onSuccess: () => {
      notify?.(`Đã lưu tiền & luật phát điểm cho nhóm “${group.name}”.`);
      onSaved?.();
    },
  });

  const picked = currencies.find((c) => c.id === currencyId);

  return (
    <div className="w-full space-y-1.5 rounded-lg bg-slate-50 p-2">
      <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
        <Coins className="size-3.5" /> Tiền để mua kỷ nguyên trong nhóm “{group.name}”
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={currencyId}
          onChange={(e) => setCurrencyId(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
          aria-label="Tiền của nhóm"
        >
          <option value="">Giọt (mặc định)</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.code}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          +/lần
          <input
            type="number"
            value={awardBase}
            onChange={(e) => setAwardBase(e.target.value)}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            aria-label="Điểm mỗi lần"
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          +/ngày chuỗi
          <input
            type="number"
            value={awardPerStreakDay}
            onChange={(e) => setAwardPerStreakDay(e.target.value)}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            aria-label="Điểm mỗi ngày chuỗi"
          />
        </label>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300"
        >
          {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Lưu tiền &amp; luật
        </button>
        {save.isError && (
          <span className="text-[11px] font-medium text-red-600">
            {save.error?.response?.data?.title ?? 'Lưu thất bại.'}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400">
        Người dùng mở/nâng cấp kỷ nguyên trong nhóm này sẽ trả bằng{' '}
        <b className="inline-flex items-center gap-1 align-middle text-slate-600">
          <CurrencyIcon iconKey={picked?.iconKey ?? 'droplet'} className="size-3" />
          {picked?.name ?? 'Giọt'}
        </b>
        . Luật phát: +{awardBase || 0} mỗi lần đạt mục tiêu, +{awardPerStreakDay || 0}/ngày chuỗi.
      </p>
    </div>
  );
}

export default AdminEras;
