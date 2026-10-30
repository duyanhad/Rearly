import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const HIDE_KEY = 'drinkwater.installHintHidden';

/**
 * Gợi ý cài app vào màn hình chính (cần cho thông báo trên iOS).
 * Android/Chrome: dùng hộp thoại cài đặt của trình duyệt; iOS Safari: hướng dẫn Thêm vào MH chính.
 */
export function InstallHint() {
  const [mode, setMode] = useState(null); // 'prompt' | 'ios'
  const [installer, setInstaller] = useState(null);

  useEffect(() => {
    if (localStorage.getItem(HIDE_KEY)) return;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) return;

    const onPrompt = (event) => {
      event.preventDefault();
      setInstaller(event);
      setMode('prompt');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos) setMode('ios');

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!mode) return null;

  const close = () => {
    localStorage.setItem(HIDE_KEY, '1');
    setMode(null);
  };

  const install = async () => {
    if (!installer) return;
    installer.prompt();
    await installer.userChoice;
    close();
  };

  return (
    <div className="fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-water-100 bg-white/95 p-3 shadow-lg backdrop-blur md:hidden">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Thêm Dearly vào màn hình chính</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {mode === 'ios' ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                Bấm <Share className="inline size-3.5" /> Chia sẻ → “Thêm vào MH chính” để nhận nhắc uống nước.
              </span>
            ) : (
              'Mở như một app thật và nhận nhắc uống nước đúng giờ.'
            )}
          </p>
          {mode === 'prompt' && (
            <button onClick={install} className="mt-2 rounded-lg bg-water-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-water-700">
              Thêm ngay
            </button>
          )}
        </div>
        <button onClick={close} aria-label="Đóng gợi ý cài app" className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default InstallHint;
