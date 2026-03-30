import React from 'react';
import { DownOutlined, SoundOutlined } from '@ant-design/icons';
import { Button, Dropdown, Segmented, Space, Tooltip } from 'antd';
import { getWordAccentOption, WORD_ACCENT_OPTIONS } from '../hooks/useWordPronunciation';

export default function WordPronunciationControl({
  text,
  mode = 'compact',
  selectedAccent = 'us',
  onAccentChange,
  onSpeak,
  playLabel = 'Listen',
  size = 'middle',
  buttonType = 'text',
  buttonStyle,
  dropdownButtonStyle,
  showAccentLabel = true,
  disabled = false,
}) {
  const currentAccent = getWordAccentOption(selectedAccent);

  const handlePlay = (event, accentKey = currentAccent.key) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onSpeak?.(text, accentKey);
  };

  const menu = {
    items: WORD_ACCENT_OPTIONS.map((accent) => ({
      key: accent.key,
      label: accent.menuLabel,
    })),
    onClick: ({ key, domEvent }) => {
      domEvent?.preventDefault?.();
      domEvent?.stopPropagation?.();
      onAccentChange?.(key);
      onSpeak?.(text, key);
    },
  };

  if (mode === 'learning') {
    return (
      <Space orientation="vertical" size={10} style={{ alignItems: 'center', width: '100%' }}>
        <Segmented
          options={WORD_ACCENT_OPTIONS.map((accent) => ({
            label: accent.label,
            value: accent.key,
          }))}
          value={currentAccent.key}
          onChange={onAccentChange}
          size={size === 'small' ? 'small' : 'middle'}
        />
        <Button
          type={buttonType}
          size={size}
          icon={<SoundOutlined />}
          onClick={handlePlay}
          disabled={disabled}
          style={buttonStyle}
        >
          {showAccentLabel ? `${playLabel} (${currentAccent.shortLabel})` : playLabel}
        </Button>
      </Space>
    );
  }

  return (
    <span onClick={(event) => event.stopPropagation()}>
      <Space.Compact size={size}>
        <Tooltip title={`Listen in ${currentAccent.label} accent`}>
          <Button
            type={buttonType}
            size={size}
            icon={<SoundOutlined />}
            onClick={handlePlay}
            disabled={disabled}
            style={buttonStyle}
          >
            {showAccentLabel ? currentAccent.shortLabel : null}
          </Button>
        </Tooltip>
        <Dropdown menu={menu} trigger={['click']} disabled={disabled}>
          <Button
            type={buttonType}
            size={size}
            icon={<DownOutlined />}
            disabled={disabled}
            style={dropdownButtonStyle}
            aria-label={`Choose accent for ${text}`}
          />
        </Dropdown>
      </Space.Compact>
    </span>
  );
}
