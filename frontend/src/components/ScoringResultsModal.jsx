/**
 * Modal to display AI conversation scoring results from DeepSeek.
 */
import { Modal, Progress, Typography, Tag, Divider, Spin } from 'antd';
import {
  CheckCircleOutlined, ExclamationCircleOutlined,
  BulbOutlined, LoadingOutlined, TrophyOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const DIMENSION_COLORS = {
  grammar: '#3b82f6',
  vocabulary: '#8b5cf6',
  fluency: '#10b981',
  coherence: '#f59e0b',
  task_completion: '#ef4444',
};

const DIMENSION_LABELS = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  fluency: 'Fluency',
  coherence: 'Coherence',
  task_completion: 'Task Completion',
};

function getScoreColor(score) {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#3b82f6';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

export default function ScoringResultsModal({
  open,
  onClose,
  scores,
  scoringStatus,
}) {
  if (scoringStatus === 'scoring') {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={500}
      >
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
          <div style={{ marginTop: 24, fontSize: 16, fontWeight: 500, color: '#374151' }}>
            AI is evaluating your conversation...
          </div>
          <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 13 }}>
            This may take a few seconds
          </div>
        </div>
      </Modal>
    );
  }

  if (!scores) return null;

  const overallScore = scores.overall_score || 0;
  const dimensions = scores.dimensions || {};
  const strengths = scores.strengths || [];
  const improvements = scores.improvements || [];
  const suggestedPhrases = scores.suggested_phrases || [];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={640}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrophyOutlined style={{ color: '#f59e0b' }} />
          <span>Conversation Report</span>
        </div>
      }
    >
      {/* Overall Score */}
      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Progress
          type="circle"
          percent={overallScore * 10}
          format={() => (
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: getScoreColor(overallScore) }}>
                {overallScore}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>out of 10</div>
            </div>
          )}
          strokeColor={getScoreColor(overallScore)}
          size={120}
        />
      </div>

      {/* Dimension Scores */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 16 }}>Score Breakdown</Title>
        {Object.entries(dimensions).map(([key, dim]) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong style={{ fontSize: 13 }}>{DIMENSION_LABELS[key] || key}</Text>
              <Text style={{ color: getScoreColor(dim.score), fontWeight: 600 }}>
                {dim.score}/10
              </Text>
            </div>
            <Progress
              percent={dim.score * 10}
              showInfo={false}
              strokeColor={DIMENSION_COLORS[key] || '#3b82f6'}
              size="small"
            />
            {dim.feedback && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                {dim.feedback}
              </Text>
            )}
          </div>
        ))}
      </div>

      <Divider />

      {/* Strengths */}
      {strengths.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ color: '#10b981' }}>
            <CheckCircleOutlined style={{ marginRight: 8 }} />
            Strengths
          </Title>
          {strengths.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0' }}>
              <Tag color="green" style={{ borderRadius: 8, flexShrink: 0 }}>+</Tag>
              <Text style={{ fontSize: 13 }}>{item}</Text>
            </div>
          ))}
        </div>
      )}

      {/* Areas for Improvement */}
      {improvements.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ color: '#f59e0b' }}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            Areas for Improvement
          </Title>
          {improvements.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0' }}>
              <Tag color="orange" style={{ borderRadius: 8, flexShrink: 0 }}>!</Tag>
              <Text style={{ fontSize: 13 }}>{item}</Text>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Phrases */}
      {suggestedPhrases.length > 0 && (
        <div>
          <Title level={5} style={{ color: '#3b82f6' }}>
            <BulbOutlined style={{ marginRight: 8 }} />
            Useful Phrases to Practice
          </Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestedPhrases.map((phrase, i) => (
              <Tag key={i} color="blue" style={{ borderRadius: 8, padding: '4px 12px', fontSize: 13 }}>
                {phrase}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
