import { Typography, Card, Row, Col, Button, Space, Progress, Breadcrumb, Input, Divider, Tag, message, Spin } from 'antd';
import { AudioOutlined, MessageOutlined, PauseCircleOutlined, ArrowLeftOutlined, PlusOutlined, CheckCircleOutlined, LoadingOutlined, ReadOutlined, TeamOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function StructuredSpeaking() {
  useLearningTimeTracker('speaking', 'study_time:structured-speaking');
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const scenarioType = state.type || null;

  const SPEAKING_CATEGORIES = [
    {
      id: 'lecture-response',
      label: 'Lecture Response',
      icon: <ReadOutlined />,
      color: '#059669',
      bg: '#ecfdf5',
      description: 'Practice summarizing, explaining, and reacting to lecture content',
      topics: [
        { id: 1, title: 'Summarize a recent article you read', desc: 'Briefly explain the main argument and findings of an academic article' },
        { id: 2, title: 'Explain a concept from your field', desc: 'Choose a key concept and explain it in simple terms' },
        { id: 3, title: 'React to a lecture claim', desc: 'Agree or disagree with a statement from a lecture and explain why' },
        { id: 4, title: 'Compare two theories', desc: 'Describe two theories from your field and explain how they differ' },
      ],
    },
    {
      id: 'group-discussion',
      label: 'Group Discussion',
      icon: <TeamOutlined />,
      color: '#2563eb',
      bg: '#eff6ff',
      description: 'Practice expressing opinions, collaborating, and debating in groups',
      topics: [
        { id: 5, title: 'Discuss online vs in-person learning', desc: 'Compare the advantages and disadvantages of each learning mode' },
        { id: 6, title: 'Describe how you approach group projects', desc: 'Explain your strategy for collaborating with classmates' },
        { id: 7, title: 'Pitch a research idea to your team', desc: 'Present a new research concept and persuade others of its value' },
        { id: 8, title: 'Mediate a disagreement in a group', desc: 'Practice finding common ground when team members have different views' },
      ],
    },
    {
      id: 'qa-session',
      label: 'Q&A Session',
      icon: <QuestionCircleOutlined />,
      color: '#d97706',
      bg: '#fffbeb',
      description: 'Practice asking and answering academic questions with clarity',
      topics: [
        { id: 9, title: 'Discuss critical thinking in academia', desc: 'Explain why critical thinking is important in academic work' },
        { id: 10, title: 'Evaluate an academic source', desc: 'Describe how you determine if a source is credible and reliable' },
        { id: 11, title: 'Ask clarifying questions about a paper', desc: 'Practice formulating thoughtful questions about research methodology or findings' },
        { id: 12, title: 'Respond to a challenging question', desc: 'Practice handling unexpected or difficult questions in a presentation Q&A' },
      ],
    },
    {
      id: 'office-hour',
      label: 'Office Hour',
      icon: <MessageOutlined />,
      color: '#dc2626',
      bg: '#fef2f2',
      description: 'Practice one-on-one conversations with professors and advisors',
      topics: [
        { id: 13, title: 'Describe your research interests', desc: 'Explain what academic topics interest you and why they are important' },
        { id: 14, title: 'Describe a challenging academic problem', desc: 'Explain a difficult problem you faced and how you solved it' },
        { id: 15, title: 'Request feedback on a draft', desc: 'Ask your professor for specific feedback on your writing or research' },
        { id: 16, title: 'Discuss your academic goals', desc: 'Share your long-term academic plans and seek guidance' },
      ],
    },
  ];

  const scenarioTopics = {
    'office_hours': [
      { id: 1, title: 'Assignment Questions', desc: 'Ask your professor about assignment requirements, format, and expectations' },
      { id: 2, title: 'Discuss Grades', desc: 'Talk about your academic performance and seek improvement suggestions' },
      { id: 3, title: 'Request Extension', desc: 'Practice politely requesting deadline extensions for assignments' },
      { id: 4, title: 'Research Guidance', desc: 'Seek help with research projects or thesis work' },
      { id: 5, title: 'Custom Scenario', desc: 'Describe your own office hours scenario' },
    ],
    'seminar_discussion': [
      { id: 1, title: 'Present Research', desc: 'Share your research findings with the seminar group' },
      { id: 2, title: 'Paper Discussion', desc: 'Analyze and discuss academic papers with peers' },
      { id: 3, title: 'Defend Thesis', desc: 'Practice defending your thesis in a seminar setting' },
      { id: 4, title: 'Brainstorming', desc: 'Collaborate to generate and develop research ideas' },
      { id: 5, title: 'Custom Scenario', desc: 'Describe your own seminar discussion scenario' },
    ],
  };

  // State management
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const currentTopics = scenarioType
    ? scenarioTopics[scenarioType]
    : selectedCategory
      ? SPEAKING_CATEGORIES.find(c => c.id === selectedCategory)?.topics || []
      : [];
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [customTopicTitle, setCustomTopicTitle] = useState('');
  const [customTopicDesc, setCustomTopicDesc] = useState('');
  const [showCustomTopic, setShowCustomTopic] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progressMessage, setProgressMessage] = useState('');

  // Refs
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    const socket = io('/');
    socketRef.current = socket;

    socket.on('connected', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('progress', (data) => {
      setProcessing(true);
      setProgressMessage(data.message || '处理中...');
    });

    socket.on('result', (data) => {
      message.destroy();
      setProcessing(false);
      setProgressMessage('');
      setResult(data);
      message.success('Scoring complete! 🎉');
      
      if (state.taskId) {
        window.dispatchEvent(new CustomEvent('taskCompleted', { detail: { taskId: state.taskId } }));
      }
    });

    socket.on('error', (data) => {
      message.destroy();
      setProcessing(false);
      setProgressMessage('');
      setError(data.message);
      message.error(data.message || '处理失败，请重试');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setResult(null);
    setError(null);
  };

  const handleCustomTopicSubmit = () => {
    if (customTopicTitle.trim()) {
      const customTopic = {
        id: Date.now(),
        title: customTopicTitle.trim(),
        desc: customTopicDesc.trim() || 'Custom topic',
        isCustom: true
      };
      setSelectedTopic(customTopic);
      setResult(null);
      setError(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;

      // Force WAV format for faster backend processing
      // Fallback to WebM if WAV is not supported
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/wav' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
        console.warn('WAV not supported, using WebM as fallback');
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      message.error('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const handleRecordingStop = async () => {
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result.split(',')[1];

      // Send to backend via WebSocket
      if (socketRef.current) {
        socketRef.current.emit('submit_audio', {
          audio: base64Audio,
          topic: selectedTopic.title,
          mimeType: mimeType
        });
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  const handleReset = () => {
    setSelectedTopic(null);
    setRecording(false);
    setRecordingTime(0);
    setCustomTopicTitle('');
    setCustomTopicDesc('');
    setShowCustomTopic(false);
    setProcessing(false);
    setResult(null);
    setError(null);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setRecordingTime(0);
  };

  // Topic selection page
  if (!selectedTopic) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb
            items={[
              { title: <span onClick={() => navigate('/speaking')} style={{ cursor: 'pointer' }}>Speaking</span> },
              { title: 'Structured Speaking' }
            ]}
          />
        </div>

        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/speaking')}
            />
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <MessageOutlined style={{ marginRight: 10, color: '#7c3aed' }} />Structured Speaking
            </Title>
          </div>
          <Text type="secondary">
            Select a topic or create your own to practice structured speaking
          </Text>
        </div>

        <Card style={{ marginBottom: 24, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              <PlusOutlined style={{ marginRight: 8, color: '#2563eb' }} />Create Your Own Topic
            </Title>
            <Button
              type={showCustomTopic ? 'default' : 'primary'}
              onClick={() => setShowCustomTopic(!showCustomTopic)}
            >
              {showCustomTopic ? 'Cancel' : 'Create Custom Topic'}
            </Button>
          </div>

          {showCustomTopic && (
            <div style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Topic Title</Text>
                  <Input
                    placeholder="Enter your topic title..."
                    value={customTopicTitle}
                    onChange={(e) => setCustomTopicTitle(e.target.value)}
                    size="large"
                  />
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Description (Optional)</Text>
                  <TextArea
                    placeholder="Describe what you want to talk about..."
                    value={customTopicDesc}
                    onChange={(e) => setCustomTopicDesc(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleCustomTopicSubmit}
                    disabled={!customTopicTitle.trim()}
                    icon={<MessageOutlined />}
                  >
                    Start with Custom Topic
                  </Button>
                </div>
              </Space>
            </div>
          )}
        </Card>

        {scenarioType ? (
          <>
            <Divider>
              <Tag color="blue">Selected Scenario Topics</Tag>
            </Divider>
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
              {currentTopics.map((topic) => (
                <Col xs={24} sm={12} key={topic.id}>
                  <Card
                    style={{ borderRadius: 12, border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s' }}
                    styles={{ body: { padding: 24 } }}
                    onClick={() => handleTopicSelect(topic)}
                    hoverable
                  >
                    <Title level={4} style={{ fontWeight: 600, marginBottom: 12 }}>{topic.title}</Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>{topic.desc}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        ) : !selectedCategory ? (
          <>
            <div style={{ marginBottom: 16, marginTop: 24 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#374151' }}>
                Choose a category
              </Title>
            </div>
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
              {SPEAKING_CATEGORIES.map((cat) => (
                <Col xs={24} sm={12} lg={6} key={cat.id}>
                  <Card
                    hoverable
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      height: '100%',
                      cursor: 'pointer',
                    }}
                    styles={{ body: { padding: 20 } }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: cat.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 14,
                        fontSize: 20,
                        color: cat.color,
                      }}
                    >
                      {cat.icon}
                    </div>
                    <Space wrap size={[8, 8]} style={{ marginBottom: 10 }}>
                      <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                        {cat.label}
                      </Title>
                      <Tag color="processing" style={{ borderRadius: 999 }}>
                        {cat.topics.length} topics
                      </Tag>
                    </Space>
                    <Text type="secondary" style={{ display: 'block', fontSize: 13, lineHeight: 1.6 }}>
                      {cat.description}
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16, marginTop: 24 }}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => setSelectedCategory(null)}
                style={{ padding: 0, fontSize: 14, color: '#6b7280' }}
              >
                All Categories
              </Button>
              <Title level={4} style={{ margin: '8px 0 0', fontWeight: 600, color: '#374151' }}>
                {SPEAKING_CATEGORIES.find(c => c.id === selectedCategory)?.label} Topics
              </Title>
            </div>
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
              {currentTopics.map((topic) => (
                <Col xs={24} sm={12} key={topic.id}>
                  <Card
                    style={{ borderRadius: 12, border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s' }}
                    styles={{ body: { padding: 24 } }}
                    onClick={() => handleTopicSelect(topic)}
                    hoverable
                  >
                    <Title level={4} style={{ fontWeight: 600, marginBottom: 12 }}>{topic.title}</Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>{topic.desc}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </div>
    );
  }

  // Results page
  if (result) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb
            items={[
              { title: <span onClick={() => navigate('/speaking')} style={{ cursor: 'pointer' }}>Speaking</span> },
              { title: <span onClick={handleReset} style={{ cursor: 'pointer' }}>Structured Speaking</span> },
              { title: 'AI Feedback' }
            ]}
          />
        </div>

        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleReset}
            />
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <CheckCircleOutlined style={{ marginRight: 10, color: '#059669' }} />AI Feedback Results
            </Title>
          </div>
          <Text type="secondary">
            Your performance for: {selectedTopic.title}
          </Text>
        </div>

        <div style={{ marginTop: 32 }}>
          <Row gutter={[32, 32]} style={{ marginBottom: 32 }}>
            {/* Pronunciation Scores - Left */}
            <Col xs={24} md={12}>
              <Card style={{ borderRadius: 12, height: '100%' }}>
                <Title level={3} style={{ marginBottom: 24, textAlign: 'center', color: '#3b82f6' }}>
                  Pronunciation
                </Title>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <Progress
                    type="circle"
                    percent={result.pronunciation.overall}
                    size={160}
                    strokeColor="#3b82f6"
                    format={(percent) => (
                      <div>
                        <div style={{ fontSize: 32, fontWeight: 600 }}>{percent}</div>
                        <div style={{ fontSize: 14, color: '#666' }}>Overall</div>
                      </div>
                    )}
                  />
                </div>

                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>Accuracy</Text>
                      <Text strong>{result.pronunciation.accuracy}</Text>
                    </div>
                    <Progress percent={result.pronunciation.accuracy} strokeColor="#3b82f6" showInfo={false} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>Fluency</Text>
                      <Text strong>{result.pronunciation.fluency}</Text>
                    </div>
                    <Progress percent={result.pronunciation.fluency} strokeColor="#3b82f6" showInfo={false} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>Prosody</Text>
                      <Text strong>{result.pronunciation.prosody}</Text>
                    </div>
                    <Progress percent={result.pronunciation.prosody} strokeColor="#3b82f6" showInfo={false} />
                  </div>
                </Space>
              </Card>
            </Col>

            {/* Content Scores - Right */}
            <Col xs={24} md={12}>
              <Card style={{ borderRadius: 12, height: '100%' }}>
                <Title level={3} style={{ marginBottom: 24, textAlign: 'center', color: '#7c3aed' }}>
                  Content
                </Title>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <Progress
                    type="circle"
                    percent={result.content.overall}
                    size={160}
                    strokeColor="#7c3aed"
                    format={(percent) => (
                      <div>
                        <div style={{ fontSize: 32, fontWeight: 600 }}>{percent}</div>
                        <div style={{ fontSize: 14, color: '#666' }}>Overall</div>
                      </div>
                    )}
                  />
                </div>

                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>Vocabulary</Text>
                      <Text strong>{result.content.vocabulary}</Text>
                    </div>
                    <Progress percent={result.content.vocabulary} strokeColor="#7c3aed" showInfo={false} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>Grammar</Text>
                      <Text strong>{result.content.grammar}</Text>
                    </div>
                    <Progress percent={result.content.grammar} strokeColor="#7c3aed" showInfo={false} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>Topic</Text>
                      <Text strong>{result.content.topic}</Text>
                    </div>
                    <Progress percent={result.content.topic} strokeColor="#7c3aed" showInfo={false} />
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Transcript */}
          <Card style={{ marginBottom: 24, borderRadius: 12 }}>
            <Title level={4} style={{ marginBottom: 16 }}>Your Response</Title>
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {result.transcript}
            </Paragraph>
          </Card>

          {/* Feedback */}
          <Card style={{ marginBottom: 32, borderRadius: 12 }}>
            <Title level={4} style={{ marginBottom: 16 }}>AI Feedback</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong style={{ color: '#7c3aed' }}>Vocabulary: </Text>
                <Text>{result.content.feedback.vocabulary}</Text>
              </div>
              <div>
                <Text strong style={{ color: '#7c3aed' }}>Grammar: </Text>
                <Text>{result.content.feedback.grammar}</Text>
              </div>
              <div>
                <Text strong style={{ color: '#7c3aed' }}>Topic: </Text>
                <Text>{result.content.feedback.topic}</Text>
              </div>
            </Space>
          </Card>

          <div style={{ display: 'flex', gap: 16 }}>
            <Button size="large" onClick={handleReset}>
              Try Another Topic
            </Button>
            <Button type="primary" size="large" onClick={() => navigate('/speaking')}>
              Back to Speaking Studio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Recording page
  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb
          items={[
            { title: <span onClick={() => navigate('/speaking')} style={{ cursor: 'pointer' }}>Speaking</span> },
            { title: <span onClick={handleReset} style={{ cursor: 'pointer' }}>Structured Speaking</span> },
            { title: selectedTopic.title }
          ]}
        />
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleReset}
            disabled={recording || processing}
          />
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
            {selectedTopic.title}
          </Title>
        </div>
        <Text type="secondary">
          {processing ? 'Processing your recording...' : 'Click the button to start recording (max 60 seconds)'}
        </Text>
      </div>

      {processing ? (
        <div style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          marginTop: 24,
        }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 64, color: '#7c3aed' }} spin />} />
          <Title level={3} style={{ marginTop: 32, color: '#7c3aed' }}>
            {progressMessage || 'Processing...'}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            Please wait, AI is working hard...
          </Text>
        </div>
      ) : (
        <div style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          marginTop: 24,
        }}>
          <div style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: recording ? '#fee2e2' : '#f0f9ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            border: `6px solid ${recording ? '#ef4444' : '#3b82f6'}`,
          }}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              onClick={recording ? stopRecording : startRecording}
              style={{
                width: 100,
                height: 100,
                background: recording ? '#ef4444' : '#3b82f6',
                border: 'none',
              }}
            >
              {recording ? (
                <PauseCircleOutlined style={{ fontSize: 56 }} />
              ) : (
                <AudioOutlined style={{ fontSize: 56 }} />
              )}
            </Button>
          </div>

          <div style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 24, fontWeight: 600 }}>
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {recording ? '录音中...' : recordingTime > 0 ? '录音已完成' : '点击开始录音'}
            </Text>
          </div>

          {error && (
            <div style={{ marginBottom: 24 }}>
              <Text type="danger">{error}</Text>
              <div style={{ marginTop: 16 }}>
                <Button onClick={handleRetry}>重新录制</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
