import { Modal, Typography } from 'antd';

const { Text } = Typography;

export default function LeaveModal({ open, isHost, onConfirm, onCancel }) {
  return (
    <Modal
      title="Leave Room?"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Leave"
      okButtonProps={{ danger: true }}
      width={360}
    >
      <Text>
        {isHost
          ? 'You are the host. Leaving will end the session for everyone.'
          : 'Are you sure you want to leave the session?'}
      </Text>
    </Modal>
  );
}
