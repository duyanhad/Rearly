import { Atom, Droplet, Heart, Leaf, Moon, Pill, Soup, Star } from 'lucide-react';

/** Icon theo `iconKey` admin chọn cho từng loại tiền. Key lạ thì dùng ngôi sao. */
export const CURRENCY_ICONS = {
  droplet: Droplet,
  moon: Moon,
  pill: Pill,
  bowl: Soup,
  leaf: Leaf,
  heart: Heart,
  star: Star,
  atom: Atom,
};

export const CURRENCY_ICON_KEYS = Object.keys(CURRENCY_ICONS);
