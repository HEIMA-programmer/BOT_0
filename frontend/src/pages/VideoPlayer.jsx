import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Col,
  Row,
  Tag,
  Typography,
  Button,
  Space,
  Input,
  Alert,
  Modal,
  Form,
  message,
  Select,
  App as AntdApp,
  Switch,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ShareAltOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  VideoCameraOutlined,
  ClockCircleOutlined,
  SendOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';
import { forumAPI } from '../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const TAG_CONFIG = {
  note: { label: 'Note', color: 'cyan' },
  skills: { label: 'Skills', color: 'blue' },
  experience: { label: 'Experience', color: 'green' },
  academic_culture: { label: 'Academic Culture', color: 'purple' },
  public: { label: 'Public', color: 'orange' },
};
const TAGS = Object.keys(TAG_CONFIG);

const videoData = {
  'academic-english': {
    1: {
      title: 'New Learn English series: Academic English',
      duration: '00:30',
      category: 'Academic English: ABC Education',
      description: 'New Learn English series: Academic English',
      url: 'https://www.youtube.com/watch?v=nUNc3SrCBSg',
      thumbnail: 'https://i.ytimg.com/vi/nUNc3SrCBSg/maxresdefault.jpg',
    },
    2: {
      title: 'Academic English: Learning Academic Vocabulary',
      duration: '10:04',
      category: 'Academic English: ABC Education',
      description: 'Learn academic vocabulary with this video series.',
      url: 'https://youtu.be/bMEMqjrupHk?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/bMEMqjrupHk/maxresdefault.jpg',
    },
    3: {
      title: 'Academic English: Vocabulary For Describing Data',
      duration: '10:54',
      category: 'Academic English: ABC Education',
      description: 'Learn academic vocabulary for describing data and charts with this video series.',
      url: 'https://youtu.be/xl-nuzBnRLU?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/xl-nuzBnRLU/maxresdefault.jpg',
    },
    4: {
      title: 'Academic English: Linking Words',
      duration: '7:31',
      category: 'Academic English: ABC Education',
      description: 'Learn linking words with this video series.',
      url: 'https://youtu.be/qJ9kCO8-Vss?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/qJ9kCO8-Vss/maxresdefault.jpg',
    },
    5: {
      title: 'Academic English: Using Verbs To Express Opinions',
      duration: '6:41',
      category: 'Academic English: ABC Education',
      description: 'Learn using verbs to express opinions with this video series.',
      url: 'https://youtu.be/KU9sIgK3-Nc?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/KU9sIgK3-Nc/maxresdefault.jpg',
    },
    6: {
      title: 'Academic English: Making Comparisons',
      duration: '9:17',
      category: 'Academic English: ABC Education',
      description: 'Learn making comparisons with this video series.',
      url: 'https://youtu.be/8M7R2_U3OsI?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/8M7R2_U3OsI/maxresdefault.jpg',
    },
    7: {
      title: 'Academic English: Paragraphing for Essays',
      duration: '11:52',
      category: 'Academic English: ABC Education',
      description: 'Learn paragraphing for essays with this video series.',
      url: 'https://youtu.be/dUglbHyPDz0?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/dUglbHyPDz0/maxresdefault.jpg',
    },
    8: {
      title: 'Academic English: Passive Voice',
      duration: '9:55',
      category: 'Academic English: ABC Education',
      description: 'Learn passive voice with this video series.',
      url: 'https://youtu.be/oLo8I3Hn_1M?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/oLo8I3Hn_1M/maxresdefault.jpg',
    },
    9: {
      title: 'Academic English: Introduction and Conclusion in Essays',
      duration: '8:19',
      category: 'Academic English: ABC Education',
      description: 'Learn introduction and conclusion in essays with this video series.',
      url: 'https://youtu.be/hU_lfd4gxjA?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/hU_lfd4gxjA/maxresdefault.jpg',
    },
    10: {
      title: 'Academic English: Listening For Meaning',
      duration: '9:02',
      category: 'Academic English: ABC Education',
      description: 'Learn listening for meaning with this video series.',
      url: 'https://youtu.be/QUFthHGrRHo?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/QUFthHGrRHo/maxresdefault.jpg',
    },
    11: {
      title: 'Academic English: Listening For Note Taking',
      duration: '9:08',
      category: 'Academic English: ABC Education',
      description: 'Learn listening for note taking with this video series.',
      url: 'https://youtu.be/Bhx4mi649YQ?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/Bhx4mi649YQ/maxresdefault.jpg',
    },
    12: {
      title: 'Academic English: Reading Strategies For Academic Texts',
      duration: '7:22',
      category: 'Academic English: ABC Education',
      description: 'Learn reading strategies for academic texts with this video series.',
      url: 'https://youtu.be/myuu96ah0mk?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/myuu96ah0mk/maxresdefault.jpg',
    },
    13: {
      title: 'Academic English: Answering True Or False Questions',
      duration: '7:49',
      category: 'Academic English: ABC Education',
      description: 'Learn answering true or false questions with this video series.',
      url: 'https://youtu.be/RYt9fGawn5w?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6',
      thumbnail: 'https://i.ytimg.com/vi/RYt9fGawn5w/maxresdefault.jpg',
    },
  },
};

