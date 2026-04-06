import { useState, useCallback } from 'react';
import { Typography, Button, Space, Popover, Avatar, Tag } from 'antd';
import { LinkOutlined, CheckOutlined, TeamOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { copyInviteCode } from '../../../utils/roomUtils';
import { friendsAPI } from '../../../api';

const { Text } = Typography;

export default function TopBar({ room, elapsed, formatElapsed, memberCount, socketRef, members }) {
  const [showInvite, setShowInvite] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [invitedFriends, setInvitedFriends] = useState(new Set());

  const handleCopyCode = useCallback(() => {
    copyInviteCode(room?.invite_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [room?.invite_code]);

  return (
    <div style={{
      background: '#1a1a2e', padding: '0 24px', height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <Space size={10}>
        <Text strong style={{ color: '#f1f5f9', fontSize: 15 }}>{room?.name}</Text>
      </Space>
      <Space size={8}>
        <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />{formatElapsed(elapsed)}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 12 }}>
          <TeamOutlined style={{ marginRight: 4 }} />{memberCount} members
        </Text>
        <Popover
          open={showInvite}
          onOpenChange={(open) => {
            setShowInvite(open);
            if (open && friendsList.length === 0) {
              friendsAPI.list().then(res => setFriendsList(res.data.friends || [])).catch(() => {});
            }
          }}
          trigger="click"
          placement="bottomRight"
          content={
            <div style={{ width: 280 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Invite Code</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  flex: 1, fontFamily: 'monospace', fontSize: 22, fontWeight: 700,
                  letterSpacing: 4, textAlign: 'center',
                  background: '#f0f2f5', borderRadius: 8, padding: '8px 0',
                }}>
                  {room?.invite_code || '------'}
                </div>
                <Button
                  icon={codeCopied ? <CheckOutlined /> : <LinkOutlined />}
                  onClick={handleCopyCode}
                  type={codeCopied ? 'primary' : 'default'}
                >
                  {codeCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Invite Friends Directly
              </Text>
              {friendsList.length > 0 ? (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {friendsList.map(f => {
                    const alreadyInRoom = members?.some(m => m.user_id === f.friend_id || m.uid === f.friend_id);
                    const alreadyInvited = invitedFriends.has(f.friend_id);
                    return (
                      <div key={f.friend_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <Avatar size={24} style={{ backgroundColor: '#2563eb', fontSize: 11 }}>
                          {f.friend_username?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Text style={{ flex: 1, fontSize: 13 }}>{f.friend_username}</Text>
                        {alreadyInRoom ? (
                          <Tag color="green" style={{ fontSize: 11 }}>In Room</Tag>
                        ) : alreadyInvited ? (
                          <Tag color="blue" style={{ fontSize: 11 }}>Invited</Tag>
                        ) : (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => {
                              socketRef?.current?.emit('invite_friend', { room_id: room?.id, target_user_id: f.friend_id });
                              setInvitedFriends(prev => new Set([...prev, f.friend_id]));
                            }}
                          >
                            Invite
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>No friends to invite</Text>
              )}
            </div>
          }
        >
          <Button
            size="small"
            icon={<LinkOutlined />}
            style={{ background: 'transparent', borderColor: '#334155', color: '#94a3b8' }}
          >
            Invite
          </Button>
        </Popover>
      </Space>
    </div>
  );
}
