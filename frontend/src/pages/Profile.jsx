import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Card, Row, Col, Avatar, Statistic, Tag, Button, Input, Modal,
  List, Space, Pagination, Empty, App as AntdApp,
} from 'antd';
import {
  UserOutlined,
  BookOutlined,
  SoundOutlined,
  AudioOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { progressAPI, authAPI, forumAPI } from '../api';

const { Title, Text } = Typography;

const SYSTEM_EMAILS = ['test@example.com', 'admin@example.com'];

export default function Profile({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();

  const [stats, setStats] = useState({
    wordsLearned: 0,
    listeningDone: 0,
    speakingSessions: 0,
    totalTimeMinutes: 0,
  });

  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const [postCount, setPostCount] = useState(0);
  const [postsOpen, setPostsOpen] = useState(false);
  const [myItems, setMyItems] = useState([]);
  const [myPage, setMyPage] = useState(1);
  const [myTotal, setMyTotal] = useState(0);
  const [myLoading, setMyLoading] = useState(false);

  const canEditUsername = user && !SYSTEM_EMAILS.includes(user.email) && !user.is_admin;

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const response = await progressAPI.getDashboard();
        if (!active) return;
        setStats({
          wordsLearned: response.data.words_learned || 0,
          listeningDone: response.data.listening_done || 0,
          speakingSessions: response.data.speaking_sessions || 0,
          totalTimeMinutes: response.data.total_time_minutes || 0,
        });
      } catch (error) {
        console.error('Failed to load profile progress:', error);
      }
    };
    fetchStats();
    return () => { active = false; };
  }, []);

  // Fetch post count on mount
  useEffect(() => {
    forumAPI.getMyPosts({ page: 1, per_page: 1 })
      .then(res => setPostCount(res.data.total || 0))
      .catch(() => {});
  }, []);

  const fetchMyPosts = useCallback(async (targetPage = 1) => {
    setMyLoading(true);
    try {
      const res = await forumAPI.getMyPosts({ page: targetPage, per_page: 10 });
      setMyItems(res.data.items || []);
      setMyTotal(res.data.total || 0);
    } catch {
      message.error('Failed to load posts');
    } finally {
      setMyLoading(false);
    }
  }, [message]);

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername.trim() === user?.username) {
      setEditingUsername(false);
      return;
    }
    setSavingUsername(true);
    try {
      const res = await authAPI.updateUsername(newUsername.trim());
      message.success('Username updated');
      setEditingUsername(false);
      if (onUserUpdate) onUserUpdate(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  const totalHours = `${(stats.totalTimeMinutes / 60).toFixed(1)}h`;

  return (
    <div className="page-container">
      {/* Profile card */}
      <Card style={{ borderRadius: 16, border: 'none', marginBottom: 24 }} styles={{ body: { padding: 0 } }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '16px 16px 0 0',
          padding: '40px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          <Avatar size={72} style={{ backgroundColor: '#2563eb', fontSize: 28, fontWeight: 700 }}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {editingUsername ? (
                <Space>
                  <Input
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    onPressEnter={handleSaveUsername}
                    size="small"
                    style={{ width: 200 }}
                    autoFocus
                  />
                  <Button size="small" type="primary" icon={<CheckOutlined />} loading={savingUsername} onClick={handleSaveUsername} />
                  <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingUsername(false)} />
                </Space>
              ) : (
                <>
                  <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
                    {user?.username}
                  </Title>
                  {canEditUsername && (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      style={{ color: 'rgba(255,255,255,0.6)' }}
                      onClick={() => { setNewUsername(user?.username || ''); setEditingUsername(true); }}
                    />
                  )}
                </>
              )}
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{user?.email}</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color="blue" style={{ borderRadius: 12 }}>Active Learner</Tag>
            </div>
          </div>
        </div>
        <div style={{ padding: '24px 32px' }}>
          <Row gutter={24}>
            <Col span={5}>
              <Statistic title="Words Learned" value={stats.wordsLearned} prefix={<BookOutlined />} />
            </Col>
            <Col span={5}>
              <Statistic title="Listening Done" value={stats.listeningDone} prefix={<SoundOutlined />} />
            </Col>
            <Col span={5}>
              <Statistic title="Speaking Sessions" value={stats.speakingSessions} prefix={<AudioOutlined />} />
            </Col>
            <Col span={5}>
              <Statistic title="Total Time" value={totalHours} prefix={<ClockCircleOutlined />} />
            </Col>
            <Col span={4}>
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => { setPostsOpen(true); setMyPage(1); fetchMyPosts(1); }}
              >
                <Statistic title="My Posts" value={postCount} prefix={<FileTextOutlined />} />
              </div>
            </Col>
          </Row>
        </div>
      </Card>

      {/* Account info */}
      <Card
        title="Account Information"
        style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
        styles={{ head: { fontWeight: 600 } }}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>Username</Text>
            <div style={{ fontWeight: 500, marginTop: 2 }}>{user?.username}</div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>Email</Text>
            <div style={{ fontWeight: 500, marginTop: 2 }}>{user?.email}</div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>Member Since</Text>
            <div style={{ fontWeight: 500, marginTop: 2 }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
            <div style={{ marginTop: 2 }}>
              <Tag color="green" style={{ borderRadius: 12 }}>Active</Tag>
            </div>
          </Col>
        </Row>
      </Card>

      {/* My Posts Modal */}
      <Modal
        title="My Posts & Forwards"
        open={postsOpen}
        onCancel={() => setPostsOpen(false)}
        footer={null}
        width={700}
      >
        {myLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span>Loading...</span></div>
        ) : myItems.length === 0 ? (
          <Empty description="No posts yet" />
        ) : (
          <>
            <List
              dataSource={myItems}
              renderItem={(item) => (
                <List.Item
                  style={{ padding: '10px 0', cursor: 'pointer' }}
                  onClick={() => {
                    setPostsOpen(false);
                    navigate('/forum', { state: { openPostId: item.type === 'forward' ? item.original_post_id : item.id } });
                  }}
                >
                  {item.type === 'forward' ? (
                    <div style={{ width: '100%' }}>
                      <Tag color="cyan">Forwarded</Tag>
                      {item.comment && <Text style={{ margin: '4px 0', display: 'block', fontStyle: 'italic' }}>{item.comment}</Text>}
                      <Card size="small" style={{ background: '#fafafa', borderRadius: 8 }}>
                        <Text strong>{item.original_post?.title}</Text>
                      </Card>
                    </div>
                  ) : (
                    <div style={{ width: '100%' }}>
                      <Space size={6} wrap>
                        <Tag color="blue">{item.tag}</Tag>
                        <Text strong>{item.title}</Text>
                      </Space>
                    </div>
                  )}
                </List.Item>
              )}
            />
            {myTotal > 10 && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Pagination
                  current={myPage}
                  total={myTotal}
                  pageSize={10}
                  onChange={(p) => { setMyPage(p); fetchMyPosts(p); }}
                  showSizeChanger={false}
                  size="small"
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
