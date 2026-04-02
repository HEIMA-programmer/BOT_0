import React from 'react';
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

const { Title, Text, Paragraph } = Typography;

const videoCategories = [
  {
    id: 'academic-english',
    title: 'Academic English: ABC Education',
    icon: <BookOutlined />,
    color: '#2563eb',
    bg: '#eff6ff',
    description: 'Lectures and presentations from university courses, covering various academic subjects.',
    videos: [
      { 
        id: 1, 
        title: 'New Learn English series: Academic English', 
        duration: '00:30', 
        thumbnail: 'https://i.ytimg.com/vi/nUNc3SrCBSg/maxresdefault.jpg', 
        url: 'https://www.youtube.com/watch?v=nUNc3SrCBSg' 
      },
      { 
        id: 2, 
        title: 'Academic English: Learning Academic Vocabulary', 
        duration: '10:04', 
        thumbnail: 'https://i.ytimg.com/vi/bMEMqjrupHk/maxresdefault.jpg', 
        url: 'https://youtu.be/bMEMqjrupHk?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
      { 
        id: 3, 
        title: 'Academic English: Vocabulary For Describing Data', 
        duration: '10:54', 
        thumbnail: 'https://i.ytimg.com/vi/xl-nuzBnRLU/maxresdefault.jpg', 
        url: 'https://youtu.be/xl-nuzBnRLU?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
      { 
        id: 4, 
        title: 'Academic English: Linking Words', 
        duration: '7:31', 
        thumbnail: 'https://i.ytimg.com/vi/qJ9kCO8-Vss/maxresdefault.jpg', 
        url: 'https://youtu.be/qJ9kCO8-Vss?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
      { 
        id: 5, 
        title: 'Academic English: Using Verbs To Express Opinions', 
        duration: '6:41', 
        thumbnail: 'https://i.ytimg.com/vi/KU9sIgK3-Nc/maxresdefault.jpg', 
        url: 'https://youtu.be/KU9sIgK3-Nc?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
      { 
        id: 6, 
        title: 'Academic English: Making Comparisons', 
        duration: '9:17', 
        thumbnail: 'https://i.ytimg.com/vi/8M7R2_U3OsI/maxresdefault.jpg', 
        url: 'https://youtu.be/8M7R2_U3OsI?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
      { 
        id: 7, 
        title: 'Academic English: Paragraphing for Essays', 
        duration: '11:52', 
        thumbnail: 'https://i.ytimg.com/vi/dUglbHyPDz0/maxresdefault.jpg', 
        url: 'https://youtu.be/dUglbHyPDz0?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
      { 
        id: 8, 
        title: 'Academic English: Passive Voice', 
        duration: '9:55', 
        thumbnail: 'https://i.ytimg.com/vi/oLo8I3Hn_1M/maxresdefault.jpg', 
        url: 'https://youtu.be/oLo8I3Hn_1M?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6'  
      },
      { 
        id: 9, 
        title: 'Academic English: Introduction and Conclusion in Essays', 
        duration: '8:19', 
        thumbnail: 'https://i.ytimg.com/vi/hU_lfd4gxjA/maxresdefault.jpg', 
        url: 'https://youtu.be/hU_lfd4gxjA?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6'
      },
      { 
        id: 10, 
        title: 'Academic English: Listening For Meaning', 
        duration: '9:02', 
        thumbnail: 'https://i.ytimg.com/vi/QUFthHGrRHo/maxresdefault.jpg?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6', 
        url: 'https://youtu.be/QUFthHGrRHo?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6'
      },
      { 
        id: 11, 
        title: 'Academic English: Listening For Note Taking', 
        duration: '9:08', 
        thumbnail: 'https://i.ytimg.com/vi/Bhx4mi649YQ/maxresdefault.jpg', 
        url: 'https://youtu.be/Bhx4mi649YQ?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
      { 
        id: 12, 
        title: 'Academic English: Reading Strategies For Academic Texts', 
        duration: '7:22', 
        thumbnail: 'https://i.ytimg.com/vi/myuu96ah0mk/maxresdefault.jpg', 
        url: 'https://youtu.be/myuu96ah0mk?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
      { 
        id: 13, 
        title: 'Academic English: Answering True Or False Questions', 
        duration: '7:49', 
        thumbnail: 'https://i.ytimg.com/vi/RYt9fGawn5w/maxresdefault.jpg', 
        url: 'https://youtu.be/RYt9fGawn5w?list=PL0wWwf_rAjWZqXY8NR0nnY5S3sz-6yAb6' 
      },
    ],
  },
];

export default function VideoListing() {
  useLearningTimeTracker('listening', 'study_time:listening');
  const navigate = useNavigate();

  const handleVideoClick = (categoryId, videoId) => {
    navigate(`/listening/video/${categoryId}/${videoId}`);
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
        <Text type="secondary">
          Explore our curated video collection featuring Academic English lectures,
          seminar discussions, and study tips. Take notes while watching and share
          your insights in the forum.
        </Text>
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
