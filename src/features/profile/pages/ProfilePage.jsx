import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  ChevronRight,
  Droplet,
  Droplets,
  Flame,
  ImagePlus,
  LogOut,
  Palette,
  Pencil,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  MessageCircle,
} from 'lucide-react';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { userService } from '../../../services/userService';
import { socialService } from '../../../services/socialService';
import { useAuth } from '../../../context/AuthProvider';
import { Avatar } from '../../../components/Avatar';
import { ImageLightbox } from '../../../components/ImageLightbox';
import { useToast } from '../../../components/Toast';
import { eraService } from '../../../services/eraService';

// Nền dựng sẵn: viết đủ chuỗi class để Tailwind không xoá.
const COVERS = {
  ocean: 'from-sky-500 via-cyan-400 to-teal-300',
  sunset: 'from-orange-400 via-rose-400 to-fuchsia-400',
  night: 'from-slate-900 via-indigo-900 to-slate-700',
  mint: 'from-emerald-400 via-teal-300 to-cyan-200',
  peach: 'from-amber-200 via-orange-300 to-rose-300',
};
const COVER_LABELS = { ocean: 'Biển', sunset: 'Hoàng hôn', night: 'Ban đêm', mint: 'Bạc hà', peach: 'Đào' };

export function ProfilePage() {
  const { user, logout, refreshProfile } = useAuth();
  const toast = useToast();
  const avatarRef = useRef(null);
  const coverRef = useRef(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.fullName ?? '');
  const [coverPicker, setCoverPicker] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState(null);
  const [zoomAvatar, setZoomAvatar] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => (await userService.getStats()).data,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => (await socialService.getFriends()).data,
  });
  const partnerName = friends.find((f) => f.id === user?.partnerId)?.fullName ?? null;
  const pendingPartnerName = friends.find((f) => f.isPendingPartner)?.fullName ?? null;
  const partnerLabel = partnerName ?? (pendingPartnerName ? `Đang chờ ${pendingPartnerName} đồng ý` : null);


  const avatar = useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('image', file);
      setUploading('Đang tải ảnh đại diện...');
      return userService.uploadAvatar(form);
    },
    onSuccess: async () => {
      await refreshProfile();
      toast.show('Đã cập nhật ảnh đại diện');
    },
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setUploading(null),
  });

  // Ảnh bìa: tải ảnh lên, chọn nền dựng sẵn, hoặc trả về mặc định (payload rỗng).
  const cover = useMutation({
    mutationFn: async (payload = {}) => {
      const form = new FormData();
      if (payload.file) {
        form.append('image', payload.file);
        setUploading('Đang tải ảnh bìa...');
      } else if (payload.preset) {
        form.append('preset', payload.preset);
      }
      return userService.updateCover(form);
    },
    onSuccess: async () => {
      await refreshProfile();
      setCoverPicker(false);
      toast.show('Đã cập nhật ảnh bìa');
    },
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setUploading(null),
  });

  const rename = useMutation({
    mutationFn: async () => userService.updateProfile({ fullName: name.trim() }),
    onSuccess: async () => {
      await refreshProfile();
      setEditingName(false);
      toast.show('Đã đổi tên hiển thị');
    },
    onError: (err) => setError(errorMessage(err)),
  });

  // Tiến hoá giờ theo kỷ nguyên + giọt (mua bằng ngày uống nước), không theo streak nữa.
  const { data: eraCatalog } = useQuery({
    queryKey: ['eras'],
    queryFn: async () => (await eraService.getCatalog()).data,
    staleTime: 30_000,
  });
  const topEra = (eraCatalog?.eras ?? []).reduce((best, e) => {
    if (e.unlockedLevel <= 0) return best;
    if (!best) return e;
    return e.unlockedLevel > best.unlockedLevel ? e : best;
  }, null);

  if (!user) return null;

  const coverUrl = user.coverUrl ?? '';
  const presetId = coverUrl.startsWith('preset:') ? coverUrl.slice('preset:'.length) : null;
  const coverImage = coverUrl && !presetId ? mediaUrl(coverUrl) : null;
  const coverClass = COVERS[presetId] ?? 'from-water-600 via-cyan-500 to-teal-400';

  const statCards = [
    { label: 'Chuỗi hiện tại', value: stats?.currentStreak ?? 0, unit: 'ngày', icon: Flame, tone: 'bg-orange-50 text-orange-500' },
    { label: 'Ngày hoàn thành', value: stats?.completedDays ?? 0, unit: 'ngày', icon: Trophy, tone: 'bg-amber-50 text-amber-500' },
    { label: 'Tổng đã uống', value: ((stats?.totalMl ?? 0) / 1000).toFixed(1), unit: 'lít', icon: Droplet, tone: 'bg-water-50 text-water-600' },
    { label: 'Giọt đang có', value: user?.coins ?? 0, unit: 'giọt', icon: Droplets, tone: 'bg-sky-50 text-sky-600' },
  ];


  return (
    <div className="space-y-4">
      {/* Hồ sơ: ảnh bìa đổi được, avatar, đăng xuất */}
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className={`relative h-36 bg-gradient-to-br ${coverClass}`}>
          {coverImage && <img src={coverImage} alt="Ảnh bìa" className="size-full object-cover" />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

          <button
            onClick={() => setCoverPicker(true)}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <Palette className="size-3.5" /> Đổi nền
          </button>
        </div>

        <div className="-mt-14 px-5 pb-5">
          <div className="flex items-end justify-between gap-3">
            <div className="relative">
              <button
                onClick={() => setZoomAvatar(true)}
                className="block rounded-full transition hover:scale-[1.03]"
                aria-label="Phóng to ảnh đại diện"
                title="Bấm để phóng to ảnh"
              >
                <Avatar url={user.avatarUrl} name={user.fullName} size="xl" className="shadow-lg ring-4 ring-white" />
              </button>
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full bg-water-600 p-2 text-white shadow ring-2 ring-white transition hover:bg-water-700"
                aria-label="Đổi ảnh đại diện"
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) avatar.mutate(file);
                  e.target.value = '';
                }}
              />
            </div>

            {uploading && (
              <span className="rounded-full bg-water-50 px-2.5 py-1 text-[11px] font-medium text-water-700">{uploading}</span>
            )}
          </div>

          <div className="mt-3">
            {editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) rename.mutate();
                }}
                className="flex gap-2"
              >
                <input
                  value={name}
                  maxLength={100}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:border-water-400 focus:outline-none"
                />
                <button disabled={rename.isPending} className="rounded-xl bg-water-600 px-3 py-1.5 text-white" aria-label="Lưu tên">
                  <Save className="size-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold text-slate-900">{user.fullName}</h1>
                <button
                  onClick={() => {
                    setName(user.fullName);
                    setEditingName(true);
                  }}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Đổi tên hiển thị"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            )}
            <p className="truncate text-sm text-slate-500">{user.email}</p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {user.role === 'Admin' ? 'Quản trị viên' : 'Thành viên'}
              {stats ? ` · tham gia ${new Date(stats.joinedAt).toLocaleDateString('vi-VN')}` : ''}
            </p>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statCards.map(({ label, value, unit, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
            <span className={`mx-auto flex size-8 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="size-4" />
            </span>
            <p className="mt-1.5 text-lg font-bold leading-tight text-slate-900">{value}</p>
            <p className="text-[10px] leading-tight text-slate-500">
              {unit}
              <span className="block">{label}</span>
            </p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <Link to="/friends" className="flex items-center gap-3 px-4 py-3.5 text-sm transition hover:bg-slate-50">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ShieldCheck className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-slate-800">Partner duyệt ảnh</span>
            <span className="block truncate text-xs text-slate-500">{partnerLabel ?? 'Chưa chọn người duyệt'}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-slate-300" />
        </Link>
        <Link to="/settings" className="flex items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-sm transition hover:bg-slate-50">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-600">
            <Settings className="size-4" />
          </span>
          <span className="flex-1 font-medium text-slate-800">Mục tiêu nước &amp; loại cốc</span>
          <ChevronRight className="size-4 shrink-0 text-slate-300" />
        </Link>
        <Link to="/chat" className="flex items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-sm transition hover:bg-slate-50">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <MessageCircle className="size-4" />
          </span>
          <span className="flex-1 font-medium text-slate-800">Chat với bạn bè</span>
          <ChevronRight className="size-4 shrink-0 text-slate-300" />
        </Link>
        <Link to="/mascot" className="flex items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-sm transition hover:bg-slate-50">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Sparkles className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-slate-800">Linh vật giọt nước</span>
            <span className="block truncate text-xs text-slate-500">
              {topEra ? `Cấp ${topEra.unlockedLevel} · ${topEra.title}` : 'Chưa mở kỷ nguyên'} · {eraCatalog?.coins ?? 0} giọt
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-slate-300" />
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-sm transition hover:bg-rose-50">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <LogOut className="size-4" />
          </span>
          <span className="flex-1 text-left font-medium text-rose-600">Đăng xuất</span>
        </button>
      </section>

      {/* Chọn nền ảnh bìa */}
      {coverPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Nền ảnh bìa</h3>
            <p className="mt-0.5 text-xs text-slate-500">Chọn màu dựng sẵn hoặc tải ảnh của bạn.</p>

            <div className="mt-3 grid grid-cols-5 gap-2">
              {Object.entries(COVERS).map(([id, cls]) => (
                <button
                  key={id}
                  onClick={() => cover.mutate({ preset: id })}
                  className={`h-14 rounded-xl bg-gradient-to-br ${cls} ${presetId === id ? 'ring-2 ring-water-500 ring-offset-2' : ''}`}
                  aria-label={`Nền ${COVER_LABELS[id]}`}
                  title={COVER_LABELS[id]}
                />
              ))}
            </div>

            <div className="mt-3 grid gap-2">
              <button
                onClick={() => coverRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white transition hover:bg-water-700"
              >
                <ImagePlus className="size-4" /> Tải ảnh từ máy
              </button>
              {!!coverUrl && (
                <button
                  onClick={() => cover.mutate({})}
                  className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
                >
                  Dùng nền mặc định
                </button>
              )}
              <button onClick={() => setCoverPicker(false)} className="py-1 text-xs text-slate-500">
                Đóng
              </button>
            </div>

            <input
              ref={coverRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) cover.mutate({ file });
                e.target.value = '';
              }}
            />
          </div>
        </div>
      )}
    {zoomAvatar && user?.avatarUrl && (
        <ImageLightbox
          src={mediaUrl(user.avatarUrl)}
          alt={user.fullName}
          onClose={() => setZoomAvatar(false)}
        />
      )}
    </div>
  );
}
