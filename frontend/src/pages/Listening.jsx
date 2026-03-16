import { Typography, Card, Tag, Row, Col } from 'antd';
import { SoundOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function Listening() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Title level={2}>Listening Lab</Title>
      <Paragraph type="secondary">
        Practice listening to academic lectures and answer comprehension questions.
      </Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card hoverable>
            <SoundOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4}>Coming in Sprint 2</Title>
            <Tag color="orange">Beginner</Tag>
            <Tag color="blue">Intermediate</Tag>
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              Listen to lecture clips and answer AI-generated comprehension questions.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
