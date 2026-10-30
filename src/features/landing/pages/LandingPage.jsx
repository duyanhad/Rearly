import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Apple,
  BedDouble,
  ChevronRight,
  CupSoda,
  Heart,
  Pill,
  Share,
  Smartphone,
  UserRound,
  Utensils,
  X,
} from 'lucide-react';
import { API_URL } from '../../../services/apiClient';
import { DearlyMark } from '../../../components/DearlyLogo';

const APK_URL = `${API_URL}/downloads/Dearly-test.apk`;

const FEATURES = [
  {
    icon: CupSoda,
    title: 'Nhắc uống nước',
    text: 'Đừng quên uống nước, giúp em luôn khỏe mạnh và tươi tắn.',
  },
  {
    icon: Utensils,
    title: 'Nhắc ăn uống',
    text: 'Ăn đủ bữa, đủ chất để luôn có năng lượng cho nhau.',
  },
  {
    icon: Pill,
    title: 'Nhắc uống thuốc',
    text: 'Đúng giờ, đúng liều – vì sức khỏe của em là quan trọng nhất.',
  },
  {
    icon: BedDouble,
    title: 'Nhắc ngủ',
    text: 'Ngủ đủ giấc, để ngày mai lại tươi cười cùng nhau.',
  },
  {
    icon: Heart,
    filled: true,
    title: 'Và hơn thế nữa…',
    text: 'Những lời nhắn, lời quan tâm nhỏ nhưng ý nghĩa, mỗi ngày.',
  },
];

/**
 * Trang giới thiệu dựng đúng theo mockup: nền kem, hoa góc phải, sóng đáy,
 * minh hoạ cặp đôi (cắt từ ảnh gốc, gồm tim + chữ viết tay), 5 dòng tính năng và khối kết.
 */
