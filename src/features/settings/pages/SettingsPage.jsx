import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Camera, CupSoda, Trash2, Target, BellRing } from 'lucide-react';
import { errorMessage, mediaUrl, api } from '../../../services/apiClient';
import { userService } from '../../../services/userService';
import { cupService } from '../../../services/cupService';
import { useAuth } from '../../../context/AuthProvider';
import { WaterLoader } from '../../../components/WaterLoader';
import { askNotificationPermission, notificationState, subscribePush } from '../../../utils/notify';
import { isNativeApp, scheduleNativeReminders } from '../../../utils/nativeReminders';
import { cutoutFileFromFile } from '../../../utils/cutout';
import { SettingsTabs } from '../components/SettingsTabs';
import { useToast } from '../../../components/Toast';
/** Tiêu đề mục gọn: icon trong ô màu + tên, không kèm đoạn mô tả dài. */
function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
        <Icon className="size-4" />
      </span>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

export function SettingsPage() {
  const {
    user,
    refreshProfile
  } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [morning, setMorning] = useState(user?.morningTargetMl ?? 700);
  const [afternoon, setAfternoon] = useState(user?.afternoonTargetMl ?? 800);
  const [evening, setEvening] = useState(user?.eveningTargetMl ?? 500);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!user) return;
    setMorning(user.morningTargetMl);
    setAfternoon(user.afternoonTargetMl);
    setEvening(user.eveningTargetMl);
  }, [user]);
  const total = morning + afternoon + evening;
  const saveTargets = useMutation({
    mutationFn: async () => {
      const body = {
        targetWaterMl: total,
        morningTargetMl: morning,
        afternoonTargetMl: afternoon,
        eveningTargetMl: evening
      };
      return userService.updateTargets(body);
    },
    onSuccess: async () => {
      await refreshProfile();
      void queryClient.invalidateQueries({
        queryKey: ['today']
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: err => setError(errorMessage(err))
  });
  const {
    data: cups = []
  } = useQuery({
    queryKey: ['cups'],
    queryFn: async () => (await cupService.list()).data
  });

  // Cốc hiển thị trên ly 3D = cốc mặc định (hoặc cốc đầu tiên).
  const customCup = cups.find(cup => cup.isDefault) ?? cups[0] ?? null;
  const hasPhoto = !!customCup?.imageUrl;
  const invalidateCups = () => {
    void queryClient.invalidateQueries({
      queryKey: ['cups']
    });
    void queryClient.invalidateQueries({
      queryKey: ['today']
    });
  };
  // Popup tiến trình: 0–55% là byte đã gửi, 55–95% là server tách nền, 100% khi xong.
  const [progress, setProgress] = useState(null); // { value, label }
  const uploadPhoto = useMutation({
    mutationFn: async file => {
      let cupId = customCup?.id;
      setProgress({ value: 2, label: 'Đang chuẩn bị ảnh...' });
      if (!cupId) {
        const created = await cupService.create({
          name: 'Cốc của tôi',
          volumeMl: 250
        });
        cupId = created.data.id;
      }
      // Tách nền NGAY TRÊN MÁY rồi gửi kèm: server cloud không chạy rembg, mà nếu để mỗi
      // thiết bị tự tách thì chủ cốc và partner sẽ thấy 2 ảnh khác nhau.
      setProgress({ value: 4, label: 'AI đang tách nền cốc...' });
      const cut = await cutoutFileFromFile(file, { symmetry: true, singleObject: true, requireAi: true });
      const form = new FormData();
      form.append('image', file);
      if (cut) form.append('cutout', cut);
      return cupService.uploadImage(cupId, form, event => {
        const total = event.total || 0;
        const percent = total ? Math.round((event.loaded / total) * 50) : 30;
        setProgress({ value: Math.max(4, Math.min(55, 5 + percent)), label: 'Đang tải ảnh lên...' });
      });
    },
    onSuccess: () => {
      setProgress({ value: 100, label: 'Đã tách nền xong!' });
      invalidateCups();
      setTimeout(() => setProgress(null), 700);
    },
    onError: err => {
      setProgress(null);
      setError(errorMessage(err));
    }
  });

  // Server tách nền có thể lâu → cho nước dâng dần 55 → 95% trong lúc chờ.
  useEffect(() => {
    if (!uploadPhoto.isPending || !progress || progress.value < 55) return;
    const id = setInterval(() => {
      setProgress(prev => {
        if (!prev || prev.value >= 95) return prev;
        return { value: Math.min(95, prev.value + Math.max(0.7, (95 - prev.value) * 0.12)), label: 'Đang lưu ảnh...' };
      });
    }, 320);
    return () => clearInterval(id);
  }, [uploadPhoto.isPending, progress?.value >= 55]);
  const removePhoto = useMutation({
    mutationFn: async () => {
      if (!customCup) return;
      return cupService.removeImage(customCup.id);
    },
    onSuccess: invalidateCups,
    onError: err => setError(errorMessage(err))
  });

  // Bắt buộc chụp ảnh mỗi lần thêm nước (bật/tắt ngay khi gạt).
  const requirePhoto = user?.requirePhoto ?? true;
  const saveSettings = useMutation({
    mutationFn: async value => userService.updateSettings({
      requirePhoto: value
    }),
    onSuccess: async () => refreshProfile(),
    onError: err => setError(errorMessage(err))
  });

  // Nhắc uống nước tự động: mỗi thay đổi lưu ngay.
  const [permission, setPermission] = useState(notificationState());
  const [pushReady, setPushReady] = useState(null);
  const reminder = {
    enabled: user?.reminderEnabled ?? false,
    style: user?.reminderStyle ?? 'normal',
    interval: user?.reminderIntervalMinutes ?? 120,
    ml: user?.reminderMl ?? 200,
    startHour: user?.reminderStartHour ?? 7,
    endHour: user?.reminderEndHour ?? 23
  };
  const hourLabel = (hour) => `${String(hour % 24).padStart(2, '0')}:00`;
  const saveReminder = useMutation({
    mutationFn: async patch => userService.updateSettings(patch),
    onSuccess: async () => {
      await refreshProfile();
    },
    onError: err => setError(errorMessage(err))
  });
  // Trong app đóng gói (Android/iOS): đặt lịch thông báo của hệ điều hành theo cấu hình vừa lưu.
  useEffect(() => {
    if (!isNativeApp() || !user) return;
    void scheduleNativeReminders({
      enabled: reminder.enabled,
      style: reminder.style,
      intervalMinutes: reminder.interval,
      ml: reminder.ml,
      startHour: reminder.startHour,
      endHour: reminder.endHour
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.reminderEnabled,
    user?.reminderStyle,
    user?.reminderIntervalMinutes,
    user?.reminderMl,
    user?.reminderStartHour,
    user?.reminderEndHour
  ]);
  const askPermission = async () => {
    const result = await askNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setPushReady(await subscribePush());
      // Bật quyền thông báo = muốn được nhắc → bật luôn công tắc nhắc, nếu không sẽ chẳng có thông báo nào.
      if (!reminder.enabled) saveReminder.mutate({ reminderEnabled: true });
    }
  };
  // Gửi thử một thông báo để kiểm chứng máy đã nhận được (kể cả khi app đóng).
  const sendTestPush = async () => {
    try {
      await api.post('/api/push/test');
      toast.show('Đã gửi thử', 'Khóa màn hình xem có thông báo hiện lên không nhé.');
    } catch (err) {
      toast.show('Không gửi được', errorMessage(err));
    }
  };
  // Người dùng đã cho phép từ trước → đăng ký Web Push luôn (để nhắc cả khi tắt app).
  useEffect(() => {
    if (notificationState() !== 'granted') return;
    let alive = true;
    void subscribePush().then((ok) => {
      if (alive) setPushReady(ok);
    });
    return () => {
      alive = false;
    };
  }, []);
  return <div>
      <SettingsTabs active="water" />
      <div className="grid items-start gap-4 md:grid-cols-2">
      <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <SectionHeader icon={Target} title="Mục tiêu nước" />

        <div className="grid grid-cols-3 gap-2">
          {[{
          label: 'Sáng',
          value: morning,
          set: setMorning
        }, {
          label: 'Trưa',
          value: afternoon,
          set: setAfternoon
        }, {
          label: 'Tối',
          value: evening,
          set: setEvening
        }].map(({
          label,
          value,
          set
        }) => <label key={label} className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
              <input type="number" min={0} max={20000} value={value} onChange={e => set(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-right text-sm font-semibold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none" />
            </label>)}
        </div>

        <div className="mt-4 flex items-baseline justify-between rounded-xl bg-water-50 px-3 py-2.5">
          <span className="text-xs font-medium text-water-700">Tổng mỗi ngày</span>
          <span className="text-lg font-bold tabular-nums text-water-700">{total} <span className="text-xs font-medium">ml</span></span>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-3 text-sm text-emerald-600">Đã lưu mục tiêu.</p>}

        <button onClick={() => {
        setError(null);
        saveTargets.mutate();
      }} disabled={saveTargets.isPending || total < 100} className="mt-4 w-full rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white transition hover:bg-water-700 disabled:opacity-50">
          {saveTargets.isPending ? 'Đang lưu...' : 'Lưu mục tiêu'}
        </button>
      </section>

      <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <SectionHeader icon={CupSoda} title="Cốc nước của bạn" />

        <div className="flex items-center gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-slate-200">
            {hasPhoto ? <img src={mediaUrl(customCup.cutoutUrl || customCup.imageUrl) ?? ''} alt="Cốc của bạn" className={`size-full object-cover ${customCup.cutoutUrl ? 'bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:12px_12px]' : ''}`} /> : <div className="flex size-full flex-col items-center justify-center gap-1 text-slate-300">
                <CupSoda className="size-8" />
                <span className="text-[10px]">Ly mặc định</span>
              </div>}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {hasPhoto ? 'Đang dùng ảnh của bạn' : 'Đang dùng ly mặc định'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">JPG, PNG hoặc WebP · tối đa 5 MB</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-water-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-water-700">
                <Camera className="size-3.5" />
                {hasPhoto ? 'Đổi ảnh' : 'Tải ảnh cốc'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto.mutate(file);
                e.target.value = '';
              }} />
              </label>

              {hasPhoto && <button onClick={() => removePhoto.mutate()} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600">
                  <Trash2 className="size-3.5" /> Xoá ảnh
                </button>}
            </div>
          </div>
        </div>
      </section>
      <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:col-span-2">
        <SectionHeader icon={Camera} title="Ảnh minh chứng khi thêm nước" />

        <button type="button" role="switch" aria-checked={requirePhoto} disabled={saveSettings.isPending} onClick={() => saveSettings.mutate(!requirePhoto)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-water-300 disabled:opacity-60">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800">
              Bắt buộc chụp ảnh cốc nước
            </span>
            <span className={`block text-xs ${requirePhoto ? 'text-water-700' : 'text-slate-500'}`}>
              {requirePhoto ? 'Đang bật · không thể thêm nước nếu thiếu ảnh' : 'Đang tắt · có thể thêm nước không kèm ảnh'}
            </span>
          </span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${requirePhoto ? 'bg-water-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${requirePhoto ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </section>

      <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:col-span-2">
        <SectionHeader icon={BellRing} title="Nhắc uống nước tự động" />

        <button type="button" role="switch" aria-checked={reminder.enabled} disabled={saveReminder.isPending} onClick={() => saveReminder.mutate({ reminderEnabled: !reminder.enabled })} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-water-300 disabled:opacity-60">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800">Bật nhắc uống nước</span>
            <span className={`block text-xs ${reminder.enabled ? 'text-water-700' : 'text-slate-500'}`}>
              {reminder.enabled ? `Đang bật · ${hourLabel(reminder.startHour)} – ${hourLabel(reminder.endHour)}` : 'Đang tắt · app không nhắc gì'}
            </span>
          </span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${reminder.enabled ? 'bg-water-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${reminder.enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>

        {reminder.enabled && (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { id: 'gentle', emoji: '🌿', name: 'Nhẹ nhàng', gap: '10 phút' },
                { id: 'normal', emoji: '💧', name: 'Trung bình', gap: '3 phút' },
                { id: 'demon', emoji: '😈', name: 'Ác quỷ', gap: '1 phút' }
              ].map((option) => {
                const active = reminder.style === option.id;
                return (
                  <button key={option.id} type="button" disabled={saveReminder.isPending} onClick={() => saveReminder.mutate({ reminderStyle: option.id })} className={`rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-60 ${active ? 'border-water-500 bg-water-50 ring-1 ring-water-200' : 'border-slate-200 hover:border-water-300'}`}>
                    <span className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{option.emoji}</span>
                      <span className="text-sm font-semibold text-slate-800">{option.name}</span>
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-500">nhắc lại {option.gap}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-600">Bắt đầu</span>
                <select value={reminder.startHour} disabled={saveReminder.isPending} onChange={(e) => saveReminder.mutate({ reminderStartHour: Number(e.target.value) })} className="rounded-lg border-0 bg-transparent py-0 pl-2 pr-0 text-right text-sm font-semibold text-slate-800 focus:outline-none">
                  {[...Array(24).keys()].map((h) => (
                    <option key={h} value={h} disabled={h >= reminder.endHour}>{hourLabel(h)}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-600">Kết thúc</span>
                <select value={reminder.endHour} disabled={saveReminder.isPending} onChange={(e) => saveReminder.mutate({ reminderEndHour: Number(e.target.value) })} className="rounded-lg border-0 bg-transparent py-0 pl-2 pr-0 text-right text-sm font-semibold text-slate-800 focus:outline-none">
                  {[...Array(24).keys()].map((h) => h + 1).map((h) => (
                    <option key={h} value={h} disabled={h <= reminder.startHour}>{hourLabel(h)}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-600">Nhắc mỗi</span>
                <select value={reminder.interval} disabled={saveReminder.isPending} onChange={(e) => saveReminder.mutate({ reminderIntervalMinutes: Number(e.target.value) })} className="rounded-lg border-0 bg-transparent py-0 pl-2 pr-0 text-right text-sm font-semibold text-slate-800 focus:outline-none">
                  {[60, 90, 120, 180, 240].map((m) => (
                    <option key={m} value={m}>{m % 60 === 0 ? `${m / 60} giờ` : `${m / 60} giờ`.replace('.', ',')}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-600">Uống mỗi lần</span>
                <select value={reminder.ml} disabled={saveReminder.isPending} onChange={(e) => saveReminder.mutate({ reminderMl: Number(e.target.value) })} className="rounded-lg border-0 bg-transparent py-0 pl-2 pr-0 text-right text-sm font-semibold text-slate-800 focus:outline-none">
                  {[150, 200, 250, 300, 500].map((ml) => (
                    <option key={ml} value={ml}>{ml} ml</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-600">
                {permission === 'denied'
                  ? 'Trình duyệt đang chặn thông báo.'
                  : permission === 'unsupported'
                    ? 'Thiết bị không hỗ trợ thông báo.'
                    : permission === 'granted'
                      ? pushReady === false
                        ? 'Đã cho phép, nhưng chưa đăng ký được nhắc khi tắt app.'
                        : 'Đã bật thông báo trên thiết bị này.'
                      : 'Chưa bật thông báo hệ thống.'}
              </span>
              {permission !== 'granted' && permission !== 'unsupported' && (
                <button type="button" onClick={askPermission} className="rounded-lg bg-water-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-water-700">
                  Bật thông báo
                </button>
              )}
              {permission === 'granted' && (
                <button type="button" onClick={sendTestPush} className="rounded-lg border border-water-300 px-3 py-1.5 text-xs font-semibold text-water-700 transition hover:bg-water-50">
                  Gửi thử
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              iPhone: mở bằng Safari → Chia sẻ → “Thêm vào MH chính” rồi bật thông báo (iOS 16.4 trở lên).
            </p>
          </>
        )}
      </section>

      {progress && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="mb-1 font-semibold text-slate-800">Đang xử lý ảnh cốc</h3>
            <p className="mb-4 text-xs text-slate-500">Nước dâng = % hoàn thành</p>
            <WaterLoader percent={progress.value} label={progress.label} />
            <p className="mt-4 text-[11px] text-slate-400">Lần đầu có thể mất ~30 giây.</p>
          </div>
        </div>}
      </div>
    </div>;
}