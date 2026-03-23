import { useState, useEffect, useCallback } from 'react';
import {
  Typography, Card, Tabs, Button, Tag, Input, Modal, Form, Select,
  List, Avatar, Space, Tooltip, Empty, Spin, Upload, Pagination, App as AntdApp,
} from 'antd';
import {
  PlusOutlined, CommentOutlined, ShareAltOutlined, DeleteOutlined,
  FileOutlined, VideoCameraOutlined, HistoryOutlined, UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { forumAPI } from '../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const VIDEO_EXTS = /\.(mp4|webm|mov|ogg)(\?|$)/i;

function VideoPlayer({ url }) {
  const [loading, setLoading] = useState(true);

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (ytMatch) {
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        {loading && <VideoLoadingOverlay />}
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="Video"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={() => setLoading(false)}
        />
      </div>
    );
  }

  // Bilibili
  const biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
  if (biliMatch) {
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        {loading && <VideoLoadingOverlay />}
        <iframe
          src={`https://player.bilibili.com/player.html?bvid=${biliMatch[1]}&high_quality=1`}
          title="Video"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          scrolling="no"
          loading="lazy"
          onLoad={() => setLoading(false)}
        />
      </div>
    );
  }

  // Direct video file (remote URL or local upload)
  if (VIDEO_EXTS.test(url) || url.startsWith('/api/forum/uploads/')) {
    return (
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        {loading && <VideoLoadingOverlay inline />}
        <video
          controls
          preload="metadata"
          style={{ width: '100%', borderRadius: 8, maxHeight: 400, display: loading ? 'none' : 'block' }}
          src={url}
          onLoadedData={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </div>
    );
  }

  // Fallback
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <VideoCameraOutlined /> Watch video
    </a>
  );
}

function VideoLoadingOverlay({ inline }) {
  return (
    <div style={{
      ...(inline
        ? { width: '100%', height: 220 }
        : { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#000', color: '#fff',
    }}>
      <Spin size="large" />
      <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 13 }}>
        Loading video...
      </Text>
    </div>
  );
}

const TAG_CONFIG = {
  skills: { label: 'Skills', color: 'blue', desc: 'Turnitin, Teams, plagiarism tips & more' },
  experience: { label: 'Experience', color: 'green', desc: 'Share your academic journey' },
  academic_culture: { label: 'Academic Culture', color: 'purple', desc: 'Cultural insights & norms' },
  public: { label: 'Public', color: 'orange', desc: 'Open discussion' },
};

const TAGS = Object.keys(TAG_CONFIG);

