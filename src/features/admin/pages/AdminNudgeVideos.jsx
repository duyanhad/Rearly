import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Film, Trash2, Upload } from 'lucide-react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { nudgeVideoService } from '../../../services/nudgeVideoService';

const KINDS = [
  { id: 'water', label: 'Nước', emoji: '💧' },
  { id: 'meal', label: 'Bữa ăn', emoji: '🍚' },
  { id: 'medicine', label: 'Thuốc', emoji: '💊' },
  { id: 'study', label: 'Học tập', emoji: '📚' },
  { id: 'sleep', label: 'Giấc ngủ', emoji: '😴' },
  { id: 'weight', label: 'Cân nặng', emoji: '⚖️' },
];

/**
 * Admin: tải video ngắn (7–8s) gửi kèm khi nhắc nhở, theo từng nhu cầu.
 * Mỗi nhu cầu có thể có nhiều video — mỗi lần nhắc app chọn ngẫu nhiên một video đang bật.
 */
export function AdminNudgeVideos() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploadKind, setUploadKind] = useState('water');

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['admin-nudge-videos'],
    queryFn: async () => (await nudgeVideoService.adminList()).data,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-nudge-videos'] });

  const upload = useMutation({
    mutationFn: (file) => nudgeVideoService.upload({ kind: uploadKind, label: file.name, file }),
    onSuccess: async () => {
      await refresh();
      toast.show('Đã thêm video', 'Video sẽ được gửi kèm khi nhắc nhu cầu này.');
    },
    onError: (err) => toast.show('Tải video thất bại', errorMessage(err)),
  });

  const toggle = useMutation({
    mutationFn: (id) => nudgeVideoService.toggle(id),
    onSuccess: refresh,
    onError: (err) => toast.show('Không đổi được trạng thái', errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id) => nudgeVideoService.remove(id),
    onSuccess: async () => {
      await refresh();
      toast.show('Đã xoá video');
    },
    onError: (err) => toast.show('Không xoá được', errorMessage(err)),
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Video nhắc nhở</h1>
        <p className="mt-1 text-sm text-slate-500">
          Video ngắn 7–8 giây gửi kèm khi người dùng bấm “Nhắc nhở”. Mỗi nhu cầu có thể có nhiều video.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={uploadKind}
            onChange={(e) => setUploadKind(e.target.value)}
            aria-label="Chọn nhu cầu cho video"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-water-400"
          >
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.emoji} {k.label}
              </option>
            ))}
          </select>

          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) upload.mutate(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-water-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Upload className="size-4" /> {upload.isPending ? 'Đang tải…' : 'Tải video lên'}
          </button>
          <span className="text-[11px] text-slate-400">mp4 / webm / gif · tối đa 12 MB</span>
        </div>
      </section>

      {isLoading ? (
        <DearlyLoader />
      ) : (
        KINDS.map((k) => {
          const list = videos.filter((v) => v.kind === k.id);
          return (
            <section key={k.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="text-base">{k.emoji}</span> {k.label}
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">{list.length}</span>
              </h2>

              {list.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-center text-[12px] text-slate-400">
                  Chưa có video — nhắc nhu cầu này sẽ không gửi kèm video.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {list.map((v) => (
                    <li
                      key={v.id}
                      className={`flex items-center gap-2 rounded-xl p-2 ring-1 ${
                        v.isActive ? 'bg-slate-50 ring-slate-200' : 'bg-slate-100/60 ring-slate-200 opacity-70'
                      }`}
                    >
                      <video
                        src={nudgeVideoService.url(v.url)}
                        className="size-16 shrink-0 rounded-lg bg-slate-900 object-cover"
                        muted
                        loop
                        playsInline
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-[12px] font-semibold text-slate-800">
                          <Film className="size-3 shrink-0 text-slate-400" />
                          {v.label || `Video #${v.id}`}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {v.isActive ? 'Đang dùng' : 'Đang tắt'} · {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle.mutate(v.id)}
                        aria-label={v.isActive ? 'Tắt video này' : 'Bật video này'}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white"
                      >
                        {v.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Xoá video này?')) remove.mutate(v.id);
                        }}
                        aria-label="Xoá video"
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

export default AdminNudgeVideos;
