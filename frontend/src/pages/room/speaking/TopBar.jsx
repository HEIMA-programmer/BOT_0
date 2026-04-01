import { useState, useCallback } from 'react';
import { Typography, Button, Space, Popover } from 'antd';
import { LinkOutlined, CheckOutlined, TeamOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { copyInviteCode } from '../../../utils/roomUtils';

const { Text } = Typography;

export default function TopBar({ room, elapsed, formatElapsed, memberCount }) {
  const [showInvite, setShowInvite] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

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
          onOpenChange={setShowInvite}
          trigger="click"
          placement="bottomRight"
          content={
            <div style={{ width: 220 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Invite Code</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
