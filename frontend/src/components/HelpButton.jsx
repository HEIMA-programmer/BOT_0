import { useState } from 'react';
import { Button, Modal, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { helpGuides } from '../data/helpGuides';

const { Title, Paragraph } = Typography;

export default function HelpButton({ guideKey, bottomOffset = 32 }) {
  const [open, setOpen] = useState(false);
  const guide = helpGuides[guideKey];

  if (!guide) return null;

  return (
    <>
      <Button
        type="primary"
        shape="circle"
        icon={<QuestionCircleOutlined style={{ fontSize: 22 }} />}
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: bottomOffset,
          right: 32,
          zIndex: 100,
          width: 48,
          height: 48,
          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
          background: '#2563eb',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <Modal
        title={guide.title}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={560}
        centered
      >
        {guide.sections.map((section, index) => (
          <div key={index} style={{ marginBottom: index < guide.sections.length - 1 ? 20 : 0 }}>
            <Title level={5} style={{ marginBottom: 8, color: '#1a1a2e' }}>
              {section.heading}
            </Title>
            <Paragraph style={{ color: '#4b5563', whiteSpace: 'pre-line', margin: 0 }}>
              {section.body}
            </Paragraph>
          </div>
        ))}
      </Modal>
    </>
  );
}
