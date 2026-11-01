import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlarmClock, Lock, Moon, Settings } from 'lucide-react';
import { habitService } from '../../../services/habitService';
import { sleepService } from '../../../services/sleepService';
import { askNotificationPermission, showSystemNotification } from '../../../utils/notify';

import { isSleepAlarmStoppedToday, isSleepReminderStoppedToday, stopSleepAlarmToday, stopSleepReminderToday } from '../sleepAlarmStorage';

/**
 * Màn hình báo thức ngủ: kêu theo "số lần mỗi vòng × số vòng" của chế độ đã chọn.
 * Chế độ chống tắt thì chỉ tắt được khi chạy đủ vòng, hoặc vào Cài đặt giấc ngủ để tắt.
 * Chỉ chạy khi app đang mở (web); bản APK dùng lịch thông báo của hệ điều hành.
 */
export function SleepAlarmOverlay() {
  const { data: habits } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => (await habitService.list()).data,
    staleTime: 60_000,
  });

  const row = habits?.find((h) => h.kind === 'sleep');
  const [ringing, setRinging] = useState(false);
  const [call, setCall] = useState(1);

  const wake = row?.times?.[1] ?? '07:00';
  const perRound = row?.alarmRepeatPerRound ?? 3;
  const rounds = row?.alarmRounds ?? 3;
  const intervalMin = row?.alarmIntervalMin ?? 1;
  const locked = Boolean(row?.lockUntilSettings) && row?.alarmMode !== 'gentle';

  const close = useCallback(() => {
    setRinging(false);
    stopSleepAlarmToday('dismissed');
  }, []);

  // ---- Nhắc TRƯỚC giờ đi ngủ (vd. trước 10 phút) ----
  const [prebed, setPrebed] = useState(null); // { minutesLeft, bed }
  const bed = row?.times?.[0] ?? '23:00';
  const remindBefore = row?.remindBeforeMin ?? 10;

  const dismissPrebed = useCallback(async () => {
    setPrebed(null);
    stopSleepReminderToday('dismissed');
    try {
      await sleepService.dismissReminder();
    } catch {
      /* mất mạng thì thôi, mai nhắc lại */
    }
  }, []);

  useEffect(() => {
    if (!row?.alarmEnabled || row?.enabled === false) {
      setPrebed(null);
      return undefined;
    }
    const tick = () => {
      // Đã tắt nhắc hôm nay thì thôi (cờ riêng, không ảnh hưởng báo thức dậy).
      if (isSleepReminderStoppedToday()) {
        setPrebed(null);
        return;
      }
      const [bh, bm] = bed.split(':').map(Number);
      if (Number.isNaN(bh) || Number.isNaN(bm)) return;
      const now = new Date();
      const at = new Date(now);
      at.setHours(bh, bm, 0, 0);
      const diffMin = (at - now) / 60000;
      // Từ lúc (giờ ngủ - số phút nhắc) tới 15 phút sau giờ ngủ.
      if (diffMin <= remindBefore && diffMin > -15) {
        setPrebed({ minutesLeft: Math.max(0, Math.ceil(diffMin)), bed: bed });
      } else {
        setPrebed(null);
      }
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [row?.alarmEnabled, row?.enabled, bed, remindBefore]);

  // Rung + thông báo hệ thống lặp lại mỗi 30 giây cho tới khi người dùng tắt.
  useEffect(() => {
    if (!prebed) return undefined;
    const buzz = async () => {
      if (navigator.vibrate) navigator.vibrate([600, 250, 600, 250, 600]);
      await askNotificationPermission();
      showSystemNotification(
        prebed.minutesLeft > 0 ? `⏰ Còn ${prebed.minutesLeft} phút là tới giờ đi ngủ` : '⏰ Đã tới giờ đi ngủ',
        'Vào Dearly bấm "Tắt nhắc" để thôi nhắc hôm nay.',
      );
    };
    void buzz();
    const id = setInterval(buzz, 30_000);
    return () => clearInterval(id);
  }, [prebed?.bed, prebed?.minutesLeft]);

  // Kiểm tra mỗi 10 giây xem đã tới giờ báo thức chưa.
  useEffect(() => {
    if (!row?.alarmEnabled) return;
    const tick = () => {
      if (isSleepAlarmStoppedToday()) return;
      const [h, m] = wake.split(':').map(Number);
      const now = new Date();
      const start = new Date(now);
      start.setHours(h, m, 0, 0);
      const diffMin = (now - start) / 60000;
      if (diffMin >= 0 && diffMin < 45) setRinging(true);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [row?.alarmEnabled, wake]);

  // Lặp lại theo cấu hình: mỗi vòng `perRound` lần, tổng `rounds` vòng.
  useEffect(() => {
    if (!ringing) return;
    setCall(1);
    const total = perRound * rounds;
    let count = 1;

    const fire = async () => {
      const perRoundIndex = ((count - 1) % perRound) + 1;
      const roundIndex = Math.floor((count - 1) / perRound) + 1;
      if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
      const ok = await askNotificationPermission();
      if (ok) {
        showSystemNotification(
          '⏰ Báo thức Dearly',
          `Vòng ${roundIndex}/${rounds} · lần ${perRoundIndex}/${perRound} — dậy thôi!`,
        );
      }
    };

    void fire();
    const id = setInterval(async () => {
      count += 1;
      if (count > total) {
        clearInterval(id);
        // Hết vòng: tự tắt (kể cả chế độ chống tắt).
        setRinging(false);
        stopSleepAlarmToday('completed');
        return;
      }
      setCall(count);
      await fire();
    }, Math.max(1, intervalMin) * 60_000);

    return () => clearInterval(id);
  }, [ringing, perRound, rounds, intervalMin]);

  // Trang Cài đặt bấm "Tắt báo thức" → đóng màn hình này.
  useEffect(() => {
    const handler = () => setRinging(false);
    window.addEventListener('dearly:sleep-alarm-stop', handler);
    return () => window.removeEventListener('dearly:sleep-alarm-stop', handler);
  }, []);

  if (!ringing && !prebed) return null;

  // Màn hình nhắc trước giờ ngủ (ưu tiên hiện khi chưa tới giờ báo thức dậy).
  if (!ringing && prebed) {
    return (
      <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#3a1f4d]/96 to-[#1f2437]/96 p-6 text-center text-cream-50 backdrop-blur">
        <span className="flex size-20 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/20">
          <Moon className="size-10 animate-pulse" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cream-200/80">Sắp tới giờ đi ngủ</p>
        <p className="text-2xl font-bold">
          {prebed.minutesLeft > 0 ? `Còn ${prebed.minutesLeft} phút` : 'Đã tới giờ'}
        </p>
        <p className="max-w-xs text-sm text-cream-200/80">
          Giờ ngủ đặt lúc <b>{prebed.bed}</b> — chuẩn bị lên giường để ngủ đủ giấc nhé.
        </p>

        <div className="mt-2 w-full max-w-xs space-y-2">
          <Link
            to="/?view=sleep"
            onClick={() => setPrebed(null)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-cream-200 py-3 text-sm font-bold text-water-800"
          >
            <Moon className="size-4" /> Vào trang Giấc ngủ
          </Link>
          <button
            onClick={dismissPrebed}
            className="w-full rounded-xl bg-white/15 py-2.5 text-sm font-semibold text-cream-50"
          >
            Tắt nhắc hôm nay
          </button>
          <p className="flex items-center justify-center gap-1 text-[11px] text-cream-200/60">
            <AlarmClock className="size-3" /> Sẽ nhắc lại mỗi 30 giây cho tới khi bạn tắt
          </p>
        </div>
      </div>
    );
  }

  const roundIndex = Math.floor((call - 1) / perRound) + 1;
  const perRoundIndex = ((call - 1) % perRound) + 1;
  const alive = call < perRound * rounds;
  const canDismiss = !locked || !alive;

  return (
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#571722]/95 to-[#2b1a1e]/95 p-6 text-center text-cream-50 backdrop-blur">
      <span className="flex size-20 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/20">
        <AlarmClock className="size-10 animate-pulse" />
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cream-200/80">Báo thức Dearly</p>
      <p className="text-2xl font-bold">
        Vòng {roundIndex}/{rounds} · lần {perRoundIndex}/{perRound}
      </p>
      <p className="max-w-xs text-sm text-cream-200/80">
        {locked && alive
          ? 'Chế độ chống tắt: phải chạy đủ số vòng, hoặc vào Cài đặt giấc ngủ để tắt.'
          : 'Dậy thôi! Mở Dearly ghi lại giấc ngủ đêm qua nhé.'}
      </p>

      <div className="mt-2 w-full max-w-xs space-y-2">
        <button
          onClick={close}
          disabled={!canDismiss}
          className="w-full rounded-xl bg-cream-200 py-3 text-sm font-bold text-water-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {canDismiss ? 'Tắt báo thức' : 'Chưa tắt được — đang chạy vòng lặp'}
        </button>
        {locked && alive && (
          <Link
            to="/settings/sleep"
            onClick={close}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-sm font-semibold text-cream-50"
          >
            <Settings className="size-4" /> Vào Cài đặt để tắt
          </Link>
        )}
        <p className="flex items-center justify-center gap-1 text-[11px] text-cream-200/60">
          {locked ? <Lock className="size-3" /> : <Moon className="size-3" />}
          {locked ? 'Chống tắt đang bật' : 'Chế độ nhẹ nhàng'} · tắt hẳn trong Cài đặt giấc ngủ
        </p>
      </div>
    </div>
  );
}

export default SleepAlarmOverlay;
