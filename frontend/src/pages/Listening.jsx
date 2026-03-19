import React, { useEffect, useState } from 'react';
import { Typography, Card, Tag, Row, Col, Spin, Alert, Empty, Space } from 'antd';
import {
  SoundOutlined,
  ReadOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  MessageOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import AudioPlayer from '../components/AudioPlayer';
import { listeningAPI } from '../api';

const { Title, Text, Paragraph } = Typography;

const levelTheme = {
  beginner: { color: '#059669', bg: '#ecfdf5' },
  intermediate: { color: '#2563eb', bg: '#eff6ff' },
  advanced: { color: '#d97706', bg: '#fffbeb' },
};

const scenarioIcons = {
  'lecture-clips': <ReadOutlined />,
  'group-discussion': <TeamOutlined />,
  'qa-session': <QuestionCircleOutlined />,
  'office-hour': <MessageOutlined />,
};

function handleSelectableKeyDown(event, onSelect) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onSelect();
  }
}

export default function Listening() {
  const [catalog, setCatalog] = useState({ levels: [], source_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [selectedClipId, setSelectedClipId] = useState(null);

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
  const selectedLevel = levels.find((level) => level.id === selectedLevelId) || null;
  const selectedScenario = selectedLevel?.scenarios?.find(
    (scenario) => scenario.id === selectedScenarioId
  ) || null;
  const selectedClip = selectedScenario?.clips?.find((clip) => clip.id === selectedClipId) || null;

  useEffect(() => {
    if (!levels.length) {
      setSelectedLevelId(null);
      return;
    }

    if (!levels.some((level) => level.id === selectedLevelId)) {
      setSelectedLevelId(levels[0].id);
    }
  }, [levels, selectedLevelId]);

  useEffect(() => {
    if (!selectedLevel?.scenarios?.length) {
      setSelectedScenarioId(null);
      return;
    }

    if (!selectedLevel.scenarios.some((scenario) => scenario.id === selectedScenarioId)) {
      setSelectedScenarioId(selectedLevel.scenarios[0].id);
    }
  }, [selectedLevel, selectedScenarioId]);

  useEffect(() => {
    if (!selectedScenario?.clips?.length) {
      setSelectedClipId(null);
      return;
    }

    if (!selectedScenario.clips.some((clip) => clip.id === selectedClipId)) {
      setSelectedClipId(selectedScenario.clips[0].id);
    }
  }, [selectedScenario, selectedClipId]);

  const handleLevelSelect = (levelId) => {
    setSelectedLevelId(levelId);
    setSelectedScenarioId(null);
    setSelectedClipId(null);
  };

  const handleScenarioSelect = (scenarioId) => {
    setSelectedScenarioId(scenarioId);
    setSelectedClipId(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <SoundOutlined style={{ marginRight: 10, color: '#d97706' }} />Listening Lab
        </Title>
        <Text type="secondary">
          Practice listening to academic lectures and answer comprehension questions.
        </Text>
      </div>

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
              Browse by level, then choose a practice scenario
            </Title>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Every level now includes Lecture Clips, Group Discussion, Q&A Session, and Office Hour.
            </Text>
          </Col>
          <Col xs={24} md={8} lg={6}>
            <Tag color="gold" style={{ borderRadius: 999, padding: '4px 10px', fontSize: 13 }}>
              {catalog.source_count} complete audio-transcript pairs
            </Tag>
          </Col>
        </Row>
      </Card>

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

      {!loading && levels.length ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#374151' }}>
              1. Choose a difficulty level
            </Title>
          </div>
          <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
            {levels.map((level) => {
              const theme = levelTheme[level.id] || levelTheme.beginner;
              const isSelected = selectedLevelId === level.id;

              return (
                <Col xs={24} sm={8} key={level.id}>
                  <Card
                    hoverable
                    role="button"
                    tabIndex={0}
                    onClick={() => handleLevelSelect(level.id)}
                    onKeyDown={(event) => handleSelectableKeyDown(event, () => handleLevelSelect(level.id))}
                    style={{
                      borderRadius: 12,
                      border: isSelected ? `1px solid ${theme.color}` : '1px solid #e5e7eb',
                      boxShadow: isSelected ? `0 10px 30px ${theme.color}22` : 'none',
                      height: '100%',
                    }}
                    styles={{ body: { padding: 24, textAlign: 'center' } }}
                  >
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: theme.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      fontSize: 24,
                      color: theme.color,
                    }}>
                      <SoundOutlined />
                    </div>
                    <Title level={4} style={{ fontWeight: 600, marginBottom: 12 }}>
                      {level.label}
                    </Title>
                    <Tag color={isSelected ? 'processing' : 'default'} style={{ borderRadius: 12 }}>
                      {level.clip_count} practice clips
                    </Tag>
                    <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
                      {level.description}
                    </Text>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {selectedLevel ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#374151' }}>
                  2. Choose a scenario in {selectedLevel.label}
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
                        onClick={() => handleScenarioSelect(scenario.id)}
                        onKeyDown={(event) => handleSelectableKeyDown(
                          event,
                          () => handleScenarioSelect(scenario.id)
                        )}
                        style={{
                          borderRadius: 12,
                          border: isSelected ? `1px solid ${theme.color}` : '1px solid #e5e7eb',
                          boxShadow: isSelected ? `0 8px 24px ${theme.color}22` : 'none',
                          height: '100%',
                        }}
                        styles={{ body: { padding: 20 } }}
                      >
                        <div style={{
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
                        }}>
                          {scenarioIcons[scenario.id] || <SoundOutlined />}
                        </div>
                        <Title level={5} style={{ margin: '0 0 8px', fontWeight: 600 }}>
                          {scenario.label}
                        </Title>
                        <Tag color={isSelected ? 'processing' : 'default'} style={{ borderRadius: 12 }}>
                          {scenario.clip_count} clip{scenario.clip_count === 1 ? '' : 's'}
                        </Tag>
                        <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 13 }}>
                          {scenario.description}
                        </Text>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </>
          ) : null}

          {selectedScenario ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#374151' }}>
                  3. Choose a clip and start practicing
                </Title>
              </div>
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
                        Pick one clip below. You can switch materials anytime without leaving the page.
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
                            <Tag color="blue" style={{ borderRadius: 999 }}>{selectedLevel?.label}</Tag>
                            <Tag color="gold" style={{ borderRadius: 999 }}>{selectedScenario.label}</Tag>
                          </Space>
                          <Title level={4} style={{ marginTop: 0, marginBottom: 8, fontWeight: 600 }}>
                            {selectedClip.title}
                          </Title>
                          <Text type="secondary" style={{ display: 'block', marginBottom: 18 }}>
                            Start with the audio now. The question panel can plug into this clip later.
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
                      <Title level={5} style={{ marginTop: 0, fontWeight: 600 }}>
                        Questions are coming next
                      </Title>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                        This area is reserved for transcript-based listening questions that will be added later.
                      </Text>
                      <Paragraph style={{ margin: 0, color: '#4b5563' }}>
                        {selectedClip?.transcript_preview || 'Select a clip to preview its transcript snippet.'}
                      </Paragraph>
                    </Card>
                  </Space>
                </Col>
              </Row>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
