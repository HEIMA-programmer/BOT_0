import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Radio,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SoundOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

import AudioPlayer from '../components/AudioPlayer';
import { listeningAPI } from '../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const levelTheme = {
  beginner: { color: '#059669', bg: '#ecfdf5', accent: '#047857' },
  intermediate: { color: '#2563eb', bg: '#eff6ff', accent: '#1d4ed8' },
  advanced: { color: '#d97706', bg: '#fffbeb', accent: '#b45309' },
};

const scenarioIcons = {
  'lecture-clips': <ReadOutlined />,
  'group-discussion': <TeamOutlined />,
  'qa-session': <QuestionCircleOutlined />,
  'office-hour': <MessageOutlined />,
};

const questionTypeLabels = {
  multiple_choice: 'Multiple choice',
  fill_in_the_blank: 'Fill in the blank',
  short_answer: 'Short answer',
};

function handleSelectableKeyDown(event, onSelect) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onSelect();
  }
}

function createEmptyAnswers(questions) {
  return (questions || []).reduce((accumulator, question) => {
    accumulator[question.id] = '';
    return accumulator;
  }, {});
}

export default function Listening() {
  const navigate = useNavigate();
  const { levelId } = useParams();

  const [catalog, setCatalog] = useState({ levels: [], source_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState('');
  const [practiceData, setPracticeData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const response = await listeningAPI.getCatalog();
        if (!active) return;
        setCatalog(response.data);
        setError('');
      } catch (fetchError) {
        console.error('Failed to load listening catalog:', fetchError);
        if (!active) return;
        setCatalog({ levels: [], source_count: 0 });
        setError('Failed to load listening materials. Please try again.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCatalog();
    return () => {
      active = false;
    };
  }, []);

  const levels = catalog.levels || [];
  const selectedLevel = levels.find((level) => level.id === levelId) || null;
  const selectedScenario = selectedLevel?.scenarios?.find(
    (scenario) => scenario.id === selectedScenarioId
  ) || null;
  const selectedClip = selectedScenario?.clips?.find((clip) => clip.id === selectedClipId) || null;
  const resultMap = (submissionResult?.results || []).reduce((accumulator, result) => {
    accumulator[result.id] = result;
    return accumulator;
  }, {});

  useEffect(() => {
    if (!levelId || !selectedLevel?.scenarios?.length) {
      setSelectedScenarioId(null);
      setSelectedClipId(null);
      return;
    }

    if (!selectedLevel.scenarios.some((scenario) => scenario.id === selectedScenarioId)) {
      const defaultScenario = selectedLevel.scenarios.find((scenario) => scenario.is_available)
        || selectedLevel.scenarios[0];
      setSelectedScenarioId(defaultScenario?.id || null);
    }
  }, [levelId, selectedLevel, selectedScenarioId]);

  useEffect(() => {
    if (!selectedScenario) {
      setSelectedClipId(null);
      setPracticeData(null);
      setPracticeError('');
      setAnswers({});
      setSubmissionResult(null);
      return;
    }

    if (!selectedScenario.is_available) {
      setSelectedClipId(null);
      setPracticeData(null);
      setPracticeError('');
      setAnswers({});
      setSubmissionResult(null);
      return;
    }

    if (!selectedScenario.clips.some((clip) => clip.id === selectedClipId)) {
      setSelectedClipId(selectedScenario.clips[0]?.id || null);
    }
  }, [selectedScenario, selectedClipId]);

  useEffect(() => {
    if (!levelId || !selectedLevel || !selectedScenario?.is_available || !selectedClip) {
      setPracticeData(null);
      setPracticeError('');
      setAnswers({});
      setSubmissionResult(null);
      return;
    }

    let active = true;

    const fetchPractice = async () => {
      setPracticeLoading(true);
      setPracticeError('');
      setPracticeData(null);
      setSubmissionResult(null);
      try {
        const response = await listeningAPI.getPractice(
          selectedLevel.id,
          selectedScenario.id,
          selectedClip.source_slug
        );
        if (!active) return;
        setPracticeData(response.data);
        setAnswers(createEmptyAnswers(response.data.questions));
      } catch (fetchError) {
        console.error('Failed to load listening practice:', fetchError);
        if (!active) return;
        setPracticeData(null);
        setAnswers({});
        setPracticeError('Failed to load questions for this clip. Please choose another one.');
      } finally {
        if (active) {
          setPracticeLoading(false);
        }
      }
    };

    fetchPractice();
    return () => {
      active = false;
    };
  }, [levelId, selectedLevel, selectedScenario, selectedClip]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedLevel || !selectedScenario || !selectedClip) {
      return;
    }

    setSubmitting(true);
    setPracticeError('');
    try {
      const response = await listeningAPI.submitPractice(
        selectedLevel.id,
        selectedScenario.id,
        selectedClip.source_slug,
        answers
      );
      setSubmissionResult(response.data);
    } catch (submitError) {
      console.error('Failed to submit listening practice:', submitError);
      setPracticeError('We could not submit your answers. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetCurrentClip = () => {
    setAnswers(createEmptyAnswers(practiceData?.questions));
    setSubmissionResult(null);
    setPracticeError('');
  };

  const renderLanding = () => (
    <>
      <Card
        style={{
          borderRadius: 16,
          border: '1px solid #f3e8d7',
          background: 'linear-gradient(135deg, #fffdf7, #fff7ed)',
          marginBottom: 24,
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={16}>
            <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#7c2d12' }}>
              Choose your listening level
            </Title>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Beginner and Intermediate lecture practice are ready now. Advanced content and the
              other scenarios stay visible in the interface for future development.
            </Text>
          </Col>
          <Col xs={24} md={8} lg={6}>
            <Tag color="gold" style={{ borderRadius: 999, padding: '4px 10px', fontSize: 13 }}>
              {catalog.source_count} lecture clips ready
            </Tag>
          </Col>
        </Row>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#374151' }}>
          Select a difficulty
        </Title>
      </div>
      <Row gutter={[16, 16]}>
        {levels.map((level) => {
          const theme = levelTheme[level.id] || levelTheme.beginner;
          return (
            <Col xs={24} md={8} key={level.id}>
              <Card
                hoverable
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/listening/${level.id}`)}
                onKeyDown={(event) => handleSelectableKeyDown(
                  event,
                  () => navigate(`/listening/${level.id}`)
                )}
                style={{
                  borderRadius: 14,
                  border: '1px solid #e5e7eb',
                  height: '100%',
                }}
                styles={{ body: { padding: 24 } }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: theme.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                    color: theme.color,
                    fontSize: 24,
                  }}
                >
                  <SoundOutlined />
                </div>
                <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
                  <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                    {level.label}
                  </Title>
                  <Tag color={level.is_available ? 'success' : 'default'} style={{ borderRadius: 999 }}>
                    {level.is_available ? 'Ready now' : 'Coming soon'}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ display: 'block', fontSize: 13, lineHeight: 1.6 }}>
                  {level.description}
                </Text>
                <Text style={{ color: theme.accent, fontWeight: 600, display: 'block', marginTop: 16 }}>
                  Enter {level.label}
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>
    </>
  );

  const renderScenarioCards = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#374151' }}>
          Choose a scenario in {selectedLevel.label}
        </Title>
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {selectedLevel.scenarios.map((scenario) => {
          const theme = levelTheme[selectedLevel.id] || levelTheme.beginner;
          const isSelected = selectedScenarioId === scenario.id;

          return (
            <Col xs={24} sm={12} lg={6} key={scenario.id}>
              <Card
                hoverable
                role="button"
                tabIndex={0}
                onClick={() => setSelectedScenarioId(scenario.id)}
                onKeyDown={(event) => handleSelectableKeyDown(event, () => setSelectedScenarioId(scenario.id))}
                style={{
                  borderRadius: 12,
                  border: isSelected ? `1px solid ${theme.color}` : '1px solid #e5e7eb',
                  boxShadow: isSelected ? `0 8px 24px ${theme.color}22` : 'none',
                  height: '100%',
                  opacity: scenario.is_available ? 1 : 0.86,
                }}
                styles={{ body: { padding: 20 } }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: theme.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                    fontSize: 20,
                    color: theme.color,
                  }}
                >
                  {scenarioIcons[scenario.id] || <SoundOutlined />}
                </div>
                <Space wrap size={[8, 8]} style={{ marginBottom: 10 }}>
                  <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                    {scenario.label}
                  </Title>
                  <Tag color={scenario.is_available ? 'processing' : 'default'} style={{ borderRadius: 999 }}>
                    {scenario.is_available ? `${scenario.clip_count} clips` : 'Coming soon'}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ display: 'block', fontSize: 13, lineHeight: 1.6 }}>
                  {scenario.description}
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>
    </>
  );

  const renderQuestionInput = (question) => {
    if (question.type === 'multiple_choice') {
      return (
        <Radio.Group
          value={answers[question.id]}
          onChange={(event) => handleAnswerChange(question.id, event.target.value)}
          disabled={Boolean(submissionResult)}
        >
          <Space orientation="vertical" size={10}>
            {question.options.map((option) => (
              <Radio key={option.key} value={option.key}>
                {option.key}. {option.text}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      );
    }

    if (question.type === 'fill_in_the_blank') {
      return (
        <Input
          value={answers[question.id]}
          onChange={(event) => handleAnswerChange(question.id, event.target.value)}
          placeholder="Type your answer here"
          readOnly={Boolean(submissionResult)}
          size="large"
        />
      );
    }

    return (
      <TextArea
        value={answers[question.id]}
        onChange={(event) => handleAnswerChange(question.id, event.target.value)}
        placeholder="Write a short answer"
        readOnly={Boolean(submissionResult)}
        rows={4}
      />
    );
  };

  const renderQuestionResult = (question) => {
    const result = resultMap[question.id];
    if (!result) {
      return null;
    }

    return (
      <Card
        size="small"
        style={{
          borderRadius: 12,
          border: `1px solid ${result.is_correct ? '#a7f3d0' : '#fecaca'}`,
          background: result.is_correct ? '#f0fdf4' : '#fef2f2',
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          <Space wrap size={[8, 8]}>
            <Tag color={result.is_correct ? 'success' : 'error'} style={{ borderRadius: 999 }}>
              {result.is_correct ? 'Correct' : 'Incorrect'}
            </Tag>
            <Tag style={{ borderRadius: 999 }}>
              {questionTypeLabels[result.type] || result.section_label}
            </Tag>
          </Space>
          <Text>
            <Text strong>Your answer:</Text>{' '}
            {result.user_response || 'Not answered'}
          </Text>
          <Text>
            <Text strong>Correct answer:</Text>{' '}
            {result.correct_answer}
          </Text>
          <Paragraph style={{ margin: 0, color: '#4b5563' }}>
            <Text strong>Explanation:</Text> {result.explanation}
          </Paragraph>
        </Space>
      </Card>
    );
  };

  const renderPracticeArea = () => {
    if (!selectedScenario) {
      return null;
    }

    if (!selectedScenario.is_available) {
      return (
        <Card
          style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}
          styles={{ body: { padding: 24 } }}
        >
          <Empty
            description={`${selectedScenario.label} for ${selectedLevel.label} is reserved for later development.`}
          />
        </Card>
      );
    }

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e5e7eb', height: '100%' }}
            styles={{ body: { padding: 24 } }}
          >
            <Space orientation="vertical" size={6} style={{ width: '100%', marginBottom: 18 }}>
              <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                {selectedScenario.label}
              </Title>
              <Text type="secondary">
                Choose one of the {selectedScenario.clip_count} lecture clips to start your practice.
              </Text>
            </Space>

            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              {selectedScenario.clips.map((clip) => {
                const isSelected = selectedClipId === clip.id;
                return (
                  <Card
                    key={clip.id}
                    size="small"
                    hoverable
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedClipId(clip.id)}
                    onKeyDown={(event) => handleSelectableKeyDown(event, () => setSelectedClipId(clip.id))}
                    style={{
                      borderRadius: 12,
                      border: isSelected ? '1px solid #2563eb' : '1px solid #e5e7eb',
                      background: isSelected ? '#f8fbff' : '#fff',
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <Text strong style={{ color: '#1f2937' }}>
                          {clip.title}
                        </Text>
                        <PlayCircleOutlined style={{ color: isSelected ? '#2563eb' : '#9ca3af' }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {clip.transcript_preview}
                      </Text>
                    </Space>
                  </Card>
                );
              })}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Card
              style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}
              styles={{ body: { padding: 24 } }}
            >
              {selectedClip ? (
                <>
                  <Space wrap size={[8, 8]} style={{ marginBottom: 14 }}>
                    <Tag color="blue" style={{ borderRadius: 999 }}>{selectedLevel.label}</Tag>
                    <Tag color="gold" style={{ borderRadius: 999 }}>{selectedScenario.label}</Tag>
                  </Space>
                  <Title level={4} style={{ marginTop: 0, marginBottom: 8, fontWeight: 600 }}>
                    {selectedClip.title}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 18 }}>
                    Listen first, then complete the practice set for this clip.
                  </Text>
                  <AudioPlayer src={selectedClip.audio_url} title={selectedClip.title} />
                </>
              ) : (
                <Empty description="Choose a clip to start playback." />
              )}
            </Card>

            <Card
              style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}
              styles={{ body: { padding: 24 } }}
            >
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                    Practice Questions
                  </Title>
                  <Text type="secondary">
                    {practiceData?.instructions || 'Questions for this clip will load here.'}
                  </Text>
                </div>

                {practiceError ? (
                  <Alert
                    type="error"
                    showIcon
                    message="Practice unavailable"
                    description={practiceError}
                    style={{ borderRadius: 12 }}
                  />
                ) : null}

                {practiceLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <Spin size="large" />
                  </div>
                ) : null}

                {!practiceLoading && practiceData ? (
                  <>
                    {submissionResult ? (
                      <Card
                        style={{
                          borderRadius: 14,
                          border: '1px solid #dbeafe',
                          background: 'linear-gradient(135deg, #f8fbff, #eef6ff)',
                        }}
                        styles={{ body: { padding: 20 } }}
                      >
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={8}>
                            <Statistic
                              title="Score"
                              value={submissionResult.score}
                              suffix="%"
                              styles={{ content: { color: '#2563eb', fontWeight: 700 } }}
                            />
                          </Col>
                          <Col xs={24} sm={8}>
                            <Statistic
                              title="Correct"
                              value={`${submissionResult.correct_count}/${submissionResult.total_count}`}
                              styles={{ content: { color: '#059669', fontWeight: 700 } }}
                            />
                          </Col>
                          <Col xs={24} sm={8}>
                            <Space orientation="vertical" size={6}>
                              <Text type="secondary">Review complete</Text>
                              <Button onClick={handleResetCurrentClip}>
                                Try this clip again
                              </Button>
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    ) : null}

                    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                      {practiceData.questions.map((question) => {
                        const result = resultMap[question.id];
                        return (
                          <Card
                            key={question.id}
                            style={{
                              borderRadius: 14,
                              border: result
                                ? `1px solid ${result.is_correct ? '#a7f3d0' : '#fecaca'}`
                                : '1px solid #e5e7eb',
                              background: result
                                ? (result.is_correct ? '#f9fffb' : '#fffafa')
                                : '#fff',
                            }}
                            styles={{ body: { padding: 20 } }}
                          >
                          <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                                  Question {question.number}
                                </Title>
                                <Tag style={{ borderRadius: 999 }}>
                                  {questionTypeLabels[question.type] || question.section_label}
                                </Tag>
                              </div>
                              <Paragraph style={{ margin: 0, color: '#111827', fontWeight: 500 }}>
                                {question.prompt}
                              </Paragraph>
                              {renderQuestionInput(question)}
                              {renderQuestionResult(question)}
                            </Space>
                          </Card>
                        );
                      })}
                    </Space>

                    {!submissionResult ? (
                      <Button
                        type="primary"
                        size="large"
                        onClick={handleSubmit}
                        loading={submitting}
                      >
                        Submit answers
                      </Button>
                    ) : null}
                  </>
                ) : null}

                {!practiceLoading && !practiceData && !practiceError ? (
                  <Empty description="Choose a clip to load its questions." />
                ) : null}
              </Space>
            </Card>

            {submissionResult ? (
              <Card
                style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}
                styles={{ body: { padding: 24 } }}
              >
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <Space wrap size={[8, 8]}>
                    <Tag color="purple" style={{ borderRadius: 999 }}>
                      Transcript
                    </Tag>
                    <Tag icon={<CheckCircleOutlined />} color="success" style={{ borderRadius: 999 }}>
                      Available after submission
                    </Tag>
                  </Space>
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151' }}>
                    {submissionResult.transcript}
                  </Paragraph>
                </Space>
              </Card>
            ) : null}
          </Space>
        </Col>
      </Row>
    );
  };

  const renderLevelDetail = () => {
    const theme = levelTheme[selectedLevel.id] || levelTheme.beginner;

    return (
      <>
        <Card
          style={{
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            marginBottom: 24,
          }}
          styles={{ body: { padding: 24 } }}
        >
          <Space orientation="vertical" size={14} style={{ width: '100%' }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/listening')}
              style={{ width: 'fit-content', paddingInline: 0 }}
            >
              Back to listening levels
            </Button>

            <Space wrap size={[8, 8]}>
              <Tag
                style={{
                  borderRadius: 999,
                  padding: '4px 10px',
                  color: theme.accent,
                  background: theme.bg,
                  border: `1px solid ${theme.color}33`,
                }}
              >
                {selectedLevel.label}
              </Tag>
              <Tag
                icon={selectedLevel.is_available ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                color={selectedLevel.is_available ? 'success' : 'default'}
                style={{ borderRadius: 999 }}
              >
                {selectedLevel.is_available ? 'Lecture Clips available now' : 'In development'}
              </Tag>
            </Space>

            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
                {selectedLevel.label} Listening Practice
              </Title>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                {selectedLevel.description}
              </Text>
            </div>
          </Space>
        </Card>

        {renderScenarioCards()}
        {renderPracticeArea()}
      </>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <SoundOutlined style={{ marginRight: 10, color: '#d97706' }} />
          Listening Lab
        </Title>
        <Text type="secondary">
          Practice listening to academic lectures and answer comprehension questions.
        </Text>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Listening materials unavailable"
          description={error}
          style={{ marginBottom: 24, borderRadius: 12 }}
        />
      ) : null}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}>
          <Spin size="large" />
        </div>
      ) : null}

      {!loading && !levels.length ? (
        <Card style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}>
          <Empty description="No listening materials were found in the Audio/output folders yet." />
        </Card>
      ) : null}

      {!loading && levels.length && !levelId ? renderLanding() : null}

      {!loading && levels.length && levelId && !selectedLevel ? (
        <Card style={{ borderRadius: 16, border: '1px solid #e5e7eb' }} styles={{ body: { padding: 24 } }}>
          <Empty description="That listening level was not found.">
            <Button type="primary" onClick={() => navigate('/listening')}>
              Return to listening levels
            </Button>
          </Empty>
        </Card>
      ) : null}

      {!loading && selectedLevel ? renderLevelDetail() : null}
    </div>
  );
}
