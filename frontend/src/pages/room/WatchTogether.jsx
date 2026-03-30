import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Button, Input, Avatar, Modal, Tooltip, Space, Tag } from 'antd';
import {
  PlayCircleOutlined, PauseOutlined, SoundOutlined,
  TeamOutlined, SendOutlined, ArrowLeftOutlined, FullscreenOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

import { getAvatarColor } from '../../utils/roomUtils';

const MOCK_COMMENTS = [
  { id: 1, username: 'Alice', text: 'Great explanation here!', time: '18:42' },
  { id: 2, username: 'Bob', text: "I didn't catch that word, can we replay?", time: '18:43' },
  { id: 3, username: 'Alice', text: 'Sure, host can rewind 👍', time: '18:43' },
];

const MOCK_ROOM = {
  id: 'demo', name: 'Study Together', type: 'watch',
  hostId: 1, contentTitle: 'Academic Vocabulary Basics — Level 1',
};
const MOCK_MEMBERS = [
  { id: 1, username: 'Host' },
  { id: 2, username: 'Alice' },
  { id: 3, username: 'Bob' },
];

export default function WatchTogether({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { room: r, members: m } = location.state || {};
  const room = r || MOCK_ROOM;
  const members = m || MOCK_MEMBERS;

  const isHost = room.hostId === (user?.id || 0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [commentInput, setCommentInput] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [volume, setVolume] = useState(80);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setProgress(p => Math.min(p + 0.5, 100));
    }, 500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleSend = useCallback(() => {
    const text = commentInput.trim();
    if (!text) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setComments(prev => [...prev, { id: Date.now(), username: user?.username || 'You', text, time }]);
    setCommentInput('');
  }, [commentInput, user]);

  const formatTime = (pct) => {
    const total = 1200; // mock 20 min
    const secs = Math.floor((pct / 100) * total);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        height: 52, background: '#1e293b', display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 12, borderBottom: '1px solid #334155', flexShrink: 0,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          size="small"
          onClick={() => setShowLeave(true)}
          style={{ background: 'transparent', borderColor: '#475569', color: '#94a3b8' }}
        >
          Leave
        </Button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlayCircleOutlined style={{ color: '#60a5fa' }} />
          <Text style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{room.name}</Text>
          <Tag color="blue" style={{ borderRadius: 6, fontSize: 11 }}>Watch Together</Tag>
        </div>
        <Tooltip title="Members">
          <Button
            icon={<TeamOutlined />}
            size="small"
            onClick={() => setShowMembers(v => !v)}
            style={{
              background: showMembers ? '#2563eb' : 'transparent',
              borderColor: '#475569', color: showMembers ? '#fff' : '#94a3b8',
            }}
          >
            {members.length}
          </Button>
        </Tooltip>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Video Placeholder */}
          <div style={{
            flex: 1, background: '#000', display: 'flex', alignItems: 'center',
            justifyContent: 'center', position: 'relative',
          }}>
            <div style={{ textAlign: 'center' }}>
              <PlayCircleOutlined style={{ fontSize: 64, color: '#334155' }} />
              <Text style={{ display: 'block', color: '#475569', marginTop: 12, fontSize: 14 }}>
                {room.contentTitle || 'No content selected'}
              </Text>
            </div>
            {!isHost && (
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '6px 14px',
              }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Controlled by host</Text>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div style={{
            background: '#1e293b', padding: '12px 20px',
            borderTop: '1px solid #334155',
          }}>
            {/* Progress Bar */}
            <div
              style={{ height: 4, background: '#334155', borderRadius: 2, marginBottom: 10, cursor: isHost ? 'pointer' : 'default' }}
              onClick={isHost ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setProgress(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
              } : undefined}
            >
              <div style={{ height: '100%', width: `${progress}%`, background: '#2563eb', borderRadius: 2, transition: 'width 0.5s linear' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                type="text"
                icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                onClick={isHost ? () => setIsPlaying(v => !v) : undefined}
                disabled={!isHost}
                style={{ color: isHost ? '#f1f5f9' : '#475569', fontSize: 18, padding: '0 4px' }}
              />
              <Text style={{ color: '#64748b', fontSize: 12, minWidth: 80 }}>
                {formatTime(progress)} / 20:00
              </Text>
              <div style={{ flex: 1 }} />
              <SoundOutlined style={{ color: '#64748b' }} />
              <div
                style={{ width: 80, height: 4, background: '#334155', borderRadius: 2, cursor: isHost ? 'pointer' : 'default' }}
                onClick={isHost ? (e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setVolume(Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100))));
                } : undefined}
              >
                <div style={{ height: '100%', width: `${volume}%`, background: '#60a5fa', borderRadius: 2 }} />
              </div>
              <FullscreenOutlined style={{ color: '#64748b' }} />
            </div>
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div style={{
            width: 180, background: '#1e293b', borderLeft: '1px solid #334155',
            padding: '16px 12px', flexShrink: 0,
          }}>
            <Text style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>
              Members
            </Text>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Avatar size={28} style={{ background: getAvatarColor(m.username), fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {m.username.charAt(0).toUpperCase()}
                </Avatar>
                <Text style={{ color: '#e2e8f0', fontSize: 13 }} ellipsis>{m.username}</Text>
              </div>
            ))}
          </div>
        )}

        {/* Comment Panel */}
        <div style={{
          width: 300, background: '#1e293b', borderLeft: '1px solid #334155',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Live Comments</Text>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {comments.map(c => (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Avatar size={18} style={{ background: getAvatarColor(c.username), fontSize: 9, fontWeight: 700 }}>
                    {c.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>{c.username}</Text>
                  <Text style={{ color: '#475569', fontSize: 11, marginLeft: 'auto' }}>{c.time}</Text>
                </div>
                <Text style={{ color: '#cbd5e1', fontSize: 13, paddingLeft: 24, display: 'block', lineHeight: '1.4' }}>
                  {c.text}
                </Text>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid #334155', flexShrink: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Say something..."
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onPressEnter={handleSend}
                style={{ background: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!commentInput.trim()}
              />
            </Space.Compact>
          </div>
        </div>
      </div>

      <Modal
        title="Leave Room?"
        open={showLeave}
        onCancel={() => setShowLeave(false)}
        onOk={() => navigate('/room')}
        okText="Leave"
        okButtonProps={{ danger: true }}
        width={340}
      >
        <Text>Are you sure you want to leave the watch session?</Text>
      </Modal>
    </div>
  );
}
