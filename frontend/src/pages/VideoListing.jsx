import React, { useState } from 'react';
import {
  Card,
  Col,
  Row,
  Tag,
  Typography,
  Button,
  Space,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  VideoCameraOutlined,
  BookOutlined,
  TeamOutlined,
  BulbOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';
import { roomAPI } from '../api';
import { videoCategories } from '../data/videos';

const { Title, Text, Paragraph } = Typography;

export default function VideoListing() {
  useLearningTimeTracker('listening', 'study_time:listening');
  const navigate = useNavigate();
  const [creatingRoom, setCreatingRoom] = useState(false);

  const handleVideoClick = (categoryId, videoId) => {
    navigate(`/listening/video/${categoryId}/${videoId}`);
  };

  const handleCreateWatchRoom = async () => {
    setCreatingRoom(true);
    try {
      const res = await roomAPI.create({
        name: 'Watch Together',
        room_type: 'watch',
        max_players: 4,
        visibility: 'public',
      });
      navigate(`/room/${res.data.room.id}/watch`, {
        state: { room: res.data.room, members: res.data.members },
      });
    } catch {
      // silently fail — user will see no navigation
    } finally {
      setCreatingRoom(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/listening')}
          style={{ width: 'fit-content', paddingInline: 0, marginBottom: 16 }}
        >
          Back to format selection
        </Button>
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <VideoCameraOutlined style={{ marginRight: 6, color: '#7c3aed' }} />
          Video Collection
        </Title>
        <Space style={{ marginTop: 8 }}>
          <Text type="secondary">
            Explore our curated video collection featuring Academic English lectures,
            seminar discussions, and study tips. Take notes while watching and share
            your insights in the forum.
          </Text>
          <Button
            icon={<TeamOutlined />}
            loading={creatingRoom}
            onClick={handleCreateWatchRoom}
          >
            Watch Together
          </Button>
        </Space>
      </div>

      <Space orientation="vertical" size={24} style={{ width: '100%' }}>
        {videoCategories.map((category) => (
          <Card
            key={category.id}
            style={{
              borderRadius: 16,
              border: '1px solid #e5e7eb',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} lg={6}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 16,
                    background: category.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    color: category.color,
                  }}
                >
                  {category.icon}
                </div>
              </Col>
              <Col xs={24} lg={18}>
                <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                  <Space wrap size={[8, 8]}>
                    <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                      {category.title}
                    </Title>
                    <Tag color="blue" style={{ borderRadius: 999 }}>
                      {category.videos.length} videos
                    </Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {category.description}
                  </Text>
                </Space>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              {category.videos.map((video) => (
                <Col xs={24} sm={12} lg={8} key={video.id}>
                  <Card
                    hoverable
                    role="button"
                    tabIndex={0}
                    onClick={() => handleVideoClick(category.id, video.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleVideoClick(category.id, video.id);
                      }
                    }}
                    style={{
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      height: '100%',
                    }}
                    styles={{ body: { padding: 20 } }}
                  >
                    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '16/9',
                          borderRadius: 12,
                          overflow: 'hidden',
                          position: 'relative',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      >
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {!video.thumbnail || video.thumbnail ? (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: video.thumbnail ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <PlayCircleOutlined
                              style={{
                                fontSize: 48,
                                color: 'rgba(255,255,255,0.9)',
                              }}
                            />
                          </div>
                        ) : null}
                        {video.thumbnail && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(0,0,0,0.2)',
                            }}
                          >
                            <PlayCircleOutlined
                              style={{
                                fontSize: 48,
                                color: 'rgba(255,255,255,0.9)',
                                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                              }}
                            />
                          </div>
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            background: 'rgba(0,0,0,0.7)',
                            padding: '4px 8px',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <ClockCircleOutlined />
                          {video.duration}
                        </div>
                      </div>
                      <Text strong style={{ fontSize: 14, color: '#1f2937' }}>
                        {video.title}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        ))}
      </Space>

      <Card
        style={{
          marginTop: 24,
          borderRadius: 16,
          border: '1px dashed #d1d5db',
          background: '#f9fafb',
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Empty
          description={
            <Space orientation="vertical" size={8}>
              <Text type="secondary">
                More video categories coming soon!
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Stay tuned for additional content including interviews, documentaries, and more.
              </Text>
            </Space>
          }
        />
      </Card>
    </div>
  );
}
