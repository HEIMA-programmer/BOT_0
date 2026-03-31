import { Typography, Button, Card, Row, Col, Input, Space, Spin } from 'antd';
import { ArrowLeftOutlined, CommentOutlined, TeamOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';
import useConversation from '../hooks/useConversation';
import ConversationView from '../components/ConversationView';
import VoiceSelector from '../components/VoiceSelector';
import ScoringResultsModal from '../components/ScoringResultsModal';
import { chatHistoryAPI } from '../api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SCENARIO_CONFIG = {
  office_hours: {
    title: 'Office Hours',
    icon: <CommentOutlined style={{ marginRight: 10, color: '#2563eb' }} />,
    color: '#2563eb',
    desc: 'Practice speaking with your professor during office hours.',
  },
  seminar_discussion: {
    title: 'Seminar Discussion',
    icon: <TeamOutlined style={{ marginRight: 10, color: '#7c3aed' }} />,
    color: '#7c3aed',
    desc: 'Practice participating in academic group discussions.',
  },
};

export default function GuidedConversation({ scenarioType }) {
  useLearningTimeTracker('speaking', `study_time:${scenarioType}`);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const config = SCENARIO_CONFIG[scenarioType] || SCENARIO_CONFIG.office_hours;

  const [phase, setPhase] = useState('setup'); // setup | conversation
  const [subScenarios, setSubScenarios] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [customContext, setCustomContext] = useState('');
  const [voiceName, setVoiceName] = useState(
    localStorage.getItem('preferred_voice') || 'Puck'
  );
  const [showScoring, setShowScoring] = useState(false);
  const [loading, setLoading] = useState(true);

  const conversation = useConversation();

  // Fetch sub-scenario options
  useEffect(() => {
    chatHistoryAPI.getScenarioOptions(scenarioType)
      .then(res => {
        setSubScenarios(res.data.options || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [scenarioType]);

  const handleStart = useCallback(async () => {
    if (!selectedSub) return;

    setPhase('conversation');
    try {
      // Get the system prompt from backend
      const promptRes = await chatHistoryAPI.getScenarioPrompt({
        scenario_type: scenarioType,
        sub_scenario: selectedSub,
        custom_context: selectedSub === 'custom' ? customContext : undefined,
      });
      const systemPrompt = promptRes.data.prompt;

      // Create DB session
      const sessionRes = await chatHistoryAPI.createSession({
        scenario_type: scenarioType,
      });
      const dbSessionId = sessionRes.data.id;

      conversation.connect({
        systemPrompt,
        voiceName,
        dbSessionId,
        scenarioType,
        subScenario: selectedSub,
      });
    } catch (err) {
      console.error('Failed to start guided conversation:', err);
      conversation.connect({
        voiceName,
        scenarioType,
        subScenario: selectedSub,
      });
    }
  }, [selectedSub, customContext, voiceName, scenarioType, conversation]);

  const handleEnd = useCallback(() => {
    conversation.endConversation();
    if (conversation.messages.length > 0) {
      conversation.requestScoring();
      setShowScoring(true);
    }
  }, [conversation]);

  const handleBack = () => {
    if (conversation.status === 'listening') {
      conversation.endConversation();
    }
    navigate('/speaking', { state: { tab: 'ai-chat' } });
  };

  // Setup phase
  if (phase === 'setup') {
    return (
      <div className="page-container">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/speaking', { state: { tab: 'ai-chat' } })} />
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              {config.icon}{config.title}
            </Title>
          </div>
          <Text type="secondary">{config.desc}</Text>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
            {/* Sub-scenario selection */}
            <Card style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}>
              <Title level={5} style={{ marginBottom: 16 }}>Choose a Scenario</Title>
              <Row gutter={[12, 12]}>
                {subScenarios.map(sub => (
                  <Col xs={24} sm={12} key={sub.key}>
                    <Card
                      size="small"
                      style={{
                        borderRadius: 12,
                        cursor: 'pointer',
                        border: selectedSub === sub.key
                          ? `2px solid ${config.color}`
                          : '1px solid #e5e7eb',
                        background: selectedSub === sub.key ? `${config.color}08` : '#fff',
                        transition: 'all 0.2s',
                      }}
                      bodyStyle={{ padding: 16 }}
                      onClick={() => setSelectedSub(sub.key)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 24 }}>{sub.icon}</span>
                        <div>
                          <Text strong style={{ fontSize: 14 }}>{sub.title}</Text>
                          <Text
                            type="secondary"
                            style={{ fontSize: 12, display: 'block', marginTop: 4 }}
                          >
                            {sub.desc}
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Custom context input */}
              {selectedSub === 'custom' && (
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                    Describe your scenario:
                  </Text>
                  <TextArea
                    rows={3}
                    placeholder={
                      scenarioType === 'office_hours'
                        ? 'e.g., I want to ask my professor about changing my thesis topic...'
                        : 'e.g., I want to discuss the impact of AI on education...'
                    }
                    value={customContext}
                    onChange={e => setCustomContext(e.target.value)}
                    style={{ borderRadius: 10 }}
                  />
                </div>
              )}
            </Card>

            {/* Voice selection */}
            <Card style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}>
              <VoiceSelector value={voiceName} onChange={setVoiceName} />
            </Card>

            {/* Start button */}
            <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 16 }}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStart}
                disabled={!selectedSub || (selectedSub === 'custom' && !customContext.trim())}
                style={{
                  height: 48,
                  padding: '0 40px',
                  borderRadius: 24,
                  fontSize: 16,
                  background: selectedSub
                    ? `linear-gradient(135deg, ${config.color}, ${config.color}dd)`
                    : undefined,
                  border: 'none',
                }}
              >
                Start Conversation
              </Button>
              <div style={{ marginTop: 12, color: '#9ca3af', fontSize: 13 }}>
                The AI will start the conversation in the selected scenario
              </div>
            </div>
          </Space>
        )}
      </div>
    );
  }

  // Conversation phase
  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack} />
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
            {config.icon}{config.title}
          </Title>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <ConversationView
          status={conversation.status}
          aiSpeaking={conversation.aiSpeaking}
          messages={conversation.messages}
          currentTranscript={conversation.currentTranscript}
          currentAiTranscript={conversation.currentAiTranscript}
          onEndConversation={handleEnd}
        />
      </div>

      {conversation.status === 'ended' && conversation.messages.length > 0 && !showScoring && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                conversation.requestScoring();
                setShowScoring(true);
              }}
            >
              Get AI Feedback
            </Button>
            <Button onClick={() => navigate('/speaking', { state: { tab: 'ai-chat' } })}>
              Back to Speaking Studio
            </Button>
          </Space>
        </div>
      )}

      <ScoringResultsModal
        open={showScoring}
        onClose={() => {
          setShowScoring(false);
          if (conversation.scoringStatus === 'done') {
            if (state.taskId) {
              window.dispatchEvent(new CustomEvent('taskCompleted', { detail: { taskId: state.taskId } }));
            }
            navigate('/speaking', { state: { tab: 'ai-chat' } });
          }
        }}
        scores={conversation.scores}
        scoringStatus={conversation.scoringStatus}
      />
    </div>
  );
}
