import { Typography, Card, Row, Col } from 'antd';
import { AudioOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function Speaking() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Title level={2}>Speaking Studio</Title>
      <Paragraph type="secondary">
        Practice pronunciation and structured academic expression.
      </Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card hoverable>
            <AudioOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4}>Coming in Sprint 2</Title>
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              Record your voice, get pronunciation feedback, and practice following along with sentences.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
