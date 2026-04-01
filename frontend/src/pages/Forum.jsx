import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  AutoComplete,
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Popconfirm,
  Radio,
  Select,
  Segmented,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
  HistoryOutlined,
  MessageOutlined,
  PaperClipOutlined,
  PlusOutlined,
  PushpinOutlined,
  SearchOutlined,
  ShareAltOutlined,
  TeamOutlined,
  UploadOutlined,
  UserAddOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

import { forumAPI, friendsAPI } from '../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const VIDEO_EXTS = /\.(mp4|webm|mov|ogg)(\?|$)/i;
const TAG_CONFIG = {
  skills: { label: 'Skills', color: 'blue', desc: 'Turnitin, Teams, plagiarism tips & more' },
  experience: { label: 'Experience', color: 'green', desc: 'Share your academic journey' },
  academic_culture: { label: 'Academic Culture', color: 'purple', desc: 'Cultural insights & norms' },
  public: { label: 'Public', color: 'orange', desc: 'Open discussion' },
  friend: { label: 'Friend', color: 'cyan', desc: 'Friend zone posts' },
};
const getTagConfig = (tag) => TAG_CONFIG[tag] || { label: tag, color: 'default' };
const STATUS_CONFIG = {
  approved: { label: 'Approved', color: 'green' },
  pending: { label: 'Pending Review', color: 'gold' },
  rejected: { label: 'Rejected', color: 'red' },
};
// Tags available for user selection (public/friend are auto-set by zone, not user-selectable)
const USER_SELECTABLE_TAGS = ['skills', 'experience', 'academic_culture'];
const POSTS_PAGE_SIZE = 10;
const REVIEW_PAGE_SIZE = 8;
const MY_POSTS_PAGE_SIZE = 10;

