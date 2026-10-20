import { AlignLeft, AtSign, Calendar, CheckSquare, ChevronDownSquare, CircleDot, Hash, LayoutList, ListChecks, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NodeType } from '@/lib';

export const FIELD_ICONS: Record<NodeType, LucideIcon> = {
  text: Type,
  email: AtSign,
  number: Hash,
  select: ChevronDownSquare,
  multiselect: ListChecks,
  checkbox: CheckSquare,
  radio: CircleDot,
  date: Calendar,
  textarea: AlignLeft,
  section: LayoutList,
};
