import { useMutation, useQuery } from '@tanstack/react-query';
import { BellRing, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { socialService } from '../../../services/socialService';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import { timeLabel } from '../../../utils/format';
export function FeedPage() {
  const toast = useToast();
  const {
    data: feed = [],
    isLoading
  } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => (await socialService.getFeed()).data,
    refetchOnWindowFocus: true
  });
  const nudge = useMutation({
    mutationFn: async id => socialService.nudge(id),
    onSuccess: () => toast.show('Đã gửi nhắc nhở', 'Bạn của bạn sẽ nhận thông báo ngay.'),
    onError: err => toast.show('Không gửi được', errorMessage(err))
  });
  return <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Bảng tin</h1>
        <p className="text-sm text-slate-500">Tiến trình hôm nay và ảnh minh chứng mới nhất của bạn bè.</p>
      </header>

      {isLoading && <DearlySkeleton rows={3} />}

      {!isLoading && feed.length === 0 && <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
          <Users className="size-10 text-slate-300" />
          <p className="font-medium text-slate-700">Chưa có ai trong bảng tin</p>
          <p className="text-sm text-slate-500">
            Kết bạn để xem tiến trình uống nước của họ.
          </p>
          <Link to="/friends" className="mt-1 rounded-lg bg-water-600 px-4 py-2 text-sm font-semibold text-white">
            Tìm bạn
          </Link>
        </div>}

      {feed.map(item => {
      const photo = mediaUrl(item.latestImageUrl);
      const name = item.nickname || item.fullName;
      return <article key={item.userId} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Avatar url={item.avatarUrl} name={item.fullName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {name}
                  {item.nickname && <span className="ml-1 text-xs font-normal text-slate-400">({item.fullName})</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {item.totalDrankMl} / {item.targetMl} ml hôm nay
                </p>
              </div>
              <button onClick={() => nudge.mutate(item.userId)} disabled={nudge.isPending} className="flex shrink-0 items-center gap-1 rounded-lg border border-water-200 px-3 py-1.5 text-xs font-medium text-water-700 hover:bg-water-50 disabled:opacity-50">
                <BellRing className="size-3.5" /> Nhắc
              </button>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${item.isCompleted ? 'bg-emerald-500' : 'bg-water-500'}`} style={{
            width: `${Math.min(100, item.percent)}%`
          }} />
            </div>

            {photo && <div className="mt-3 flex items-start gap-3">
                <a href={photo} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={photo} alt={item.latestImageNote ?? 'Ảnh minh chứng'} className="h-24 w-24 rounded-xl object-cover" />
                </a>
                <div className="text-xs text-slate-500">
                  {item.latestImageNote && <p>{item.latestImageNote}</p>}
                  {item.latestImageAt && <p className="mt-1 text-slate-400">{timeLabel(item.latestImageAt)}</p>}
                </div>
              </div>}
          </article>;
    })}
    </div>;
}