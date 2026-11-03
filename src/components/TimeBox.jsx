/**
 * Ô nhập giờ tự vẽ khung.
 *
 * iOS/Android vẽ `<input type="time">` bằng control gốc: hộp vuông góc, nền trắng đè lên
 * bo góc và viền của CSS. Đặt cạnh nhau là hai ô trông như dính/ghép làm một. Vì vậy viền,
 * bo góc, nền và shadow do `div` bao ngoài lo; input chỉ còn chữ.
 */
export function TimeBox({ value, onChange, className = '', inputClassName = '', ...rest }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-slate-300 bg-white py-2.5 shadow-sm transition focus-within:border-water-400 focus-within:ring-4 focus-within:ring-water-100 ${
        className || 'w-full px-2'
      }`}
    >
      <input
        type="time"
        value={value}
        onChange={onChange}
        className={`w-full appearance-none border-0 bg-transparent text-center text-base font-bold tabular-nums text-slate-800 outline-none [&::-webkit-calendar-picker-indicator]:opacity-50 ${inputClassName}`}
        {...rest}
      />
    </div>
  );
}

export default TimeBox;
