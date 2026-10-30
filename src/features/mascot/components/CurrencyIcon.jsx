import { Star } from 'lucide-react';
import { CURRENCY_ICONS } from '../currencyIcons';

/** Icon của một loại tiền; dùng chung cho trang admin và trang người dùng. */
export function CurrencyIcon({ iconKey, className = 'size-4', color }) {
  const Icon = CURRENCY_ICONS[iconKey] ?? Star;
  return <Icon className={className} style={color ? { color } : undefined} />;
}

export default CurrencyIcon;
