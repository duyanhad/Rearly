import { useRef, useState } from 'react';
import { Image as ImageIcon, Mic, Trash2 } from 'lucide-react';
import { VoiceRecorder } from '../../chat/components/VoiceRecorder';

/**
 * Chọn nội dung gửi kèm nhiệm vụ / báo cáo: tin nhắn chữ, nhiều ảnh, ghi âm.
 * Người dùng có thể dùng một, hai hay cả ba loại cùng lúc.
 *
 * @param {object} value `{ text, files, voice }` — voice = { blob, durationMs } | null
 * @param {(next: object) => void} onChange
 */
export function DutyMediaPicker({ value, onChange, label = 'Nội dung gửi kèm' }) {
  const imageRef = useRef(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const files = value.files ?? [];
  const voice = value.voice ?? null;

  const patch = (next) => onChange({ text: value.text ?? '', files, voice, ...next });

  const addFiles = (list) => {
    const picked = Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));
    patch({ files: [...files, ...picked].slice(0, 6) });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>

      <textarea
        value={value.text ?? ''}
        onChange={(e) => patch({ text: e.target.value })}
        rows={2}
        maxLength={1000}
        placeholder="Viết tin nhắn… (không bắt buộc)"
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-water-400 focus:bg-white"
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => imageRef.current?.click()}
          className="flex min-h-9 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          <ImageIcon className="size-3.5" /> Ảnh ({files.length}/6)
        </button>
        <button
          type="button"
          onClick={() => setVoiceOpen((v) => !v)}
          className={`flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition ${
            voice ? 'bg-water-50 text-water-700 ring-1 ring-water-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Mic className="size-3.5" /> {voice ? 'Đã ghi âm' : 'Ghi âm'}
        </button>
        {voice && (
          <button
            type="button"
            onClick={() => patch({ voice: null })}
            className="flex min-h-9 items-center gap-1 rounded-lg bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-600"
          >
            <Trash2 className="size-3.5" /> Bỏ ghi âm
          </button>
        )}
      </div>

      {voiceOpen && !voice && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2">
          <VoiceRecorder
            onSend={(blob, durationMs) => {
              patch({ voice: { blob, durationMs } });
              setVoiceOpen(false);
            }}
            disabled={false}
          />
        </div>
      )}
      {voice && (
        <p className="mt-1.5 text-[11px] text-water-700">Đã đính kèm ghi âm {Math.round(voice.durationMs / 1000)}s.</p>
      )}

      {files.length > 0 && (
        <div className="mt-2 grid grid-cols-6 gap-1">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              <img src={URL.createObjectURL(file)} alt={`Ảnh ${index + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => patch({ files: files.filter((_, i) => i !== index) })}
                aria-label={`Bỏ ảnh ${index + 1}`}
                className="absolute right-0 top-0 grid size-5 place-items-center rounded-bl-lg bg-slate-900/70 text-white"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DutyMediaPicker;
