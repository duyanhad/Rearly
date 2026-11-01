import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Check, Pencil, Search, ShieldCheck, UserMinus, UserPlus, X } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { socialService } from '../../../services/socialService';
import { userService } from '../../../services/userService';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthProvider';

/** Trang Bạn bè: chỉ danh sách bạn bè + lời mời (bảng tin ở trang riêng). */
export function FriendsPage() {
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();
  const nav = useNavigate();

  // Xoá bạn bè: bỏ follow cả hai chiều (backend xoá luôn chiều kia).
  const unfriend = useMutation({
    mutationFn: async (id) => socialService.unfollow(id),
    onSuccess: async () => {
      toast.show('Đã xoá bạn bè', 'Cả hai không còn trong danh sách bạn bè.');
      for (const key of ['friends', 'feed', 'partner-clients', 'followers', 'following']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (err) => toast.show('Không xoá được', errorMessage(err)),
  });
  const toast = useToast();
  const { user, refreshProfile } = useAuth();
  const {
    data: friends = []
  } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => (await socialService.getFriends()).data,
    refetchOnWindowFocus: true
  });
  const {
    data: requests = []
  } = useQuery({
    queryKey: ['follow-requests'],
    queryFn: async () => (await socialService.getFollowRequests()).data
  });
  const {
    data: results = []
  } = useQuery({
    queryKey: ['search', query],
    enabled: query.trim().length >= 2,
    queryFn: async () => (await userService.search(query)).data
  });
  const invalidate = () => {
    for (const key of ['friends', 'search', 'follow-requests', 'feed', 'following']) void queryClient.invalidateQueries({
      queryKey: [key]
    });
  };
  const follow = useMutation({
    mutationFn: async ({
      id,
      following
    }) => following ? socialService.unfollow(id) : socialService.follow(id),
    onSuccess: invalidate,
    onError: err => setError(errorMessage(err))
  });
  // Mỗi tài khoản chỉ nhờ 1 người duyệt ảnh/nhắc uống nước (một người có thể làm partner cho nhiều người).
  const partner = useMutation({
    mutationFn: async partnerId => userService.setPartner(partnerId),
    onSuccess: async () => {
      await refreshProfile?.();
      for (const key of ['friends', 'today', 'my-partner', 'partner-clients']) void queryClient.invalidateQueries({
        queryKey: [key]
      });
      toast.show('Đã cập nhật partner', 'Ảnh minh chứng sẽ chờ người này duyệt.');
    },
    onError: err => setError(errorMessage(err))
  });
  const answer = useMutation({
    mutationFn: async ({
      id,
      accept
    }) => socialService.respondFollowRequest(id, accept),
    onSuccess: invalidate,
    onError: err => setError(errorMessage(err))
  });
  const nickname = useMutation({
    mutationFn: async ({
      id,
      value
    }) => socialService.setNickname(id, value),
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast.show('Đã lưu biệt hiệu', 'Biệt hiệu chỉ bạn thấy.');
    },
    onError: err => setError(errorMessage(err))
  });
  const nudge = useMutation({
    mutationFn: async id => socialService.nudge(id),
    onSuccess: () => toast.show('Đã gửi nhắc nhở', 'Bạn của bạn sẽ nhận thông báo ngay.'),
    onError: err => toast.show('Không gửi được', errorMessage(err))
  });
  return <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bạn bè</h1>
          <p className="text-sm text-slate-500">
            {friends.length} bạn · {requests.length} lời mời
          </p>
        </div>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <form onSubmit={e => {
        e.preventDefault();
        setQuery(term);
      }} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
            <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Tìm theo email hoặc tên" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
          </div>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Tìm
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {results.length > 0 && <ul className="mt-3 divide-y divide-slate-100">
            {results.map(u => <li key={u.id} className="flex items-center gap-3 py-2.5">
                <Avatar url={u.avatarUrl} name={u.fullName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                {u.status === 'Pending' ? <button onClick={() => follow.mutate({
            id: u.id,
            following: true
          })} className="shrink-0 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
                    Chờ chấp nhận · Huỷ
                  </button> : <button onClick={() => follow.mutate({
            id: u.id,
            following: u.isFollowing
          })} className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${u.isFollowing ? 'bg-slate-100 text-slate-600' : 'bg-water-600 text-white'}`}>
                    {u.isFollowing ? <UserMinus className="size-4" /> : <UserPlus className="size-4" />}
                    {u.isFollowing ? 'Bỏ theo dõi' : 'Kết bạn'}
                  </button>}
              </li>)}
          </ul>}
      </section>

      {requests.length > 0 && (
      <section className="rounded-2xl bg-white p-3 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Lời mời kết bạn ({requests.length})
          </h2>
          <ul className="divide-y divide-slate-100">
              {requests.map(r => <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <Avatar url={r.avatarUrl} name={r.fullName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{r.email}</p>
                  </div>
                  <button onClick={() => answer.mutate({
              id: r.id,
              accept: true
            })} className="flex items-center gap-1 rounded-lg bg-water-600 px-3 py-1.5 text-xs font-semibold text-white">
                    <Check className="size-3.5" /> Chấp nhận
                  </button>
                  <button onClick={() => answer.mutate({
              id: r.id,
              accept: false
            })} className="rounded-lg border border-slate-200 p-1.5 text-slate-500" aria-label="Từ chối">
                    <X className="size-3.5" />
                  </button>
                </li>)}
            </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <h2 className="text-sm font-semibold text-slate-700">Danh sách bạn bè</h2>
          <span className="text-[11px] text-slate-400" title="Bấm khiên để chọn người duyệt ảnh cốc nước (mỗi tài khoản chỉ nhờ 1 người)">
            Khiên = chọn partner duyệt ảnh
          </span>
        </div>

        {friends.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">
            Chưa có ai. Tìm bạn ở trên để gửi lời mời kết bạn.
          </p> : <ul className="divide-y divide-slate-100">
            {friends.map(f => <li key={f.id} className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => nav(`/friends/${f.id}`)}
                    className="shrink-0 rounded-full transition hover:scale-105"
                    aria-label={`Xem trang cá nhân của ${f.fullName}`}
                    title="Xem trang cá nhân"
                  >
                    <Avatar url={f.avatarUrl} name={f.fullName} size="md" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {f.nickname || f.fullName}
                      {f.nickname && <span className="ml-1 text-xs font-normal text-slate-400">({f.fullName})</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {f.isMyPartner ? 'Partner duyệt ảnh & nhắc uống nước' : f.theyFollow && f.iFollow ? 'Bạn bè' : f.theyFollow ? 'Đang theo dõi bạn' : 'Bạn đang theo dõi'}
                      {f.theirNickname && ` · họ gọi bạn là “${f.theirNickname}”`}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        if (f.isMyPartner && !window.confirm(`Bỏ ${f.nickname || f.fullName} làm người duyệt? Người này sẽ không còn thấy phiếu của bạn để duyệt.`)) return;
                        partner.mutate(f.isMyPartner ? null : f.id);
                      }}
                      disabled={partner.isPending}
                      title={f.isMyPartner ? 'Bỏ chọn người duyệt' : 'Chọn người này duyệt ảnh & nhắc uống nước'}
                      className={`rounded-lg p-1.5 disabled:opacity-50 ${f.isMyPartner ? 'bg-water-600 text-white' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                      aria-label={f.isMyPartner ? `Bỏ ${f.fullName} khỏi làm người duyệt` : `Chọn ${f.fullName} làm người duyệt`}
                      aria-pressed={f.isMyPartner}
                    >
                      <ShieldCheck className="size-3.5" />
                    </button>
                    <button onClick={() => nudge.mutate(f.id)} disabled={nudge.isPending} className="rounded-lg p-1.5 text-water-600 hover:bg-water-50 disabled:opacity-50" aria-label={`Nhắc ${f.fullName} uống nước`} title="Nhắc uống nước">
                      <BellRing className="size-3.5" />
                    </button>
                    <button onClick={() => {
                setEditing(editing === f.id ? null : f.id);
                setDraft(f.nickname ?? '');
              }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600" aria-label={`Đặt biệt hiệu cho ${f.fullName}`} title="Biệt hiệu">
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Xoá ${f.nickname || f.fullName} khỏi danh sách bạn bè?`)) unfriend.mutate(f.id);
                      }}
                      disabled={unfriend.isPending}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      aria-label={`Xoá ${f.fullName} khỏi bạn bè`}
                      title="Xoá bạn bè"
                    >
                      <UserMinus className="size-3.5" />
                    </button>
                  </span>
                </div>

                {editing === f.id && <form onSubmit={e => {
            e.preventDefault();
            nickname.mutate({
              id: f.id,
              value: draft
            });
          }} className="mt-1.5 flex gap-2 pl-11">
                    <input value={draft} maxLength={50} autoFocus onChange={e => setDraft(e.target.value)} placeholder="Biệt hiệu (để trống để xoá)" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
                    <button disabled={nickname.isPending} className="rounded-lg bg-water-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                      Lưu
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                      Huỷ
                    </button>
                  </form>}
              </li>)}
          </ul>}
      </section>
    </div>;
}