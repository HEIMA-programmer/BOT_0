import { Typography } from 'antd';

const { Text } = Typography;

export default function ErrorBanners({ joinError, permissionWarning }) {
  return (
    <>
      {joinError && (
        <div style={{
          background: '#7f1d1d', padding: '8px 24px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid #991b1b', flexShrink: 0,
        }}>
          <Text style={{ color: '#fca5a5', fontSize: 13 }}>
            {String(joinError).includes('token') || String(joinError).includes('key')
              ? 'Connection authentication failed. Please refresh the page.'
              : String(joinError).includes('network') || String(joinError).includes('timeout')
                ? 'Network error. Check your internet connection and try again.'
                : 'Media connection failed — video/audio will not work. Try refreshing the page.'}
          </Text>
        </div>
      )}

      {permissionWarning && !joinError && (
        <div style={{
          background: '#78350f', padding: '8px 24px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid #92400e', flexShrink: 0,
        }}>
          <Text style={{ color: '#fde68a', fontSize: 13 }}>
            {permissionWarning}
          </Text>
        </div>
      )}
    </>
  );
}