function VideoLoadingOverlay({ inline }) {
  return (
    <div
      style={{
        ...(inline
          ? { width: '100%', height: 220 }
          : { position: 'absolute', inset: 0, zIndex: 1 }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff',
      }}
    >
      <Spin size="large" />
      <Text style={{ color: 'rgba(255,255,255,0.72)', marginTop: 12 }}>Loading video...</Text>
    </div>
  );
}

function VideoPlayer({ url }) {
  const [loading, setLoading] = useState(true);

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (ytMatch) {
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        {loading && <VideoLoadingOverlay />}
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="Video"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={() => setLoading(false)}
        />
      </div>
    );
  }

  const biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
  if (biliMatch) {
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        {loading && <VideoLoadingOverlay />}
        <iframe
          src={`https://player.bilibili.com/player.html?bvid=${biliMatch[1]}&high_quality=1`}
          title="Video"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          scrolling="no"
          loading="lazy"
          onLoad={() => setLoading(false)}
        />
      </div>
    );
  }

  if (VIDEO_EXTS.test(url) || url.startsWith('/api/forum/uploads/')) {
    return (
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        {loading && <VideoLoadingOverlay inline />}
        <video
          controls
          preload="metadata"
          style={{ width: '100%', maxHeight: 420, display: loading ? 'none' : 'block' }}
          src={url}
          onLoadedData={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <VideoCameraOutlined /> Watch video
    </a>
  );
}

function StatusTag({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return <Tag color={config.color}>{config.label}</Tag>;
}

function AdminQueueCard({ post, onOpen, onReview }) {
  return (
    <Card
      key={post.id}
      hoverable
      style={{ marginBottom: 12, borderRadius: 10, borderColor: '#fde68a' }}
      styles={{ body: { padding: '16px 20px' } }}
      onClick={() => onOpen(post.id)}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space size={8} wrap>
          <Avatar size={28} style={{ backgroundColor: '#b45309' }}>
            {post.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Text strong>{post.username}</Text>
          <StatusTag status={post.status} />
          <Tag color={getTagConfig(post.tag).color}>{getTagConfig(post.tag).label}</Tag>
        </Space>
        <div>
          <Title level={5} style={{ margin: 0 }}>{post.title}</Title>
          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '8px 0 0', color: '#6b7280' }}>
            {post.content}
          </Paragraph>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <Text type="secondary">{new Date(post.created_at).toLocaleString()}</Text>
          <Space onClick={(e) => e.stopPropagation()}>
            <Button size="small" onClick={() => onOpen(post.id)}>Preview</Button>
            <Button size="small" type="primary" onClick={() => onReview(post, 'approve')}>Approve</Button>
            <Button size="small" danger onClick={() => onReview(post, 'reject')}>Reject</Button>
          </Space>
        </div>
      </Space>
    </Card>
  );
}

export default function Forum({ user }) {
  const isAdmin = Boolean(user?.is_admin);
  const { message } = AntdApp.useApp();

  const [activeZone, setActiveZone] = useState('public');
  const [activeTab, setActiveTab] = useState('all');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Friend management
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [] });
  const [friendSearchEmail, setFriendSearchEmail] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();
  const [fileList, setFileList] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPost, setDetailPost] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardPostId, setForwardPostId] = useState(null);
  const [forwardComment, setForwardComment] = useState('');
  const [forwarding, setForwarding] = useState(false);

  const [myPostsOpen, setMyPostsOpen] = useState(false);
  const [myItems, setMyItems] = useState([]);
  const [myTotal, setMyTotal] = useState(0);
  const [myPage, setMyPage] = useState(1);
  const [myLoading, setMyLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm] = Form.useForm();

  const [reviewItems, setReviewItems] = useState([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewingPost, setReviewingPost] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [rejectReasons, setRejectReasons] = useState([]);
  const [reviewForm] = Form.useForm();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: POSTS_PAGE_SIZE, zone: activeZone, include_forwards: 'true' };
      if (activeTab !== 'all') params.tag = activeTab;
      const res = await forumAPI.getPosts(params);
      setPosts(res.data.posts);
      setTotal(res.data.total);
    } catch {
      message.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeZone, message, page]);

  const fetchPendingPosts = useCallback(async (targetPage) => {
    if (!isAdmin) return;
    setReviewLoading(true);
    try {
      const res = await forumAPI.getPendingPosts({ page: targetPage, per_page: REVIEW_PAGE_SIZE });
      setReviewItems(res.data.posts);
      setReviewTotal(res.data.total);
    } catch {
      message.error('Failed to load review queue');
    } finally {
      setReviewLoading(false);
    }
  }, [isAdmin, message]);

  const fetchMyPosts = useCallback(async (targetPage = myPage) => {
    setMyLoading(true);
    try {
      const res = await forumAPI.getMyPosts({ page: targetPage, per_page: MY_POSTS_PAGE_SIZE });
      setMyItems(res.data.items);
      setMyTotal(res.data.total);
    } catch {
      message.error('Failed to load your posts');
    } finally {
      setMyLoading(false);
    }
  }, [message, myPage]);

  const fetchRejectReasons = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await forumAPI.getRejectionReasons();
      setRejectReasons(res.data.reasons || []);
    } catch {
      message.error('Failed to load rejection reasons');
    }
  }, [isAdmin, message]);

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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingPosts(reviewPage);
      fetchRejectReasons();
    } else {
      fetchFriends();
    }
  }, [fetchPendingPosts, fetchRejectReasons, fetchFriends, isAdmin, reviewPage]);

  const refreshDetail = useCallback(async (postId) => {
    try {
      const res = await forumAPI.getPost(postId);
      setDetailPost(res.data);
    } catch {
      setDetailOpen(false);
      setDetailPost(null);
    }
  }, []);

  const openDetail = async (postId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await forumAPI.getPost(postId);
      setDetailPost(res.data);
    } catch {
      message.error('Failed to load post');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      const zone = values.zone || 'public';
      // Auto-set tag: if user didn't specify, use zone name as tag
      const tag = values.tag?.trim() || zone;
      const formData = new FormData();
      formData.append('zone', zone);
      formData.append('tag', tag);
      formData.append('title', values.title);
      formData.append('content', values.content);
      if (values.video_url) formData.append('video_url', values.video_url);
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('file', fileList[0].originFileObj);
      }
      const res = await forumAPI.createPost(formData);
      message.success(res.data.message || 'Post submitted');
      setCreateOpen(false);
      createForm.resetFields();
      setFileList([]);
      setPage(1);
      fetchPosts();
      fetchMyPosts(1);
      if (isAdmin) fetchPendingPosts(1);
    } catch (err) {
      if (err?.response) {
        message.error(err.response.data?.error || 'Create failed');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !detailPost) return;
    setCommenting(true);
    try {
      await forumAPI.addComment(detailPost.id, commentText.trim());
      setCommentText('');
      await refreshDetail(detailPost.id);
      fetchPosts();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await forumAPI.deleteComment(commentId);
      message.success('Comment deleted');
      if (detailPost) await refreshDetail(detailPost.id);
      fetchPosts();
    } catch {
      message.error('Failed to delete comment');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await forumAPI.deletePost(postId);
      message.success('Post deleted');
      if (detailPost?.id === postId) {
        setDetailOpen(false);
        setDetailPost(null);
      }
      fetchPosts();
      fetchMyPosts(1);
      if (isAdmin) fetchPendingPosts(1);
    } catch {
      message.error('Failed to delete post');
    }
  };

  const handleForward = async () => {
    if (!forwardPostId) return;
    setForwarding(true);
    try {
      await forumAPI.forwardPost(forwardPostId, forwardComment.trim() || undefined);
      message.success('Post forwarded');
      setForwardOpen(false);
      setForwardPostId(null);
      setForwardComment('');
      fetchPosts();
      fetchMyPosts(1);
    } catch (err) {
      message.error(err.response?.data?.error || 'Forward failed');
    } finally {
      setForwarding(false);
    }
  };

  const openEdit = (post) => {
    setEditingPost(post);
    editForm.setFieldsValue({
      tag: post.tag,
      title: post.title,
      content: post.content,
      video_url: post.video_url || '',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingPost) return;
    try {
      const values = await editForm.validateFields();
      setEditSaving(true);
      const res = await forumAPI.updatePost(editingPost.id, values);
      message.success(res.data.message || 'Post updated');
      setEditOpen(false);
      setEditingPost(null);
      fetchPosts();
      fetchMyPosts(myPage);
      if (detailPost?.id === editingPost.id) await refreshDetail(editingPost.id);
    } catch (err) {
      if (err?.response) {
        message.error(err.response.data?.error || 'Update failed');
      }
    } finally {
      setEditSaving(false);
    }
  };

  const openReviewModal = (post, action) => {
    setReviewingPost(post);
    setReviewAction(action);
    reviewForm.setFieldsValue({
      rejection_reason: rejectReasons[0],
      review_note: '',
    });
    setReviewOpen(true);
  };

  const handleReview = async () => {
    if (!reviewingPost) return;
    try {
      setReviewSaving(true);
      const payload = { action: reviewAction };
      if (reviewAction === 'reject') {
        const values = await reviewForm.validateFields();
        payload.rejection_reason = values.rejection_reason;
        payload.review_note = values.review_note?.trim() || undefined;
      }
      await forumAPI.reviewPost(reviewingPost.id, payload);
      message.success(reviewAction === 'approve' ? 'Post approved' : 'Post rejected');
      setReviewOpen(false);
      setReviewingPost(null);
      fetchPendingPosts(reviewPage);
      fetchPosts();
      fetchMyPosts(myPage);
      if (detailPost?.id === reviewingPost.id) await refreshDetail(reviewingPost.id);
    } catch (err) {
      if (err?.response) {
        message.error(err.response.data?.error || 'Review failed');
      }
    } finally {
      setReviewSaving(false);
    }
  };

  const handlePin = async (post) => {
    try {
      await forumAPI.pinPost(post.id, !post.is_pinned);
      message.success(post.is_pinned ? 'Post unpinned' : 'Post pinned');
      fetchPosts();
      fetchMyPosts(myPage);
      if (detailPost?.id === post.id) await refreshDetail(post.id);
    } catch (err) {
      message.error(err.response?.data?.error || 'Pin update failed');
    }
  };

  const tabItems = [
    { key: 'all', label: 'All Posts' },
    ...USER_SELECTABLE_TAGS.map((tag) => ({
      key: tag,
      label: <Tag color={getTagConfig(tag).color}>{getTagConfig(tag).label}</Tag>,
    })),
  ];

  const renderAttachment = (post) => {
    if (!post.file_url) return null;
    if (VIDEO_EXTS.test(post.file_name || post.file_url)) {
      return (
        <div style={{ marginTop: 12 }}>
          <VideoPlayer url={post.file_url} />
        </div>
      );
    }
    return (
      <div style={{ marginTop: 12 }}>
        <a href={post.file_url} target="_blank" rel="noopener noreferrer">
          <PaperClipOutlined /> {post.file_name || 'Download attachment'}
        </a>
      </div>
    );
  };

  const renderPostCard = (item) => {
    if (item.type === 'forward') {
      const origPost = item.original_post;
      return (
        <Card
          key={`fw-${item.id}`}
          hoverable
          style={{ marginBottom: 12, borderRadius: 10, borderLeft: '3px solid #06b6d4' }}
          styles={{ body: { padding: '16px 20px' } }}
          onClick={() => origPost && openDetail(origPost.id)}
        >
          <Space size={8} style={{ marginBottom: 8 }}>
            <ShareAltOutlined style={{ color: '#06b6d4' }} />
            <Text type="secondary">
              <Text strong>{item.username}</Text> forwarded this post
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </Space>
          {item.comment && (
            <Paragraph style={{ margin: '0 0 8px', fontStyle: 'italic', color: '#6b7280' }}>
              "{item.comment}"
            </Paragraph>
          )}
          {origPost && (
            <Card size="small" style={{ background: '#f9fafb', borderRadius: 8 }}>
              <Space size={8} wrap style={{ marginBottom: 4 }}>
                <Avatar size={24} style={{ backgroundColor: '#2563eb' }}>
                  {origPost.username?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Text strong style={{ fontSize: 13 }}>{origPost.username}</Text>
                <Tag color={getTagConfig(origPost.tag).color}>{getTagConfig(origPost.tag).label}</Tag>
              </Space>
              <Title level={5} style={{ margin: '4px 0' }}>{origPost.title}</Title>
              <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, color: '#6b7280' }}>
                {origPost.content}
              </Paragraph>
            </Card>
          )}
        </Card>
      );
    }

    const post = item;
    return (
      <Card
        key={post.id}
        hoverable
        style={{ marginBottom: 12, borderRadius: 10 }}
        styles={{ body: { padding: '16px 20px' } }}
        onClick={() => openDetail(post.id)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Space size={8} wrap style={{ marginBottom: 6 }}>
              <Avatar size={28} style={{ backgroundColor: '#2563eb' }}>
                {post.username?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Text strong>{post.username}</Text>
              {post.is_pinned && <Tag color="volcano"><PushpinOutlined /> Pinned</Tag>}
              <Tag color={getTagConfig(post.tag).color}>{getTagConfig(post.tag).label}</Tag>
              <StatusTag status={post.status} />
            </Space>
            <Title level={5} style={{ margin: '4px 0' }}>{post.title}</Title>
            <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, color: '#6b7280' }}>
              {post.content}
            </Paragraph>
            <Space size={16} style={{ marginTop: 8, color: '#9ca3af' }}>
              {post.file_url && <span><FileOutlined /> File</span>}
              {post.video_url && <span><VideoCameraOutlined /> Video</span>}
              <span><MessageOutlined /> {post.comment_count}</span>
              <span><ShareAltOutlined /> {post.forward_count}</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </Space>
          </div>
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            {post.can_forward && (
              <Tooltip title="Forward">
                <Button
                  type="text"
                  size="small"
                  icon={<ShareAltOutlined />}
                  onClick={() => {
                    setForwardPostId(post.id);
                    setForwardComment('');
                    setForwardOpen(true);
                  }}
                />
              </Tooltip>
            )}
            {post.can_edit && (
              <Tooltip title="Edit">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(post)} />
              </Tooltip>
            )}
            {post.can_pin && (
              <Tooltip title={post.is_pinned ? 'Unpin' : 'Pin'}>
                <Button
                  type="text"
                  size="small"
                  icon={<PushpinOutlined />}
                  onClick={() => handlePin(post)}
                />
              </Tooltip>
            )}
            {post.can_delete && (
              <Popconfirm title="Delete this post?" onConfirm={() => handleDeletePost(post.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Forum</Title>
          <Text type="secondary">
            Share knowledge, discuss academic life, and help each other
          </Text>
        </div>
        <Space wrap>
          {!isAdmin && (
            <Badge count={friendRequests.received?.length || 0} size="small">
              <Button icon={<TeamOutlined />} onClick={() => { setFriendsOpen(true); fetchFriends(); }}>
                Friends
              </Button>
            </Badge>
          )}
          <Button icon={<HistoryOutlined />} onClick={() => { setMyPostsOpen(true); setMyPage(1); fetchMyPosts(1); }}>
            My Posts
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            New Post
          </Button>
        </Space>
      </div>

      {isAdmin && (
        <Card
          title="Admin Review Queue"
          extra={<Text type="secondary">{reviewTotal} pending</Text>}
          style={{ marginBottom: 20, borderRadius: 12, borderColor: '#fcd34d' }}
        >
          {reviewLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
          ) : reviewItems.length === 0 ? (
            <Empty description="No posts waiting for review" />
          ) : (
            <>
              {reviewItems.map((post) => (
                <AdminQueueCard
                  key={post.id}
                  post={post}
                  onOpen={openDetail}
                  onReview={openReviewModal}
                />
              ))}
              {reviewTotal > REVIEW_PAGE_SIZE && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Pagination
                    current={reviewPage}
                    total={reviewTotal}
                    pageSize={REVIEW_PAGE_SIZE}
                    onChange={(nextPage) => setReviewPage(nextPage)}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {!isAdmin && (
        <Segmented
          value={activeZone}
          onChange={(val) => { setActiveZone(val); setActiveTab('all'); setPage(1); }}
          options={[
            { label: 'Public Zone', value: 'public' },
            { label: 'Friend Zone', value: 'friend' },
          ]}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setPage(1);
        }}
        items={tabItems}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : posts.length === 0 ? (
        <Empty description={isAdmin ? 'No approved posts yet.' : 'No posts yet.'} />
      ) : (
        <>
          {posts.map(renderPostCard)}
          {total > POSTS_PAGE_SIZE && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Pagination current={page} total={total} pageSize={POSTS_PAGE_SIZE} onChange={setPage} showSizeChanger={false} />
            </div>
          )}
        </>
      )}

      <Modal
        title="Create New Post"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
          setFileList([]);
        }}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="Post"
        width={620}
      >
        <Form form={createForm} layout="vertical" initialValues={{ zone: 'public' }}>
          {!isAdmin && (
            <Form.Item name="zone" label="Zone">
              <Radio.Group>
                <Radio.Button value="public">Public Zone</Radio.Button>
                <Radio.Button value="friend">Friend Zone</Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}
          <Form.Item name="tag" label="Tag (optional, auto-set if empty)">
            <AutoComplete
              placeholder="Select or type a custom tag (optional)"
              options={USER_SELECTABLE_TAGS.map(t => ({ value: t, label: getTagConfig(t).label }))}
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              allowClear
            />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
            <Input maxLength={200} placeholder="Post title" />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true, message: 'Please enter content' }]}>
            <TextArea rows={5} maxLength={5000} showCount placeholder="Write your post content..." />
          </Form.Item>
          <Form.Item name="video_url" label="Video URL (optional)">
            <Input placeholder="https://youtube.com/..." />
          </Form.Item>
          <Form.Item label="Attachment (optional)">
            <Upload
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList: next }) => setFileList(next.slice(-1))}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingPost?.status === 'rejected' && !isAdmin ? 'Edit And Resubmit Post' : 'Edit Post'}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditingPost(null);
          editForm.resetFields();
        }}
        onOk={handleEdit}
        confirmLoading={editSaving}
        okText={editingPost?.status === 'rejected' && !isAdmin ? 'Resubmit' : 'Save'}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="tag" label="Tag">
            <AutoComplete
              placeholder="Select or type a custom tag"
              options={USER_SELECTABLE_TAGS.map(t => ({ value: t, label: getTagConfig(t).label }))}
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              allowClear
            />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true, message: 'Please enter content' }]}>
            <TextArea rows={5} maxLength={5000} />
          </Form.Item>
          <Form.Item name="video_url" label="Video URL (optional)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={reviewAction === 'approve' ? 'Approve Post' : 'Reject Post'}
        open={reviewOpen}
        onCancel={() => {
          setReviewOpen(false);
          setReviewingPost(null);
          reviewForm.resetFields();
        }}
        onOk={handleReview}
        confirmLoading={reviewSaving}
        okText={reviewAction === 'approve' ? 'Approve' : 'Reject'}
        okButtonProps={{ danger: reviewAction === 'reject' }}
      >
        {reviewingPost && (
          <div style={{ marginBottom: 12 }}>
            <Text strong>{reviewingPost.title}</Text>
            <Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ marginTop: 8 }}>
              {reviewingPost.content}
            </Paragraph>
          </div>
        )}
        {reviewAction === 'reject' && (
          <Form form={reviewForm} layout="vertical">
            <Form.Item
              name="rejection_reason"
              label="Reason"
              rules={[{ required: true, message: 'Please choose a rejection reason' }]}
            >
              <Select placeholder="Choose a reason">
                {rejectReasons.map((reason) => (
                  <Select.Option key={reason} value={reason}>
                    {reason}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="review_note" label="Additional note (optional)">
              <TextArea rows={3} maxLength={255} placeholder="Add a short suggestion for the user..." />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title={null}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailPost(null);
          setCommentText('');
        }}
        footer={null}
        width={760}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : detailPost && (
          <div>
            <Space size={8} wrap style={{ marginBottom: 8 }}>
              <Avatar size={32} style={{ backgroundColor: '#2563eb' }}>
                {detailPost.username?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <div>
                <Text strong>{detailPost.username}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(detailPost.created_at).toLocaleString()}
                </Text>
              </div>
              <Tag color={getTagConfig(detailPost.tag).color}>{getTagConfig(detailPost.tag).label}</Tag>
              <StatusTag status={detailPost.status} />
              {detailPost.is_pinned && <Tag color="volcano"><PushpinOutlined /> Pinned</Tag>}
            </Space>

            {detailPost.status === 'rejected' && (
              <Alert
                type="error"
                showIcon
                style={{ margin: '12px 0' }}
                message={detailPost.rejection_reason || 'Rejected'}
                description={detailPost.review_note || 'Please update the post and submit it again for review.'}
              />
            )}

            {detailPost.status === 'pending' && detailPost.user_id === user?.id && !isAdmin && (
              <Alert
                type="warning"
                showIcon
                style={{ margin: '12px 0' }}
                message="This post is waiting for admin review."
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <Title level={4} style={{ margin: '12px 0 8px' }}>{detailPost.title}</Title>
              <Space wrap>
                {detailPost.can_edit && (
                  <Button icon={<EditOutlined />} onClick={() => openEdit(detailPost)}>
                    {detailPost.status === 'rejected' && !isAdmin ? 'Edit & Resubmit' : 'Edit'}
                  </Button>
                )}
                {detailPost.can_pin && (
                  <Button icon={<PushpinOutlined />} onClick={() => handlePin(detailPost)}>
                    {detailPost.is_pinned ? 'Unpin' : 'Pin'}
                  </Button>
                )}
                {detailPost.can_delete && (
                  <Popconfirm title="Delete this post?" onConfirm={() => handleDeletePost(detailPost.id)}>
                    <Button danger icon={<DeleteOutlined />}>Delete</Button>
                  </Popconfirm>
                )}
              </Space>
            </div>

            <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>
              {detailPost.content}
            </Paragraph>

            {renderAttachment(detailPost)}
            {detailPost.video_url && (
              <div style={{ marginTop: 12 }}>
                <VideoPlayer url={detailPost.video_url} />
              </div>
            )}

            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 20, paddingTop: 16 }}>
              <Text strong style={{ fontSize: 14 }}>
                Comments ({detailPost.comments?.length || 0})
              </Text>
              <List
                style={{ marginTop: 8 }}
                dataSource={detailPost.comments || []}
                locale={{ emptyText: 'No comments yet' }}
                renderItem={(comment) => (
                  <List.Item
                    actions={
                      (comment.user_id === user?.id || isAdmin)
                        ? [
                            <Button
                              key="delete"
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteComment(comment.id)}
                            />,
                          ]
                        : []
                    }
                  >
                    <List.Item.Meta
                      avatar={<Avatar size={24} icon={<UserOutlined />} style={{ backgroundColor: '#7c3aed' }} />}
                      title={
                        <Space size={8}>
                          <Text strong>{comment.username}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(comment.created_at).toLocaleString()}
                          </Text>
                        </Space>
                      }
                      description={<Text>{comment.content}</Text>}
                    />
                  </List.Item>
                )}
              />

              {detailPost.status === 'approved' ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <TextArea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    maxLength={1000}
                  />
                  <Button type="primary" onClick={handleComment} loading={commenting} disabled={!commentText.trim()} style={{ alignSelf: 'flex-end' }}>
                    Send
                  </Button>
                </div>
              ) : (
                <Alert type="info" showIcon style={{ marginTop: 12 }} message="Comments are enabled after the post is approved." />
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Forward Post"
        open={forwardOpen}
        onCancel={() => setForwardOpen(false)}
        onOk={handleForward}
        confirmLoading={forwarding}
        okText="Forward"
      >
        <TextArea
          rows={3}
          value={forwardComment}
          onChange={(e) => setForwardComment(e.target.value)}
          placeholder="Add a comment to your forward (optional)..."
          maxLength={500}
        />
      </Modal>

      {/* Friends Management Modal */}
      <Modal
        title="Manage Friends"
        open={friendsOpen}
        onCancel={() => { setFriendsOpen(false); setFriendSearchEmail(''); setFriendSearchResults([]); }}
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

      <Modal
        title="My Posts & Forwards"
        open={myPostsOpen}
        onCancel={() => setMyPostsOpen(false)}
        footer={null}
        width={700}
      >
        {myLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : myItems.length === 0 ? (
          <Empty description="You haven't posted anything yet" />
        ) : (
          <>
            <List
              dataSource={myItems}
              renderItem={(item) => (
                <List.Item
                  style={{ padding: '10px 0', cursor: 'pointer' }}
                  onClick={() => {
                    const postId = item.type === 'forward' ? item.original_post_id : item.id;
                    setMyPostsOpen(false);
                    openDetail(postId);
                  }}
                >
                  {item.type === 'forward' ? (
                    <div style={{ width: '100%' }}>
                      <Tag color="cyan">Forwarded</Tag>
                      {item.comment && <Paragraph style={{ margin: '8px 0 6px' }}>{item.comment}</Paragraph>}
                      <Card size="small" style={{ background: '#fafafa', borderRadius: 8 }}>
                        <Text strong>{item.original_post?.title}</Text>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '4px 0 0', color: '#6b7280' }}>
                          {item.original_post?.content}
                        </Paragraph>
                      </Card>
                    </div>
                  ) : (
                    <div style={{ width: '100%' }}>
                      <Space size={6} wrap>
                        <Tag color={getTagConfig(item.tag).color}>{getTagConfig(item.tag).label}</Tag>
                        <StatusTag status={item.status} />
                        {item.is_pinned && <Tag color="volcano"><PushpinOutlined /> Pinned</Tag>}
                        <Text strong>{item.title}</Text>
                      </Space>
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '6px 0 0', color: '#6b7280' }}>
                        {item.content}
                      </Paragraph>
                      {item.status === 'rejected' && (
                        <Text type="danger">
                          Rejected: {item.rejection_reason}
                          {item.review_note ? ` · ${item.review_note}` : ''}
                        </Text>
                      )}
                    </div>
                  )}
                </List.Item>
              )}
            />
            {myTotal > MY_POSTS_PAGE_SIZE && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Pagination
                  current={myPage}
                  total={myTotal}
                  pageSize={MY_POSTS_PAGE_SIZE}
                  onChange={(nextPage) => {
                    setMyPage(nextPage);
                    fetchMyPosts(nextPage);
                  }}
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
