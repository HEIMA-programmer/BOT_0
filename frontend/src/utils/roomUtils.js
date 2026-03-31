/**
 * Shared utilities for the Room module.
 */
import { PlayCircleOutlined, VideoCameraOutlined, TrophyOutlined } from '@ant-design/icons';

export const TYPE_CONFIG = {
  watch:    { label: 'Watch Together', color: '#2563eb', bg: '#dbeafe', Icon: PlayCircleOutlined },
  speaking: { label: 'Speaking Room',  color: '#16a34a', bg: '#dcfce7', Icon: VideoCameraOutlined },
  game:     { label: 'Game Room',      color: '#ea580c', bg: '#ffedd5', Icon: TrophyOutlined },
};

export const AVATAR_COLORS = [
  '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777', '#0891b2', '#d97706',
];

/**
 * Deterministic avatar background colour based on username.
 */
export function getAvatarColor(username = '') {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
