/**
 * Voice selector for Gemini Live API prebuilt voices.
 */
import { Radio, Typography } from 'antd';
import { SoundOutlined } from '@ant-design/icons';

const { Text } = Typography;

const VOICES = [
  { name: 'Puck', desc: 'Friendly, youthful male voice', gender: 'M' },
  { name: 'Charon', desc: 'Deep, authoritative male voice', gender: 'M' },
  { name: 'Kore', desc: 'Clear, professional female voice', gender: 'F' },
  { name: 'Fenrir', desc: 'Strong, confident male voice', gender: 'M' },
  { name: 'Aoede', desc: 'Warm, melodic female voice', gender: 'F' },
  { name: 'Leda', desc: 'Soft, gentle female voice', gender: 'F' },
  { name: 'Orus', desc: 'Calm, measured male voice', gender: 'M' },
  { name: 'Zephyr', desc: 'Bright, energetic neutral voice', gender: 'N' },
];

export default function VoiceSelector({ value, onChange }) {
  const selected = value || localStorage.getItem('preferred_voice') || 'Puck';

  const handleChange = (e) => {
    const voice = e.target.value;
    localStorage.setItem('preferred_voice', voice);
    onChange?.(voice);
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SoundOutlined style={{ color: '#3b82f6' }} />
        <Text strong style={{ fontSize: 14 }}>Choose AI Voice</Text>
      </div>
      <Radio.Group
        value={selected}
        onChange={handleChange}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        {VOICES.map(v => (
          <Radio.Button
            key={v.name}
            value={v.name}
            style={{
              height: 'auto',
              padding: '8px 16px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {v.name}
                <span style={{
                  fontSize: 10,
                  marginLeft: 6,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: v.gender === 'F' ? '#fce7f3' : v.gender === 'M' ? '#dbeafe' : '#f3e8ff',
                  color: v.gender === 'F' ? '#be185d' : v.gender === 'M' ? '#1d4ed8' : '#7c3aed',
                }}>
                  {v.gender === 'F' ? 'Female' : v.gender === 'M' ? 'Male' : 'Neutral'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{v.desc}</div>
            </div>
          </Radio.Button>
        ))}
      </Radio.Group>
    </div>
  );
}
