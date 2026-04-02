import { Modal, Tag } from 'antd';
import { TOPICS } from '../../../utils/roomUtils';

export default function TopicModal({ open, topic, onSelect, onCancel }) {
  return (
    <Modal title="Select Topic" open={open} onCancel={onCancel} footer={null} width={400}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
        {TOPICS.map(t => (
          <Tag
            key={t}
            color={topic === t ? 'blue' : 'default'}
            style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 13, borderRadius: 6 }}
            onClick={() => onSelect(t)}
          >
            {t}
          </Tag>
        ))}
      </div>
    </Modal>
  );
}
