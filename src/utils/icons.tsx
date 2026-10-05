import React from 'react';
import {
  Briefcase,
  Laptop,
  HeartHandshake,
  BookOpen,
  Coffee,
  Dumbbell,
  Compass,
  Moon,
  Shield,
  Smile,
  Sun,
  User,
  Code,
  Hammer,
  Sparkles,
  Folder,
  GraduationCap,
  Flame,
  Target,
  Palette,
  Music,
  Home,
  Clock,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

export const AVAILABLE_ICONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'Briefcase', label: 'Lavoro / Azienda', icon: Briefcase },
  { name: 'Laptop', label: 'Tech / Computer', icon: Laptop },
  { name: 'HeartHandshake', label: 'Famiglia / Relazioni', icon: HeartHandshake },
  { name: 'BookOpen', label: 'Studio / Lettura', icon: BookOpen },
  { name: 'Home', label: 'Casa / Vita', icon: Home },
  { name: 'Target', label: 'Focus / Obiettivi', icon: Target },
  { name: 'Dumbbell', label: 'Sport / Salute', icon: Dumbbell },
  { name: 'Coffee', label: 'Pausa / Benessere', icon: Coffee },
  { name: 'Code', label: 'Programmazione', icon: Code },
  { name: 'Palette', label: 'Creatività / Arte', icon: Palette },
  { name: 'Music', label: 'Musica / Hobby', icon: Music },
  { name: 'GraduationCap', label: 'Formazione', icon: GraduationCap },
  { name: 'Moon', label: 'Riposo / Notte', icon: Moon },
  { name: 'Sun', label: 'Energia Mattutina', icon: Sun },
  { name: 'Flame', label: 'Passione / Urgenza', icon: Flame },
  { name: 'Shield', label: 'Responsabilità', icon: Shield },
  { name: 'Compass', label: 'Esplorazione', icon: Compass },
  { name: 'Sparkles', label: 'Ispirazione', icon: Sparkles },
];

export const PRESET_COLORS = [
  { hex: '#2563eb', label: 'Blu Cobalto' },
  { hex: '#7c3aed', label: 'Viola / Indaco' },
  { hex: '#059669', label: 'Verde Smeraldo' },
  { hex: '#d97706', label: 'Ambra / Oro' },
  { hex: '#dc2626', label: 'Rosso Corallo' },
  { hex: '#0891b2', label: 'Ciano / Mare' },
  { hex: '#db2777', label: 'Rosa Magenta' },
  { hex: '#4f46e5', label: 'Blu Elettrico' },
  { hex: '#16a34a', label: 'Verde Bosco' },
  { hex: '#475569', label: 'Ardesia Neutro' },
];

export function getRoleIconComponent(iconName?: string): LucideIcon {
  if (!iconName) return User;
  const match = AVAILABLE_ICONS.find((item) => item.name === iconName);
  return match ? match.icon : User;
}

export function RoleIcon({
  name,
  className = 'w-5 h-5',
}: {
  name?: string;
  className?: string;
}) {
  const IconComponent = getRoleIconComponent(name);
  return <IconComponent className={className} />;
}
