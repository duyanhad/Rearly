/**
 * Âm thanh báo cho người đang mở app (Web Push chỉ dùng âm mặc định của hệ điều hành).
 * Trình duyệt chặn phát âm thanh khi người dùng chưa bấm gì → im lặng bỏ qua.
 */
let ctx = null;

function ensureContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx ??= new AudioCtx();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function beep(frequency, durationMs, startAt, gainValue) {
  const audio = ensureContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(gainValue, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationMs / 1000);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + durationMs / 1000 + 0.05);
}

/** Tiếng "bíp" theo tính cách: ác quỷ ba hồi dồn dập, nhẹ nhàng một tiếng nhỏ. */
export function playChime(style = 'normal') {
  const audio = ensureContext();
  if (!audio) return;
  const now = audio.currentTime + 0.02;
  if (style === 'demon') {
    [0, 0.28, 0.56].forEach((offset, index) => {
      beep(880, 180, now + offset, 0.16);
      beep(1180, 140, now + offset + 0.14, 0.1 + index * 0.01);
    });
  } else if (style === 'gentle') {
    beep(660, 260, now, 0.07);
  } else {
    beep(720, 200, now, 0.12);
    beep(960, 180, now + 0.22, 0.09);
  }
}

/** Rung theo tính cách (Android/desktop); iOS Safari không hỗ trợ. */
export function vibrate(style = 'normal') {
  const pattern = style === 'demon' ? [600, 200, 600, 200, 900] : style === 'gentle' ? [180] : [400, 150, 400];
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // thiết bị không hỗ trợ thì thôi
  }
}