export function LandingPage() {
  const [iosSheet, setIosSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-[#fdf7f2]">
      {/* Hoa / lá góc phải trên */}
      <img
        src="/landing/flower.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-4 w-24 select-none sm:-right-6 sm:-top-6 sm:w-32"
      />
      {/* Sóng hồng đáy trang */}
      <img
        src="/landing/wave-left.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 w-56 select-none sm:w-80"
      />
      <img
        src="/landing/wave-right.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 w-64 select-none sm:w-96"
      />

      <header className="relative z-20 border-b border-[#f3e2db] bg-[#fdf8f5]">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-5 py-3">
          <DearlyMark className="size-7" />
          <span className="font-brand text-xl font-bold tracking-tight text-[#7d2836]">Dearly</span>
          <Link
            to="/login"
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#8e2f3c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d2836]"
          >
            <UserRound className="size-4" /> Đăng nhập
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16">
        <div className="grid items-center gap-10 pt-10 lg:grid-cols-2 lg:gap-6 lg:pt-14">
          {/* Minh hoạ cặp đôi: ảnh cắt từ mockup (kèm tim, vòng xoáy, chữ viết tay) */}
          <div className="relative mx-auto w-full max-w-md">
            <img src="/landing/couple.png" alt="Một chút thương, mỗi ngày" className="w-full select-none" />
          </div>

          {/* Nội dung */}
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbe3de] px-3 py-1 text-xs font-semibold text-[#8e2f3c]">
              <Heart className="size-3.5 fill-[#e78f86] text-[#e78f86]" /> Dành cho bạn
            </span>

            <h1 className="mt-4 text-[2.1rem] font-extrabold leading-[1.12] tracking-tight text-[#7d2836] sm:text-[2.5rem]">
              Một chút thương,
              <br />
              mỗi ngày{' '}
              <img
                src="/landing/title-heart.png"
                alt=""
                aria-hidden="true"
                className="inline-block w-16 -translate-y-1 select-none sm:w-20"
              />
            </h1>

            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#6b5a55]">
              Dearly ở đây để nhắc bạn uống nước, ăn đủ bữa, uống thuốc, học vài trang sớm, ngủ một giấc
              trọn vẹn — và thương bản thân mình nhiều hơn một chút.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={APK_URL}
                download
                className="group flex items-center justify-center gap-2 rounded-2xl bg-[#8e2f3c] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(142,47,60,0.7)] transition hover:bg-[#7d2836] active:scale-[0.99]"
              >
                <Smartphone className="size-4" /> Tải cho Android
                <ChevronRight className="size-4 opacity-80 transition group-hover:translate-x-0.5" />
              </a>
              <button
                type="button"
                onClick={() => setIosSheet(true)}
                className="group flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-[#8e2f3c] ring-1 ring-[#e8b7ae] transition hover:bg-[#fdf1ee] active:scale-[0.99]"
              >
                <Apple className="size-4" /> Tải cho iPhone
                <ChevronRight className="size-4 opacity-60 transition group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Danh sách tính năng */}
            <ul className="mt-6 space-y-2.5">
              {FEATURES.map(({ icon: Icon, filled, title, text }) => (
                <li
                  key={title}
                  className="flex items-center gap-3 rounded-2xl bg-[#fdf6f4] px-3.5 py-3 shadow-[0_6px_18px_-14px_rgba(142,47,60,0.45)] ring-1 ring-[#f6e3dd] transition hover:bg-white"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbe3de] text-[#8e2f3c]">
                    <Icon className={`size-[18px] ${filled ? 'fill-[#8e2f3c]' : ''}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-[#4a3532]">{title}</span>
                    <span className="block truncate text-[11px] text-[#a08c86]">{text}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[#c9a49c]" />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Khối kết */}
        <section className="relative mx-auto mt-12 max-w-2xl overflow-hidden rounded-2xl bg-[#7e2636] px-6 py-6 text-center text-white shadow-[0_20px_44px_-24px_rgba(125,40,54,0.8)]">
          <img
            src="/landing/ctaL.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-7 top-9 w-12 select-none"
          />
          <img
            src="/landing/ctaR.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-6 top-7 w-20 select-none"
          />
          <svg
            viewBox="0 0 400 60"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
            preserveAspectRatio="none"
          >
            <path d="M0 60V36c60-18 120-18 180 0s120 18 220 0v24z" fill="#943c4a" opacity="0.85" />
          </svg>

          <p className="relative text-[15px] font-bold">
            <Heart className="mr-1 inline size-4 -translate-y-0.5 fill-white text-white" /> Hôm nay bạn thương
            mình chưa?
          </p>
          <p className="relative mt-1 text-[11px] text-white/80">
            Bắt đầu bằng một ý ngọt. Dearly sẽ nhắc bạn, phía còn lại, là yêu thương.
          </p>
          <div className="relative mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to="/register"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-5 py-2 text-xs font-bold text-[#8e2f3c]"
            >
              <Heart className="size-3.5 fill-[#e78f86] text-[#e78f86]" /> Bắt đầu nhé
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-5 py-2 text-xs font-bold text-white ring-1 ring-white/30"
            >
              <UserRound className="size-3.5" /> Đăng nhập
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 pb-8">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6">
          <span className="h-px flex-1 bg-[#e6c9c2]" />
          <p className="text-[11px] text-[#a08c86]">Dearly – Thương mình một chút, mỗi ngày ♡</p>
          <span className="h-px flex-1 bg-[#e6c9c2]" />
        </div>
      </footer>

      {/* iPhone: một dòng ngắn */}
      {iosSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#fbe3de] text-[#8e2f3c]">
                <Apple className="size-4" />
              </span>
              <h2 className="flex-1 text-sm font-semibold text-slate-900">Dearly trên iPhone</h2>
              <button
                type="button"
                onClick={() => setIosSheet(false)}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Mở trang này bằng <b>Safari</b>, bấm <Share className="inline size-3.5 -translate-y-0.5" />{' '}
              <b>Chia sẻ</b> rồi chọn <b>Thêm vào Màn hình chính</b>. Dearly sẽ nằm cạnh những app bạn thương.
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="mt-4 w-full rounded-xl bg-[#8e2f3c] py-2.5 text-sm font-semibold text-white"
            >
              {copied ? 'Đã sao chép liên kết' : 'Sao chép liên kết'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
