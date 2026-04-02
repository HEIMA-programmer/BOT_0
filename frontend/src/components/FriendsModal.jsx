import { useCallback, useState } from 'react';
import {
  App as AntdApp,
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { friendsAPI } from '../api';

const { Text } = Typography;

export default function FriendsModal({ open, onClose }) {
  const { message } = AntdApp.useApp();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [] });
  const [friendSearchEmail, setFriendSearchEmail] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState([]);

  const fetchFriends = useCallback(async () => {
    try {
      const [friendRes, reqRes] = await Promise.all([
        friendsAPI.list(),
        friendsAPI.getRequests(),
      ]);
      setFriends(friendRes.data.friends || []);
      setFriendRequests(reqRes.data || { received: [], sent: [] });
    } catch {
      /* ignore */
    }
  }, []);

  const handleSearchFriends = async () => {
    if (!friendSearchEmail.trim()) return;
    try {
      const res = await friendsAPI.search(friendSearchEmail.trim());
      setFriendSearchResults(res.data.users || []);
    } catch {
      message.error('Search failed');
    }
  };

  const handleSendFriendRequest = async (email) => {
    try {
      await friendsAPI.sendRequest(email);
      message.success('Friend request sent');
      handleSearchFriends();
      fetchFriends();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAcceptFriend = async (requestId) => {
    try {
      await friendsAPI.accept(requestId);
      message.success('Friend request accepted');
      fetchFriends();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to accept request');
    }
  };

  const handleRejectFriend = async (requestId) => {
    try {
      await friendsAPI.reject(requestId);
      message.success('Friend request rejected');
      fetchFriends();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleRemoveFriend = async (friendUserId) => {
    try {
      await friendsAPI.remove(friendUserId);
      message.success('Friend removed');
      fetchFriends();
    } catch {
      message.error('Failed to remove friend');
    }
  };

  const handleOpen = () => {
    fetchFriends();
  };

  return (
    <Modal
      title="Manage Friends"
      open={open}
      onCancel={() => { onClose(); setFriendSearchEmail(''); setFriendSearchResults([]); }}
      afterOpenChange={(visible) => { if (visible) handleOpen(); }}
      footer={null}
      width={600}
    >
      <Tabs items={[
        {
          key: 'friends',
          label: `My Friends (${friends.length})`,
          children: friends.length === 0 ? (
            <Empty description="No friends yet" />
          ) : (
            <List
              dataSource={friends}
              renderItem={(f) => (
                <List.Item
                  actions={[
                    <Popconfirm key="rm" title="Remove this friend?" onConfirm={() => handleRemoveFriend(f.friend_id)}>
                      <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#2563eb' }}>{f.friend_username?.charAt(0)?.toUpperCase()}</Avatar>}
                    title={f.friend_username}
                    description={f.friend_email}
                  />
                </List.Item>
              )}
            />
          ),
        },
        {
          key: 'search',
          label: 'Find Friends',
          children: (
            <div>
              <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                <Input
                  placeholder="Search by email..."
                  value={friendSearchEmail}
                  onChange={(e) => setFriendSearchEmail(e.target.value)}
                  onPressEnter={handleSearchFriends}
                />
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearchFriends}>Search</Button>
              </Space.Compact>
              {friendSearchResults.length > 0 ? (
                <List
                  dataSource={friendSearchResults}
                  renderItem={(u) => (
                    <List.Item
                      actions={[
                        u.is_friend ? (
                          <Tag key="f" color="green">Already Friends</Tag>
                        ) : u.has_pending_request ? (
                          <Tag key="p" color="gold">Request Pending</Tag>
                        ) : (
                          <Button key="add" size="small" type="primary" icon={<UserAddOutlined />}
                            onClick={() => handleSendFriendRequest(u.email)}>
                            Add Friend
                          </Button>
                        ),
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar style={{ backgroundColor: '#7c3aed' }}>{u.username?.charAt(0)?.toUpperCase()}</Avatar>}
                        title={u.username}
                        description={u.email}
                      />
                    </List.Item>
                  )}
                />
              ) : friendSearchEmail ? (
                <Empty description="No users found" />
              ) : null}
            </div>
          ),
        },
        {
          key: 'requests',
          label: <Badge count={friendRequests.received?.length || 0} size="small" offset={[8, 0]}>Requests</Badge>,
          children: (
            <div>
              {friendRequests.received?.length > 0 && (
                <>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Received</Text>
                  <List
                    dataSource={friendRequests.received}
                    renderItem={(r) => (
                      <List.Item
                        actions={[
                          <Button key="a" size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleAcceptFriend(r.id)}>Accept</Button>,
                          <Button key="r" size="small" danger icon={<CloseOutlined />} onClick={() => handleRejectFriend(r.id)}>Reject</Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar style={{ backgroundColor: '#059669' }}>{r.sender_username?.charAt(0)?.toUpperCase()}</Avatar>}
                          title={r.sender_username}
                          description={r.sender_email}
                        />
                      </List.Item>
                    )}
                  />
                </>
              )}
              {friendRequests.sent?.length > 0 && (
                <>
                  <Text strong style={{ display: 'block', marginTop: 16, marginBottom: 8 }}>Sent</Text>
                  <List
                    dataSource={friendRequests.sent}
                    renderItem={(r) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar>{r.receiver_username?.charAt(0)?.toUpperCase()}</Avatar>}
                          title={r.receiver_username}
                          description={<Tag color={r.status === 'pending' ? 'gold' : r.status === 'accepted' ? 'green' : 'red'}>{r.status}</Tag>}
                        />
                      </List.Item>
                    )}
                  />
                </>
              )}
              {(!friendRequests.received?.length && !friendRequests.sent?.length) && (
                <Empty description="No friend requests" />
              )}
            </div>
          ),
        },
      ]} />
    </Modal>
  );
}