export default function Forum({ user }) {
  const { message: antMsg } = AntdApp.useApp();

  // State
  const [activeTab, setActiveTab] = useState('all');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
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

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 10 };
      if (activeTab !== 'all') params.tag = activeTab;
      const res = await forumAPI.getPosts(params);
      setPosts(res.data.posts);
      setTotal(res.data.total);
    } catch {
      antMsg.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, antMsg]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Tab change resets page
  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  // Create post
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      const fd = new FormData();
      fd.append('tag', values.tag);
      fd.append('title', values.title);
      fd.append('content', values.content);
      if (values.video_url) fd.append('video_url', values.video_url);
      if (fileList.length > 0 && fileList[0].originFileObj) {
        fd.append('file', fileList[0].originFileObj);
      }
      await forumAPI.createPost(fd);
      antMsg.success('Post created!');
      setCreateOpen(false);
      form.resetFields();
      setFileList([]);
      setPage(1);
      fetchPosts();
    } catch (err) {
      if (err.response) antMsg.error(err.response.data?.error || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  // View post detail
  const openDetail = async (postId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await forumAPI.getPost(postId);
      setDetailPost(res.data);
    } catch {
      antMsg.error('Failed to load post');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Add comment
  const handleComment = async () => {
    if (!commentText.trim() || !detailPost) return;
    setCommenting(true);
    try {
      await forumAPI.addComment(detailPost.id, commentText.trim());
      setCommentText('');
      const res = await forumAPI.getPost(detailPost.id);
      setDetailPost(res.data);
      fetchPosts();
    } catch {
      antMsg.error('Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      await forumAPI.deleteComment(commentId);
      const res = await forumAPI.getPost(detailPost.id);
      setDetailPost(res.data);
      fetchPosts();
    } catch {
      antMsg.error('Failed to delete comment');
    }
  };

  // Forward post
  const openForward = (postId) => {
    setForwardPostId(postId);
    setForwardComment('');
    setForwardOpen(true);
  };

  const handleForward = async () => {
    setForwarding(true);
    try {
      await forumAPI.forwardPost(forwardPostId, forwardComment.trim() || undefined);
      antMsg.success('Post forwarded!');
      setForwardOpen(false);
      fetchPosts();
    } catch (err) {
      antMsg.error(err.response?.data?.error || 'Forward failed');
    } finally {
      setForwarding(false);
    }
  };

  // Delete post
  const handleDelete = async (postId) => {
    try {
      await forumAPI.deletePost(postId);
      antMsg.success('Post deleted');
      fetchPosts();
    } catch {
      antMsg.error('Failed to delete post');
    }
  };

  // My posts
  const openMyPosts = async () => {
    setMyPostsOpen(true);
    setMyPage(1);
    await fetchMyPosts(1);
  };

  const fetchMyPosts = async (pg) => {
    setMyLoading(true);
    try {
      const res = await forumAPI.getMyPosts({ page: pg, per_page: 10 });
      setMyItems(res.data.items);
      setMyTotal(res.data.total);
    } catch {
      antMsg.error('Failed to load your posts');
    } finally {
      setMyLoading(false);
    }
  };

  // Tab items
  const tabItems = [
    { key: 'all', label: 'All Posts' },
    ...TAGS.map((t) => ({
      key: t,
      label: (
        <Space size={4}>
          <Tag color={TAG_CONFIG[t].color} style={{ margin: 0 }}>{TAG_CONFIG[t].label}</Tag>
        </Space>
      ),
    })),
  ];

  // Post card renderer
  const renderPost = (post) => (
    <Card
      key={post.id}
      style={{ marginBottom: 12, borderRadius: 10 }}
      styles={{ body: { padding: '16px 20px' } }}
      hoverable
      onClick={() => openDetail(post.id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={8} style={{ marginBottom: 6 }}>
            <Avatar size={28} style={{ backgroundColor: '#2563eb' }}>
              {post.username?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Text strong style={{ fontSize: 13 }}>{post.username}</Text>
            <Tag color={TAG_CONFIG[post.tag]?.color}>{TAG_CONFIG[post.tag]?.label}</Tag>
          </Space>
          <Title level={5} style={{ margin: '4px 0 4px', fontSize: 15 }}>{post.title}</Title>
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ margin: 0, color: '#6b7280', fontSize: 13 }}
          >
            {post.content}
          </Paragraph>
          <Space size={16} style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
            {post.file_url && (
              <Tooltip title="Has attachment">
                <FileOutlined /> File
              </Tooltip>
            )}
            {post.video_url && (
              <Tooltip title="Has video">
                <VideoCameraOutlined /> Video
              </Tooltip>
            )}
            <span><CommentOutlined /> {post.comment_count}</span>
            <span><ShareAltOutlined /> {post.forward_count}</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </Space>
        </div>
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Forward">
            <Button
              type="text" size="small" icon={<ShareAltOutlined />}
              onClick={() => openForward(post.id)}
            />
          </Tooltip>
          {post.user_id === user?.id && (
            <Tooltip title="Delete">
              <Button
                type="text" size="small" danger icon={<DeleteOutlined />}
                onClick={() => handleDelete(post.id)}
              />
            </Tooltip>
          )}
        </Space>
      </div>
    </Card>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Forum</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Share knowledge, discuss academic life, and help each other
          </Text>
        </div>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={openMyPosts}>My Posts</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            New Post
          </Button>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} />

      {/* Post list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : posts.length === 0 ? (
        <Empty description="No posts yet. Be the first to share!" />
      ) : (
        <>
          {posts.map(renderPost)}
          {total > 10 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Pagination
                current={page} total={total} pageSize={10}
                onChange={(p) => setPage(p)} showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}

      {/* Create Post Modal */}
      <Modal
        title="Create New Post"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); setFileList([]); }}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="Post"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="tag" label="Tag" rules={[{ required: true, message: 'Please select a tag' }]}>
            <Select placeholder="Select a tag">
              {TAGS.map((t) => (
                <Select.Option key={t} value={t}>
                  <Tag color={TAG_CONFIG[t].color}>{TAG_CONFIG[t].label}</Tag>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                    {TAG_CONFIG[t].desc}
                  </Text>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
            <Input placeholder="Post title" maxLength={200} />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true, message: 'Please enter content' }]}>
            <TextArea rows={5} placeholder="Write your post content..." maxLength={5000} showCount />
          </Form.Item>
          <Form.Item name="video_url" label="Video URL (optional)">
            <Input placeholder="https://youtube.com/..." />
          </Form.Item>
          <Form.Item label="Attachment (optional)">
            <Upload
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Post Detail Modal */}
      <Modal
        title={null}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailPost(null); }}
        footer={null}
        width={700}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : detailPost && (
          <div>
            <Space size={8} style={{ marginBottom: 8 }}>
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
              <Tag color={TAG_CONFIG[detailPost.tag]?.color}>
                {TAG_CONFIG[detailPost.tag]?.label}
              </Tag>
            </Space>
            <Title level={4} style={{ margin: '12px 0 8px' }}>{detailPost.title}</Title>
            <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>
              {detailPost.content}
            </Paragraph>

            {detailPost.file_url && (
              VIDEO_EXTS.test(detailPost.file_name || detailPost.file_url)
                ? (
                  <div style={{ margin: '12px 0' }}>
                    <VideoPlayer url={detailPost.file_url} />
                  </div>
                )
                : (
                  <div style={{ margin: '8px 0' }}>
                    <a href={detailPost.file_url} target="_blank" rel="noopener noreferrer">
                      <FileOutlined /> {detailPost.file_name || 'Download attachment'}
                    </a>
                  </div>
                )
            )}
            {detailPost.video_url && (
              <div style={{ margin: '12px 0' }}>
                <VideoPlayer url={detailPost.video_url} />
              </div>
            )}

            {/* Comments section */}
            <div style={{
              borderTop: '1px solid #f0f0f0', marginTop: 16, paddingTop: 16,
            }}>
              <Text strong style={{ fontSize: 14 }}>
                Comments ({detailPost.comments?.length || 0})
              </Text>
              <List
                style={{ marginTop: 8 }}
                dataSource={detailPost.comments || []}
                locale={{ emptyText: 'No comments yet' }}
                renderItem={(c) => (
                  <List.Item
                    style={{ padding: '8px 0' }}
                    actions={
                      c.user_id === user?.id
                        ? [
                            <Button
                              key="del"
                              type="text" size="small" danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteComment(c.id)}
                            />,
                          ]
                        : []
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar size={24} icon={<UserOutlined />} style={{ backgroundColor: '#7c3aed' }}>
                          {c.username?.charAt(0)?.toUpperCase()}
                        </Avatar>
                      }
                      title={
                        <Space size={8}>
                          <Text strong style={{ fontSize: 13 }}>{c.username}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(c.created_at).toLocaleString()}
                          </Text>
                        </Space>
                      }
                      description={<Text style={{ fontSize: 13 }}>{c.content}</Text>}
                    />
                  </List.Item>
                )}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <TextArea
                  rows={2} value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  maxLength={1000}
                />
                <Button
                  type="primary" onClick={handleComment}
                  loading={commenting} disabled={!commentText.trim()}
                  style={{ alignSelf: 'flex-end' }}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Forward Modal */}
      <Modal
        title="Forward Post"
        open={forwardOpen}
        onCancel={() => setForwardOpen(false)}
        onOk={handleForward}
        confirmLoading={forwarding}
        okText="Forward"
      >
        <TextArea
          rows={3} value={forwardComment}
          onChange={(e) => setForwardComment(e.target.value)}
          placeholder="Add a comment to your forward (optional)..."
          maxLength={500}
        />
      </Modal>

      {/* My Posts Modal */}
      <Modal
        title="My Posts & Forwards"
        open={myPostsOpen}
        onCancel={() => setMyPostsOpen(false)}
        footer={null}
        width={650}
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
                      {item.comment && (
                        <Text style={{ fontSize: 13 }}>{item.comment}</Text>
                      )}
                      <Card
                        size="small"
                        style={{ marginTop: 6, background: '#fafafa', borderRadius: 8 }}
                        styles={{ body: { padding: '10px 14px' } }}
                      >
                        <Text strong style={{ fontSize: 13 }}>
                          {item.original_post?.title}
                        </Text>
                        <br />
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 12 }}
                        >
                          {item.original_post?.content}
                        </Paragraph>
                      </Card>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(item.created_at).toLocaleString()}
                      </Text>
                    </div>
                  ) : (
                    <div style={{ width: '100%' }}>
                      <Space size={6}>
                        <Tag color={TAG_CONFIG[item.tag]?.color}>
                          {TAG_CONFIG[item.tag]?.label}
                        </Tag>
                        <Text strong style={{ fontSize: 14 }}>{item.title}</Text>
                      </Space>
                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}
                      >
                        {item.content}
                      </Paragraph>
                      <Space size={12} style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                        <span><CommentOutlined /> {item.comment_count}</span>
                        <span><ShareAltOutlined /> {item.forward_count}</span>
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </Space>
                    </div>
                  )}
                </List.Item>
              )}
            />
            {myTotal > 10 && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Pagination
                  current={myPage} total={myTotal} pageSize={10}
                  onChange={(p) => { setMyPage(p); fetchMyPosts(p); }}
                  showSizeChanger={false} size="small"
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
