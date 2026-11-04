import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardList, Plus, X, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../../components/Avatar';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { dutyService } from '../../../services/dutyService';
import { socialService } from '../../../services/socialService';
import { DutyCreateSheet, DutyDetailSheet, DeclineReasonSheet } from './DutySheets';
import { dueCountdown, statusMeta } from './dutyStatus';

const TABS = [
  { key: 'mine', label: 'Được giao' },
  { key: 'given', label: 'Tôi giao' },
];

/** Danh sách nhiệm vụ dùng chung cho popup và khối trong trang Hôm nay. */
export function useDuties() {
  const mine = useQuery({
    queryKey: ['duties', 'mine'],
    queryFn: async () => (await dutyService.list('mine')).data,
    refetchInterval: 30_000,
  });
  const given = useQuery({
    queryKey: ['duties', 'given'],
    queryFn: async () => (await dutyService.list('given')).data,
    refetchInterval: 30_000,
  });
  return {
    mine: mine.data ?? [],
    given: given.data ?? [],
    isLoading: mine.isLoading || given.isLoading,
  };
}

export function DutyRow({ duty, onOpen }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [declining, setDeclining] = useState(false);
  const meta = statusMeta(duty);

  const refresh = () => qc.invalidateQueries({ queryKey: ['duties'] });
  const accept = useMutation({
    mutationFn: () => dutyService.accept(duty.id),
    onSuccess: async () => {
      await refresh();
      toast.show('Đã nhận nhiệm vụ', 'Hệ thống thôi nhắc và báo cho người giao.');
    },
    onError: (err) => toast.show('Chưa nhận được', errorMessage(err)),
  });
  const decline = useMutation({
    mutationFn: (note) => dutyService.decline(duty.id, note),
    onSuccess: async () => {
      await refresh();
      toast.show('Đã từ chối nhiệm vụ', 'Người giao sẽ nhận thông báo.');
    },
    onError: (err) => toast.show('Chưa từ chối được', errorMessage(err)),
  });

  const quick = duty.needsAccept && !duty.mine;

  return (
    <>
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <button
          type="button"
          onClick={() => onOpen(duty.id)}
          className="flex w-full items-start gap-2.5 text-left transition active:scale-[0.99]"
        >
          <Avatar
            url={duty.mine ? duty.assigneeAvatar : duty.assignerAvatar}
            name={duty.mine ? duty.assigneeName : duty.assignerName}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{duty.title}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${meta.tone}`}>{meta.label}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {duty.mine ? `Giao cho ${duty.assigneeName}` : `Từ ${duty.assignerName}`} ·{' '}
              {duty.status === 'approved' || duty.status === 'declined' ? 'đã xong' : dueCountdown(duty.dueAtUtc)}
            </p>
          </div>
        </button>

        {quick && (
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => accept.mutate()}
              disabled={accept.isPending || decline.isPending}
              className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full bg-water-700 text-[11px] font-bold text-white disabled:opacity-50"
            >
              <Check className="size-3.5" /> {accept.isPending ? 'Đang nhận…' : 'Nhận việc'}
            </button>
            <button
              type="button"
              onClick={() => setDeclining(true)}
              disabled={accept.isPending || decline.isPending}
              className="flex min-h-9 items-center justify-center gap-1 rounded-full bg-white px-3 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200 disabled:opacity-50"
            >
              <XCircle className="size-3.5" /> Từ chối
            </button>
          </div>
        )}
      </div>

      {declining && (
        <DeclineReasonSheet
          title={duty.title}
          pending={decline.isPending}
          onClose={() => setDeclining(false)}
          onConfirm={(note) => decline.mutate(note)}
        />
      )}
    </>
  );
}

/**
 * Popup Nhiệm vụ (bấm từ menu + hoặc từ khối trong Hôm nay): tab Được giao / Tôi giao,
 * tạo nhiệm vụ, mở chi tiết để nhận việc / báo cáo / duyệt.
 */
export function DutySheet({ onClose, initialTab = 'mine' }) {
  const [tab, setTab] = useState(initialTab);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(null);

  const { data: myPartner } = useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => (await socialService.getMyPartner()).data,
    staleTime: 60_000,
  });
  const { mine, given, isLoading } = useDuties();
  const list = tab === 'mine' ? mine : given;
  const open = [...mine, ...given].find((d) => d.id === openId) ?? null;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nhiệm vụ"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-full flex-col rounded-t-3xl bg-cream-50 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start gap-2 px-4 pt-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
            <ClipboardList className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Nhiệm vụ</p>
            <p className="truncate text-[11px] text-slate-500">
              {myPartner?.fullName ? `Giao việc cho ${myPartner.fullName} và duyệt báo cáo của nhau.` : 'Cần có partner để giao nhiệm vụ.'}
            </p>
          </div>
          {myPartner && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-water-700 px-2.5 text-[11px] font-bold text-white"
            >
              <Plus className="size-3.5" /> Giao việc
            </button>
          )}
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        {!myPartner ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-800">Chưa có partner</p>
            <p className="mt-1 text-xs text-slate-500">Nhiệm vụ chỉ dùng giữa 2 partner.</p>
            <Link
              to="/partner"
              onClick={onClose}
              className="mt-3 inline-flex rounded-full bg-water-700 px-4 py-2 text-xs font-semibold text-white"
            >
              Đi tới Kênh partner
            </Link>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 px-4 pt-3">
              {TABS.map((t) => {
                const count = t.key === 'mine' ? mine.length : given.length;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition ${
                      active ? 'bg-water-700 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                    }`}
                  >
                    {t.label}
                    {count > 0 && (
                      <span
                        className={`rounded-full px-1.5 text-[10px] font-bold ${
                          active ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {isLoading ? (
                <DearlyLoader />
              ) : list.length === 0 ? (
                <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-100">
                  <ClipboardList className="mx-auto size-7 text-slate-300" />
                  <p className="mt-1.5 text-sm font-medium text-slate-700">
                    {tab === 'mine' ? 'Chưa ai giao việc cho bạn' : 'Bạn chưa giao nhiệm vụ nào'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {tab === 'mine' ? 'Nhiệm vụ partner giao sẽ hiện ở đây.' : 'Bấm “Giao việc” để đặt nhiệm vụ kèm hạn.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {list.map((duty) => (
                    <li key={duty.id}>
                      <DutyRow duty={duty} onOpen={setOpenId} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {open && !editing && (
        <DutyDetailSheet duty={open} onClose={() => setOpenId(null)} onEdit={(d) => setEditing(d)} />
      )}
      {creating && (
        <DutyCreateSheet partner={myPartner} onClose={() => setCreating(false)} onSaved={() => setTab('given')} />
      )}
      {editing && (
        <DutyCreateSheet
          partner={myPartner}
          duty={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

export default DutySheet;
