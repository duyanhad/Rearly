import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BellRing, ChevronLeft, Droplets, MessageCircle, ShieldCheck, UserMinus } from 'lucide-react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { ImageLightbox } from '../../../components/ImageLightbox';
import { Avatar } from '../../../components/Avatar';
import { WaterBar } from '../../../components/WaterBar';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { socialService } from '../../../services/socialService';
import { useToast } from '../../../components/Toast';
import { timeLabel } from '../../../utils/format';

/** Trang cá nhân của một người bạn: ảnh đại diện phóng to được, tiến độ nước hôm nay và ảnh mới duyệt. */
export function FriendProfilePage() {
  const { id } = useParams();
  const toast = useToast();
  const [zoom, setZoom] = useState(null);

  const { data: friends = [] } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => (await socialService.getFriends()).data,
  });
  const { data: feed = [] } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => (await socialService.getFeed()).data,
  });

  const nav = useNavigate();
  const unfriend = useMutation({
    mutationFn: async (id) => socialService.unfollow(id),
    onSuccess: () => {
      toast.show('Đã xoá bạn bè', 'Người này không còn trong danh sách bạn bè.');
      nav('/friends');
    },
    onError: (err) => toast.show('Không xoá được', errorMessage(err)),
  });

  const nudge = useMutation({
    mutationFn: async (userId) => socialService.nudge(userId),
    onSuccess: () => toast.show('Đã gửi nhắc nhở', 'Bạn ấy sẽ nhận thông báo uống nước ngay.'),
    onError: (err) => toast.show('Không gửi được', errorMessage(err)),
  });

  const friend = friends.find((f) => f.id === id);
  const item = feed.find((f) => f.userId === id);

  if (!friend) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-6">
        <Link to="/friends" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-water-700">
          <ChevronLeft className="size-4" /> Bạn bè
        </Link>
        <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">
          Không tìm thấy người này trong danh sách bạn bè.
        </p>
      </div>
    );
  }

  const relation = friend.isMyPartner
    ? 'Partner duyệt ảnh & nhắc uống nước'
    : friend.theyFollow && friend.iFollow
      ? 'Bạn bè'
      : friend.theyFollow
        ? 'Đang theo dõi bạn'
        : 'Bạn đang theo dõi';

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-6">
      <Link
        to="/friends"
        className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100 hover:text-water-700"
      >
        <ChevronLeft className="size-4" /> Bạn bè
      </Link>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-300" />
        <div className="-mt-10 px-5 pb-5">
          <button
            onClick={() => setZoom(friend.avatarUrl ? mediaUrl(friend.avatarUrl) : null)}
            className="block rounded-full transition hover:scale-[1.03]"
            aria-label={`Phóng to ảnh đại diện của ${friend.fullName}`}
            title="Bấm để phóng to ảnh"
          >
            <Avatar url={friend.avatarUrl} name={friend.fullName} size="xl" className="shadow-lg ring-4 ring-white" />
          </button>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">{friend.nickname || friend.fullName}</h1>
            {friend.nickname && <span className="text-xs text-slate-400">({friend.fullName})</span>}
            {friend.isMyPartner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-water-50 px-2 py-0.5 text-[11px] font-semibold text-water-700">
                <ShieldCheck className="size-3" /> Partner
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {relation}
            {friend.theirNickname && ` · họ gọi bạn là “${friend.theirNickname}”`}
          </p>
          {friend.nickname && (
            <p className="mt-0.5 text-[11px] text-slate-400">Bạn đặt biệt hiệu: {friend.nickname}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/chat"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white hover:bg-water-700"
            >
              <MessageCircle className="size-4" /> Nhắn tin
            </Link>
            <button
              onClick={() => nudge.mutate(friend.id)}
              disabled={nudge.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-water-700 ring-1 ring-water-200 hover:bg-water-50 disabled:opacity-50"
            >
              <BellRing className="size-4" /> Nhắc uống nước
            </button>
          </div>
          <button
            onClick={() => {
              if (window.confirm(`Xoá ${friend.nickname || friend.fullName} khỏi danh sách bạn bè?`)) unfriend.mutate(friend.id);
            }}
            disabled={unfriend.isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
          >
            <UserMinus className="size-3.5" /> Xoá bạn bè
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Droplets className="size-4 text-water-600" /> Hôm nay
        </h2>
        {!item ? (
          <DearlyLoader size="sm" />
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold tabular-nums text-water-700">{item.percent}%</span>
              <span className="text-xs tabular-nums text-slate-500">
                {item.totalDrankMl} / {item.targetMl} ml
              </span>
            </div>
            <WaterBar percent={item.percent} height="h-2" showFlames={false} />
            {item.isCompleted && (
              <p className="mt-1.5 text-xs font-semibold text-emerald-600">Đã đạt mục tiêu hôm nay 🎉</p>
            )}
          </>
        )}
      </section>

      {item?.latestImageUrl && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Ảnh gần nhất được duyệt</h2>
          <button onClick={() => setZoom(mediaUrl(item.latestImageUrl))} className="block w-full" aria-label="Phóng to ảnh">
            <img
              src={mediaUrl(item.latestImageUrl)}
              alt={`Ảnh của ${friend.fullName}`}
              loading="lazy"
              decoding="async"
              className="max-h-72 w-full rounded-2xl object-cover ring-1 ring-slate-100 transition hover:scale-[1.01]"
            />
          </button>
          {item.note && <p className="mt-1.5 text-xs text-slate-500">{item.note}</p>}
          {item.logTime && <p className="mt-0.5 text-[11px] text-slate-400">{timeLabel(item.logTime)}</p>}
        </section>
      )}

      {zoom && <ImageLightbox src={zoom} alt={friend.fullName} onClose={() => setZoom(null)} />}
    </div>
  );
}

export default FriendProfilePage;
