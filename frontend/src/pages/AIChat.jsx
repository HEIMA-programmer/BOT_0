import { Typography, Card, Row, Col } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function AIChat() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Title level={2}>AI Conversation Practice</Title>
      <Paragraph type="secondary">
        Practice academic discussions with AI in guided scenarios.
      </Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card hoverable>
            <RobotOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4}>Coming in Sprint 3</Title>
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              Engage in guided scenarios like Office Hours and Seminar Discussion with AI feedback.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
