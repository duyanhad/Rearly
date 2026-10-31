import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Loader2, Moon, Play, Square, Sun } from 'lucide-react';
import { DearlyMark } from '../../../components/DearlyLogo';

const pad = (n) => String(n).padStart(2, '0');

/** Đồng hồ đếm giờ:giây kể từ mốc bắt đầu (chạy mỗi giây). */
function useElapsed(startedAtUtc) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAtUtc) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAtUtc]);
  if (!startedAtUtc) return 0;
  return Math.max(0, Math.floor((now - new Date(startedAtUtc).getTime()) / 1000));
}

/**
 * Thẻ giấc ngủ đang chạy: bộ đếm + mục tiêu, kèm nút "Dừng ngủ" (bắt buộc chụp ảnh minh chứng).
 * Khi đếm đủ giờ hẹn, thẻ tự chuyển sang nhắc chụp ảnh kết thúc.
 */
export function SleepRunningCard({ session, onStop, stopping }) {
  const elapsedSec = useElapsed(session.startedAtUtc);
  const plannedSec = Math.max(60, (session.plannedMinutes || 480) * 60);
  const remaining = Math.max(0, plannedSec - elapsedSec);
  const done = remaining === 0;
  const percent = Math.min(100, Math.round((elapsedSec / plannedSec) * 100));
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const pick = () => fileRef.current?.click();
  const onFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview({ file, url: URL.createObjectURL(file) });
  };

  const submit = () => {
    if (!preview) return;
    onStop({ file: preview.file });
    URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <section
      className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg transition-colors ${
        done ? 'bg-emerald-600' : 'bg-[#2b1b3d]'
      }`}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center gap-2">
        <Moon className={`size-4 ${done ? 'text-white' : 'text-white/80'}`} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
          {done ? 'Đã đủ giấc · chụp ảnh để kết thúc' : 'Đang ngủ'}
        </p>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
          <DearlyMark className="size-3" tone="cream" /> {session.bedTime}
        </span>
      </div>

      <p className="relative mt-3 text-4xl font-extrabold tabular-nums tracking-tight">
        {pad(Math.floor(elapsedSec / 3600))}:{pad(Math.floor((elapsedSec % 3600) / 60))}:{pad(elapsedSec % 60)}
      </p>
      <p className="relative mt-1 text-xs text-white/70">
        Mục tiêu {(session.plannedMinutes / 60).toFixed(1).replace('.0', '')} giờ ·{' '}
        {done ? 'đã hoàn thành' : `còn ${Math.ceil(remaining / 60)} phút`}
      </p>

      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-white' : 'bg-water-300'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />

      {preview ? (
        <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-2">
          <img src={preview.url} alt="Ảnh minh chứng" className="size-14 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">Ảnh minh chứng đã chọn</p>
            <p className="text-[11px] text-white/70">Gửi kèm phiếu cho partner duyệt</p>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={stopping}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 disabled:opacity-60"
          >
            {stopping ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Gửi
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          className={`relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition active:scale-[0.99] ${
            done ? 'bg-white text-emerald-700' : 'bg-white/15 text-white hover:bg-white/20'
          }`}
        >
          {done ? <Camera className="size-4" /> : <Square className="size-3.5 fill-white" />}
          {done ? 'Chụp ảnh lúc thức để kết thúc' : 'Dừng ngủ · cần 1 ảnh minh chứng'}
        </button>
      )}
    </section>
  );
}

/** Nút bắt đầu ngủ: mở camera, chụp 1 ảnh rồi mới bắt đầu đếm. */
export function SleepStartCard({ onStart, starting, goalMinutes }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const onFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    onStart({ file });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-water-50 text-water-600">
          <Moon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Bắt đầu giấc ngủ</p>
          <p className="text-xs text-slate-500">Chụp 1 ảnh minh chứng rồi bộ đếm sẽ chạy</p>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />

      {preview ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-2">
          <img src={preview.url} alt="Ảnh bắt đầu ngủ" className="size-14 rounded-xl object-cover" />
          <p className="text-xs font-medium text-slate-600">Đang gửi ảnh và bắt đầu đếm…</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={starting}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2b1b3d] py-3 text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Chụp ảnh &amp; bắt đầu ngủ
        </button>
      )}
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Mục tiêu {(goalMinutes / 60).toFixed(1).replace('.0', '')} giờ · hết giờ sẽ nhắc chụp ảnh kết thúc
      </p>
    </section>
  );
}

/**
 * Thanh phần trăm ngủ đủ trong ngày: mỗi giấc góp phần trăm, đủ 100% thì đồ vật sáng lên.
 * `sessions`: các giấc hôm nay (đã có minutes).
 */
export function SleepDayProgress({ sessions = [], goalMinutes = 480, percent = 0 }) {
  const done = percent >= 100;
  const glow = useMemo(() => Math.min(1, percent / 100), [percent]);

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-2">
        <Sun className={`size-4 ${done ? 'text-amber-500' : 'text-slate-400'}`} />
        <p className="text-sm font-bold text-slate-900">Ngủ đủ hôm nay</p>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
            done ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {percent}%
        </span>
      </div>

      <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-amber-400' : 'bg-water-500'}`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1.5">
        {sessions.length === 0 && <li className="text-xs text-slate-400">Chưa có giấc nào hôm nay.</li>}
        {sessions.map((s) => {
          const share = goalMinutes ? Math.round((s.minutes / goalMinutes) * 100) : 0;
          return (
            <li key={s.id} className="flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0 font-medium tabular-nums text-slate-500">{s.bedTime}</span>
              <span className="min-w-0 flex-1 truncate text-slate-700">
                {(s.minutes / 60).toFixed(1).replace('.0', '')} giờ
              </span>
              <span className={`shrink-0 font-bold tabular-nums ${s.status === 'sleeping' ? 'text-water-600' : 'text-emerald-600'}`}>
                +{share}%
              </span>
            </li>
          );
        })}
      </ul>

      {/* Vật thể sáng dần theo %: đủ 100% thì phát sáng hoàn toàn */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
        <span
          className="relative flex size-10 items-center justify-center rounded-full transition-all duration-700"
          style={{
            background: `radial-gradient(circle, rgba(251,191,36,${0.15 + glow * 0.55}) 0%, rgba(251,191,36,0) 70%)`,
          }}
        >
          <Moon
            className="size-5 transition-colors duration-700"
            style={{ color: done ? '#f59e0b' : '#94a3b8', filter: `drop-shadow(0 0 ${glow * 8}px rgba(251,191,36,${glow}))` }}
          />
        </span>
        <p className="text-[11px] leading-snug text-slate-500">
          {done
            ? 'Đủ 100% hôm nay — linh vật sáng cả lên!'
            : `Thêm ${(((goalMinutes * (100 - percent)) / 100) / 60).toFixed(1).replace('.0', '')} giờ nữa để sáng đủ.`}
        </p>
      </div>
    </section>
  );
}