function YouTubePlayer({ url, iframeRef }) {
  const [loading, setLoading] = useState(true);
  
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (!ytMatch) return null;
  
  const videoId = ytMatch[1];
  
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 16, overflow: 'hidden', background: '#000' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
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
      )}
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
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

export function getVideoInfo(categoryId, videoId) {
  return videoData[categoryId]?.[videoId];
}

export default function VideoPlayer() {
  useLearningTimeTracker('listening', 'study_time:listening');
  const navigate = useNavigate();
  const { categoryId, videoId } = useParams();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const { message: messageApi } = AntdApp.useApp();

  const video = videoData[categoryId]?.[videoId];
  const fromForum = searchParams.get('fromForum') === 'true';
  const [showReferenceNotes, setShowReferenceNotes] = useState(fromForum);
  const [currentVideoTime, setCurrentVideoTime] = useState('00:00');
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  const [notes, setNotes] = useState([
    
  ]);
  const [currentNote, setCurrentNote] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newNoteId, setNewNoteId] = useState(3);
  const [sharing, setSharing] = useState(false);

  // 格式化时间为 MM:SS 格式
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 加载YouTube iframe API
  useEffect(() => {
    if (video?.url && video.url.includes('youtube.com')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        if (iframeRef.current) {
          playerRef.current = new window.YT.Player(iframeRef.current, {
            events: {
              'onReady': (event) => {
                // 开始每秒更新时间
                intervalRef.current = setInterval(() => {
                  if (playerRef.current) {
                    const currentTime = playerRef.current.getCurrentTime();
                    setCurrentVideoTime(formatTime(currentTime));
                  }
                }, 1000);
              },
              'onStateChange': (event) => {
                // 状态变化时也更新时间
                if (playerRef.current) {
                  const currentTime = playerRef.current.getCurrentTime();
                  setCurrentVideoTime(formatTime(currentTime));
                }
              }
            }
          });
        }
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [video?.url]);

  const handleAddNote = () => {
    if (!currentNote.trim()) return;
    const newNote = {
      id: newNoteId,
      time: currentVideoTime,
      text: currentNote,
      timestamp: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setCurrentNote('');
    setNewNoteId(newNoteId + 1);
    messageApi.success('Note added successfully!');
  };

  const handleDeleteNote = (noteId) => {
    setNotes(notes.filter(note => note.id !== noteId));
    messageApi.success('Note deleted!');
  };

  const handleShareToForum = async (values) => {
    setSharing(true);
    try {
      const formData = new FormData();
      formData.append('tag', values.tag);
      formData.append('title', values.title);
      formData.append('content', values.content);
      const res = await forumAPI.createPost(formData);
      messageApi.success(res.data.message || 'Your notes have been shared to the forum successfully!');
      setIsShareModalOpen(false);
      form.resetFields();
    } catch (err) {
      if (err?.response) {
        messageApi.error(err.response.data?.error || 'Failed to share to forum');
      } else {
        messageApi.error('Failed to share to forum');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleSaveNotes = () => {
    try {
      localStorage.setItem(`video-notes-${categoryId}-${videoId}`, JSON.stringify(notes));
      messageApi.success('All notes saved locally!');
    } catch {
      messageApi.error('Failed to save notes');
    }
  };

  const openShareModal = () => {
    const videoRef = JSON.stringify({ categoryId, videoId });
    const notesContent = notes.map(note => `[${note.time}] ${note.text}`).join('\n\n');
    form.setFieldsValue({
      title: `Notes from ${video?.title}`,
      content: `${notesContent}\n\n---\n\n[Video Reference](${videoRef})`,
      tag: 'note',
    });
    setIsShareModalOpen(true);
  };

  if (!video) {
    return (
      <div className="page-container">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/listening/video')}
          style={{ width: 'fit-content', paddingInline: 0, marginBottom: 16 }}
        >
          Back to video collection
        </Button>
        <Alert
          type="error"
          message="Video not found"
          description="The video you're looking for doesn't exist."
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/listening/video')}
          style={{ width: 'fit-content', paddingInline: 0, marginBottom: 16 }}
        >
          Back to video collection
        </Button>
        <Space wrap size={[8, 8]} style={{ marginBottom: 8 }}>
          <Tag color="purple" style={{ borderRadius: 999 }}>
            {video.category}
          </Tag>
          <Tag icon={<ClockCircleOutlined />} style={{ borderRadius: 999 }}>
            {video.duration}
          </Tag>
        </Space>
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <VideoCameraOutlined style={{ marginRight: 6, color: '#7c3aed' }} />
          {video.title}
        </Title>
        {fromForum && (
          <Space style={{ marginTop: 16, width: '100%' }}>
            <Tag color="blue" style={{ borderRadius: 999 }}>
              <FileTextOutlined /> From Forum
            </Tag>
            <Space>
              <Text type="secondary" style={{ fontSize: 14 }}>Show Reference Notes:</Text>
              <Switch
                checked={showReferenceNotes}
                onChange={setShowReferenceNotes}
              />
            </Space>
          </Space>
        )}
        <Text type="secondary">
          {video.description}
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}
            styles={{ body: { padding: 0, overflow: 'hidden' } }}
          >
            {video.url ? (
              <YouTubePlayer url={video.url} iframeRef={iframeRef} />
            ) : (
              <>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <VideoCameraOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                    <Title level={4} style={{ color: '#fff', margin: 0 }}>
                      Video Player
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Video content will appear here
                    </Text>
                  </div>
                </div>
                <div style={{ padding: '20px 24px 24px 24px' }}>
                  <Space wrap size={[8, 8]}>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Video controls coming soon
                    </Text>
                  </Space>
                </div>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e5e7eb', height: '100%' }}
            styles={{ body: { padding: 20 } }}
            title={
              <Space>
                <EditOutlined />
                <span>Video Notes</span>
              </Space>
            }
            extra={
              <Space>
                <Button icon={<SaveOutlined />} onClick={handleSaveNotes}>
                  Save All
                </Button>
                <Button
                  type="primary"
                  icon={<ShareAltOutlined />}
                  onClick={openShareModal}
                  disabled={notes.length === 0}
                >
                  Share to Forum
                </Button>
              </Space>
            }
          >
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Card
                size="small"
                style={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                }}
                styles={{ body: { padding: 16 } }}
              >
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 14, color: '#374151' }}>
                      Add New Note
                    </Text>
                    <Tag color="blue" style={{ borderRadius: 999 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {currentVideoTime}
                    </Tag>
                  </Space>
                  <TextArea
                    rows={6}
                    placeholder="Write your notes here while watching the video..."
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    onPressEnter={(e) => {
                      if (e.shiftKey) return;
                      e.preventDefault();
                      handleAddNote();
                    }}
                    style={{ fontSize: 14, lineHeight: 1.6 }}
                  />
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddNote}
                      disabled={!currentNote.trim()}
                    >
                      Add Note
                    </Button>
                  </Space>
                </Space>
              </Card>

              <div style={{ flex: 1, minHeight: 0 }}>
                <Text strong style={{ fontSize: 14, color: '#374151', display: 'block', marginBottom: 12 }}>
                  Your Notes ({notes.length})
                </Text>
                {notes.length === 0 ? (
                  <Alert
                    type="info"
                    message="No notes yet"
                    description="Start taking notes while watching the video!"
                    showIcon
                    style={{ borderRadius: 12 }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      maxHeight: 'calc(100vh - 500px)',
                      overflowY: 'auto',
                      paddingRight: 4,
                    }}
                  >
                    {notes.map((note) => (
                      <Card
                        key={note.id}
                        size="small"
                        style={{
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          flexShrink: 0,
                        }}
                      >
                        <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <Space wrap size={[8, 4]}>
                              <Tag style={{ borderRadius: 999, fontSize: 12, background: '#eff6ff', color: '#1d4ed8' }}>
                                {note.time}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(note.timestamp).toLocaleDateString()}
                              </Text>
                            </Space>
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteNote(note.id)}
                            />
                          </div>
                          <Paragraph style={{ margin: 0, color: '#374151', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>
                            {note.text}
                          </Paragraph>
                        </Space>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Share Notes to Forum"
        open={isShareModalOpen}
        onCancel={() => setIsShareModalOpen(false)}
        onOk={() => form.submit()}
        okText="Share"
        okButtonProps={{ icon: <SendOutlined />, loading: sharing }}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleShareToForum}>
          <Form.Item
            name="tag"
            label="Tag"
            rules={[{ required: true, message: 'Please select a tag' }]}
          >
            <Select placeholder="Select a tag">
              {TAGS.map((tag) => (
                <Option key={tag} value={tag}>
                  {TAG_CONFIG[tag].label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="title"
            label="Post Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input
              placeholder="e.g., Key Notes from Introduction to Academic Writing"
              prefix={<EditOutlined />}
              maxLength={200}
            />
          </Form.Item>
          <Form.Item
            name="content"
            label="Content"
            rules={[{ required: true, message: 'Please add some content' }]}
          >
            <TextArea
              rows={12}
              placeholder="Your notes will appear here, you can edit them before sharing..."
              maxLength={5000}
              showCount
              style={{ fontSize: 14, lineHeight: 1.6 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
