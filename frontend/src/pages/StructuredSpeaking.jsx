import { Typography, Card, Row, Col, Button, Space, Progress, Breadcrumb, Input, Divider, Tag } from 'antd';
import { AudioOutlined, MessageOutlined, PlayCircleOutlined, PauseCircleOutlined, UploadOutlined, CheckCircleOutlined, ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function StructuredSpeaking() {
  useLearningTimeTracker('speaking', 'study_time:structured-speaking');
  const navigate = useNavigate();

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [recording, setRecording] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [customTopicTitle, setCustomTopicTitle] = useState('');
  const [customTopicDesc, setCustomTopicDesc] = useState('');
  const [showCustomTopic, setShowCustomTopic] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(null);

  const recommendedTopics = [
    { id: 1, title: 'Talk about your day today', desc: 'Describe your activities and experiences from today' },
    { id: 2, title: 'Your favorite hobby', desc: 'Explain what you enjoy doing in your free time' },
    { id: 3, title: 'A memorable trip', desc: 'Share an interesting travel experience' },
    { id: 4, title: 'Your career goals', desc: 'Discuss your professional aspirations' },
  ];

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
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
    }
  };

  const handleRecordToggle = () => {
    if (recording) {
      // Stop recording
      setRecording(false);
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
    } else {
      // Start recording
      setRecording(true);
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            clearInterval(timer);
            setRecording(false);
            setRecordingTimer(null);
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
      setRecordingTimer(timer);
    }
  };

  const handleSubmitRecording = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setSelectedTopic(null);
    setRecording(false);
    setShowResults(false);
    setRecordingTime(0);
    setCustomTopicTitle('');
    setCustomTopicDesc('');
    setShowCustomTopic(false);
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
  };

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

        {/* Custom Topic Section */}
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

        <Divider>
          <Tag color="blue">Recommended Topics</Tag>
        </Divider>

        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          {recommendedTopics.map((topic) => (
            <Col xs={24} sm={12} key={topic.id}>
              <Card
                style={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                bodyStyle={{ padding: 24 }}
                onClick={() => handleTopicSelect(topic)}
                hoverable
              >
                <Title level={4} style={{ fontWeight: 600, marginBottom: 12 }}>{topic.title}</Title>
                <Text type="secondary" style={{ fontSize: 14 }}>{topic.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  if (!showResults) {
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
            />
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              {selectedTopic.title}
            </Title>
          </div>
          <Text type="secondary">
            Prepare and start recording your response about this topic
          </Text>
        </div>

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
              onClick={handleRecordToggle}
              style={{
                width: 100,
                height: 100,
                background: recording ? '#ef4444' : '#3b82f6',
                border: 'none',
              }}
            >
              {recording ? <PauseCircleOutlined style={{ fontSize: 56 }} /> : <AudioOutlined style={{ fontSize: 56 }} />}
            </Button>
          </div>
          
          <div style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 24, fontWeight: 600 }}>
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </Text>
          </div>

          <Space size="middle">
            <Button
              size="large"
              icon={<PlayCircleOutlined />}
              disabled={recording}
            >
              Play Sample
            </Button>
            <Button
              size="large"
              icon={<UploadOutlined />}
              disabled={recording}
            >
              Upload Audio
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={handleSubmitRecording}
              disabled={!recordingTime}
            >
              Submit for Feedback
            </Button>
          </Space>
        </div>
      </div>
    );
  }

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
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
              <Title level={4} style={{ marginBottom: 16 }}>Fluency</Title>
              <Progress percent={85} size="large" strokeColor="#3b82f6" />
              <Text style={{ marginTop: 16, display: 'block', fontSize: 18, fontWeight: 600 }}>8.5/10</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
              <Title level={4} style={{ marginBottom: 16 }}>Accuracy</Title>
              <Progress percent={78} size="large" strokeColor="#7c3aed" />
              <Text style={{ marginTop: 16, display: 'block', fontSize: 18, fontWeight: 600 }}>7.8/10</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
              <Title level={4} style={{ marginBottom: 16 }}>Logic</Title>
              <Progress percent={92} size="large" strokeColor="#059669" />
              <Text style={{ marginTop: 16, display: 'block', fontSize: 18, fontWeight: 600 }}>9.2/10</Text>
            </Card>
          </Col>
        </Row>

        <Card style={{ marginBottom: 24, borderRadius: 12 }}>
          <Title level={4} style={{ marginBottom: 16 }}>Sample Response</Title>
          <Text style={{ fontSize: 16, lineHeight: 1.8 }}>
            Today was a productive day. I woke up early and went for a morning jog, then had a healthy breakfast. At work, I finished several important projects and had a productive meeting with my team. In the evening, I spent time with my family and read a book before bed. Overall, it was a well-balanced day filled with both work and relaxation.
          </Text>
        </Card>

        <Card style={{ marginBottom: 32, borderRadius: 12 }}>
          <Title level={4} style={{ marginBottom: 16 }}>Improvement Suggestions</Title>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 2 }}>
            <li style={{ marginBottom: 12 }}>Try to speak more slowly and clearly</li>
            <li style={{ marginBottom: 12 }}>Pay attention to word stress in longer words</li>
            <li style={{ marginBottom: 12 }}>Use more varied sentence structures</li>
          </ul>
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
