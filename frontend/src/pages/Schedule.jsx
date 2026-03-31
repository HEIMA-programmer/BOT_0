import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Button, Checkbox, InputNumber, Space, Divider, Empty, message, Layout, Menu, Calendar, Badge, Tag, Select, Input } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  CalendarOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

const moduleTypes = [
  { key: 'listening', label: 'Listening', color: '#d97706' },
  { key: 'speaking', label: 'Speaking', color: '#dc2626' },
  { key: 'vocabulary', label: 'Vocabulary', color: '#2563eb' },
];

const speakingScenarios = [
  { key: 'office_hours', label: 'Office Hours', scenarios: [
    { key: 'assignment_questions', label: 'Assignment Questions' },
    { key: 'discuss_grades', label: 'Discuss Grades' },
    { key: 'request_extension', label: 'Request Extension' },
    { key: 'research_guidance', label: 'Research Guidance' },
    { key: 'custom_scenario', label: 'Custom Scenario' },
  ]},
  { key: 'seminar_discussion', label: 'Seminar Discussion', scenarios: [
    { key: 'present_research', label: 'Present Research' },
    { key: 'paper_discussion', label: 'Paper Discussion' },
    { key: 'defend_thesis', label: 'Defend Thesis' },
    { key: 'brainstorming', label: 'Brainstorming' },
    { key: 'custom_scenario', label: 'Custom Scenario' },
  ]},
  { key: 'free_conversation', label: 'Free Conversation', scenarios: [] },
];

const listeningDifficulties = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

const listeningScenarios = [
  { key: 'lecture-clips', label: 'Lecture Clips' },
  { key: 'group-discussion', label: 'Group Discussion' },
  { key: 'qa-session', label: 'Q&A Session' },
  { key: 'office-hour', label: 'Office Hour' },
];

const listeningItemsByDifficulty = {
  beginner: {
    'lecture-clips': [
      { key: 'am-i-normal-trailer', label: 'Am I Normal Trailer' },
      { key: 'better-human-trailer', label: 'Better Human Trailer' },
      { key: 'rethinking-with-adam-grant-trailer', label: 'ReThinking With Adam Grant Trailer' },
      { key: 'ted-business-trailer', label: 'TED Business Trailer' },
      { key: 'ted-interview-s01e00-trailer', label: 'TED Interview S01E00 Trailer' },
      { key: 'your-undivided-attention-trailer', label: 'Your Undivided Attention Trailer' },
      { key: 'zigzag-s5-e00-trailer', label: 'ZigZag S5 E00 Trailer' },
      { key: 'fixable-trailer', label: 'Fixable Trailer' },
      { key: 'speed-and-scale-trailer', label: 'Speed and Scale Trailer' },
      { key: 'ted-ai-trailer', label: 'TED AI Trailer' },
    ],
    'group-discussion': [
      { key: 'best-foreign-city', label: 'Best (Foreign) City' },
      { key: 'best-way-to-learn-english', label: 'Best Way To Learn English' },
      { key: 'studying-alone-or-in-groups', label: 'Studying Alone or in Groups' },
      { key: 'what-athlete-do-you-admire', label: 'What Athlete Do You Admire' },
      { key: 'where-would-you-like-to-visit', label: 'Where Would You Like to Visit' },
    ],
    'qa-session': [
      { key: 'big-family', label: 'Big Family' },
      { key: 'dealing-with-mental-health', label: 'Dealing with Mental Health' },
      { key: 'slow-travel', label: 'Slow Travel' },
      { key: 'taking-care-of-physical-health', label: 'Taking Care of Physical Health' },
      { key: 'zen-life', label: 'Zen Life' },
    ],
    'office-hour': [
      { key: 'grades', label: 'Grades' },
      { key: 'letters-of-rec', label: 'Letters of Rec' },
      { key: 'student-vs-teacher', label: 'Student vs Teacher' },
      { key: 'teachers', label: 'Teachers' },
      { key: 'testing-students', label: 'Testing Students' },
    ],
  },
  intermediate: {
    'lecture-clips': [
      { key: 'am-i-normal-trailer', label: 'Am I Normal Trailer' },
      { key: 'better-human-trailer', label: 'Better Human Trailer' },
      { key: 'rethinking-with-adam-grant-trailer', label: 'ReThinking With Adam Grant Trailer' },
      { key: 'ted-business-trailer', label: 'TED Business Trailer' },
      { key: 'ted-interview-s01e00-trailer', label: 'TED Interview S01E00 Trailer' },
      { key: 'your-undivided-attention-trailer', label: 'Your Undivided Attention Trailer' },
      { key: 'zigzag-s5-e00-trailer', label: 'ZigZag S5 E00 Trailer' },
      { key: 'fixable-trailer', label: 'Fixable Trailer' },
      { key: 'speed-and-scale-trailer', label: 'Speed and Scale Trailer' },
      { key: 'ted-ai-trailer', label: 'TED AI Trailer' },
    ],
    'group-discussion': [
      { key: 'best-foreign-city', label: 'Best (Foreign) City' },
      { key: 'best-way-to-learn-english', label: 'Best Way To Learn English' },
      { key: 'studying-alone-or-in-groups', label: 'Studying Alone or in Groups' },
      { key: 'what-athlete-do-you-admire', label: 'What Athlete Do You Admire' },
      { key: 'where-would-you-like-to-visit', label: 'Where Would You Like to Visit' },
    ],
    'qa-session': [
      { key: 'big-family', label: 'Big Family' },
      { key: 'dealing-with-mental-health', label: 'Dealing with Mental Health' },
      { key: 'slow-travel', label: 'Slow Travel' },
      { key: 'taking-care-of-physical-health', label: 'Taking Care of Physical Health' },
      { key: 'zen-life', label: 'Zen Life' },
    ],
    'office-hour': [
      { key: 'grades', label: 'Grades' },
      { key: 'letters-of-rec', label: 'Letters of Rec' },
      { key: 'student-vs-teacher', label: 'Student vs Teacher' },
      { key: 'teachers', label: 'Teachers' },
      { key: 'testing-students', label: 'Testing Students' },
    ],
  },
  advanced: {
    'lecture-clips': [],
    'group-discussion': [],
    'qa-session': [],
    'office-hour': [],
  },
};

const menuItems = [
  { key: 'add', icon: <PlusCircleOutlined />, label: 'Add New Task' },
  { key: 'today', icon: <UnorderedListOutlined />, label: 'Today\'s Tasks' },
  { key: 'calendar', icon: <HistoryOutlined />, label: 'Calendar' },
];

export default function Schedule({ onClose }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('scheduleTasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });
  const [selectedTab, setSelectedTab] = useState('today');
  const [newTask, setNewTask] = useState({
    module: 'listening',
    difficulty: 'beginner',
    articleTitle: '',
    scenario: 'office_hours',
    scenarioType: 'assignment_questions',
    listeningType: 'lecture-clips',
    listeningItem: 'am-i-normal-trailer',
    topic: '',
    wordCount: 10,
    targetMinutes: 30,
  });

  useEffect(() => {
    localStorage.setItem('scheduleTasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const handleTaskCompleted = (event) => {
      const { taskId } = event.detail;
      if (taskId) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId 
              ? { ...task, completed: true, completedMinutes: task.targetMinutes }
              : task
          )
        );
        message.success('Task completed! 🎉');
      }
    };

    window.addEventListener('taskCompleted', handleTaskCompleted);

    return () => {
      window.removeEventListener('taskCompleted', handleTaskCompleted);
    };
  }, []);

  const handleAddTask = () => {
    let content = '';
    
    if (newTask.module === 'listening') {
      if (!newTask.listeningItem) {
        message.warning('Please select a listening item');
        return;
      }
      const scenarioInfo = listeningScenarios.find(s => s.key === newTask.listeningType);
      const items = listeningItemsByDifficulty[newTask.difficulty]?.[newTask.listeningType] || [];
      const itemInfo = items.find(i => i.key === newTask.listeningItem);
      const difficultyLabel = listeningDifficulties.find(d => d.key === newTask.difficulty)?.label || newTask.difficulty;
      content = `${scenarioInfo?.label || ''}: ${itemInfo?.label || ''} (${difficultyLabel})`;
    } else if (newTask.module === 'speaking') {
      if (!newTask.scenarioType) {
        message.warning('Please select a speaking scenario');
        return;
      }
      const scenarioInfo = speakingScenarios.find(s => s.key === newTask.scenario);
      const typeInfo = scenarioInfo?.scenarios?.find(s => s.key === newTask.scenarioType);
      content = `${scenarioInfo?.label || ''}: ${typeInfo?.label || ''}`;
    } else if (newTask.module === 'vocabulary') {
      content = `Learn ${newTask.wordCount} words`;
    }
    
    const task = {
      id: Date.now(),
      module: newTask.module,
      difficulty: newTask.difficulty,
      articleTitle: newTask.articleTitle,
      scenario: newTask.scenario,
      scenarioType: newTask.scenarioType,
      listeningType: newTask.listeningType,
      listeningItem: newTask.listeningItem,
      topic: newTask.topic,
      wordCount: newTask.wordCount,
      content,
      completed: false,
      completedMinutes: 0,
      createdAt: new Date().toISOString(),
      date: dayjs().format('YYYY-MM-DD'),
    };
    setTasks([...tasks, task]);
    setNewTask({
      module: 'listening',
      difficulty: 'beginner',
      articleTitle: '',
      scenario: 'office_hours',
      scenarioType: 'assignment_questions',
      listeningType: 'lecture-clips',
      listeningItem: 'am-i-normal-trailer',
      topic: '',
      wordCount: 10,
      targetMinutes: 30,
    });
    message.success('Task added successfully');
    setSelectedTab('today');
  };

  const handleToggleComplete = (taskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const newCompleted = !task.completed;
        return {
          ...task,
          completed: newCompleted,
          completedMinutes: newCompleted ? task.targetMinutes : 0,
        };
      }
      return task;
    }));
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    message.info('Task deleted');
  };

  const handleViewDetail = (task) => {
    if (task.module === 'listening') {
      navigate(`/listening/${task.listeningType}/${task.listeningItem}?difficulty=${task.difficulty}`, { 
        state: { taskId: task.id } 
      });
    } else if (task.module === 'speaking') {
      if (task.scenario === 'office_hours') {
        navigate(`/speaking/office-hours`, { 
          state: { taskId: task.id } 
        });
      } else if (task.scenario === 'seminar_discussion') {
        navigate(`/speaking/seminar-discussion`, { 
          state: { taskId: task.id } 
        });
      } else if (task.scenario === 'free_conversation') {
        navigate(`/speaking/free-conversation`, { 
          state: { taskId: task.id } 
        });
      } else {
        navigate(`/speaking/structured`, { 
          state: { taskId: task.id, type: task.scenarioType } 
        });
      }
    } else if (task.module === 'vocabulary') {
      navigate(`/daily-words/${task.wordCount}`, { 
        state: { taskId: task.id } 
      });
    }
    
    if (onClose) {
      onClose();
    }
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedTask(null);
  };

  const getModuleInfo = (moduleKey) => {
    return moduleTypes.find(m => m.key === moduleKey) || moduleTypes[0];
  };

  const todayTasks = tasks.filter(t => t.date === dayjs().format('YYYY-MM-DD'));
  const completedCount = todayTasks.filter(t => t.completed).length;
  const totalCount = todayTasks.length;

  const getTasksByDate = (date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return tasks.filter(t => t.date === dateStr);
  };

  const dateCellRender = (value) => {
    const tasksForDate = getTasksByDate(value);
    const completedCount = tasksForDate.filter(t => t.completed).length;
    
    return (
      <div style={{ fontSize: 12, lineHeight: '16px' }}>
        {tasksForDate.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <Badge 
              count={completedCount} 
              showZero 
              size="small" 
              style={{ backgroundColor: '#52c41a', marginRight: 4 }}
            />
            <span style={{ color: '#8c8c8c' }}>/ {tasksForDate.length}</span>
          </div>
        )}
      </div>
    );
  };

  const renderAddTask = () => (
    <div>
      <Title level={4} style={{ marginBottom: 24, fontWeight: 600 }}>
        Add New Task
      </Title>
      <Card style={{ borderRadius: 12 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Module:</Text>
            <Space>
              {moduleTypes.map(module => (
                <Button
                  key={module.key}
                  type={newTask.module === module.key ? 'primary' : 'default'}
                  size="large"
                  onClick={() => setNewTask({ ...newTask, module: module.key })}
                  style={{
                    background: newTask.module === module.key ? module.color : undefined,
                    borderColor: module.color,
                  }}
                >
                  {module.label}
                </Button>
              ))}
            </Space>
          </div>

          {newTask.module === 'listening' && (
            <>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>Difficulty:</Text>
                <Select
                  value={newTask.difficulty}
                  onChange={(value) => {
                    const firstScenario = listeningScenarios[0]?.key || 'lecture_clips';
                    const firstItem = listeningItemsByDifficulty[value]?.[firstScenario]?.[0]?.key || '';
                    setNewTask({ 
                      ...newTask, 
                      difficulty: value,
                      listeningType: firstScenario,
                      listeningItem: firstItem,
                    });
                  }}
                  style={{ width: '100%' }}
                  size="large"
                  options={listeningDifficulties.map(d => ({
                    label: d.label,
                    value: d.key,
                  }))}
                />
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>Listening Type:</Text>
                <Select
                  value={newTask.listeningType}
                  onChange={(value) => {
                    const firstItem = listeningItemsByDifficulty[newTask.difficulty]?.[value]?.[0]?.key || '';
                    setNewTask({ 
                      ...newTask, 
                      listeningType: value,
                      listeningItem: firstItem,
                    });
                  }}
                  style={{ width: '100%' }}
                  size="large"
                  options={listeningScenarios.map(s => ({
                    label: s.label,
                    value: s.key,
                  }))}
                />
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>Select Item:</Text>
                <Select
                  value={newTask.listeningItem}
                  onChange={(value) => setNewTask({ ...newTask, listeningItem: value })}
                  style={{ width: '100%' }}
                  size="large"
                  options={listeningItemsByDifficulty[newTask.difficulty]?.[newTask.listeningType]?.map(item => ({
                    label: item.label,
                    value: item.key,
                  })) || []}
                />
              </div>
            </>
          )}

          {newTask.module === 'speaking' && (
            <>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>Scenario Type:</Text>
                <Select
                  value={newTask.scenario}
                  onChange={(value) => {
                    setNewTask({ 
                      ...newTask, 
                      scenario: value, 
                      scenarioType: speakingScenarios.find(s => s.key === value)?.scenarios?.[0]?.key || '',
                    });
                  }}
                  style={{ width: '100%' }}
                  size="large"
                  options={speakingScenarios.map(s => ({
                    label: s.label,
                    value: s.key,
                  }))}
                />
              </div>
              {newTask.scenario && (
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 12 }}>Select Scenario:</Text>
                  <Select
                    value={newTask.scenarioType}
                    onChange={(value) => setNewTask({ ...newTask, scenarioType: value })}
                    style={{ width: '100%' }}
                    size="large"
                    options={speakingScenarios.find(s => s.key === newTask.scenario)?.scenarios?.map(item => ({
                      label: item.label,
                      value: item.key,
                    })) || []}
                  />
                </div>
              )}
            </>
          )}

          {newTask.module === 'vocabulary' && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Word Count:</Text>
              <InputNumber
                min={1}
                max={100}
                value={newTask.wordCount}
                onChange={(value) => setNewTask({ ...newTask, wordCount: value || 10 })}
                style={{ width: '100%' }}
                size="large"
              />
            </div>
          )}

          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Target Duration (minutes):</Text>
            <InputNumber
              min={1}
              max={300}
              value={newTask.targetMinutes}
              onChange={(value) => setNewTask({ ...newTask, targetMinutes: value || 30 })}
              style={{ width: '100%', fontSize: 16 }}
              size="large"
            />
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddTask}
            size="large"
            style={{ width: '100%', height: 48 }}
          >
            Add Task
          </Button>
        </Space>
      </Card>
    </div>
  );

  const renderTodayTasks = () => (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
        borderRadius: 16,
        padding: '32px 40px',
        marginBottom: 24,
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <CalendarOutlined style={{ fontSize: 32 }} />
          <div>
            <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
              Today's Tasks
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              {dayjs().format('MMMM D, YYYY')}
            </Text>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Progress: {completedCount} / {totalCount} tasks completed
          </Text>
          <div style={{
            height: 8,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 4,
            marginTop: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
              background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      {todayTasks.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '60px 20px' }}>
          <Empty
            description="No tasks for today. Add your first learning goal!"
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelectedTab('add')}>
            Add New Task
          </Button>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {todayTasks.map(task => {
            const moduleInfo = getModuleInfo(task.module);
            return (
              <Col xs={24} sm={12} lg={8} key={task.id}>
                <Card
                  hoverable
                  onClick={() => handleViewDetail(task)}
                  style={{
                    height: '100%',
                    borderRadius: 12,
                    borderLeft: `4px solid ${moduleInfo.color}`,
                    opacity: task.completed ? 0.6 : 1,
                    cursor: 'pointer',
                  }}
                  styles={{ body: { padding: 20 } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: `${moduleInfo.color}15`,
                      color: moduleInfo.color,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {moduleInfo.label}
                    </div>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                    />
                  </div>
                  <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
                    {task.content}
                  </Text>
                  {task.module === 'listening' && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Tag color={task.difficulty === 'easy' ? '#52c41a' : task.difficulty === 'medium' ? '#faad14' : '#ff4d4f'}>
                        {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {task.articleTitle}
                      </Text>
                    </div>
                  )}
                  {task.module === 'speaking' && (
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                      Topic: {task.topic}
                    </Text>
                  )}
                  {task.module === 'vocabulary' && (
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                      {task.wordCount} words
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Target: {task.targetMinutes} minutes
                  </Text>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Checkbox
                      checked={task.completed}
                      onChange={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(task.id);
                      }}
                      style={{ fontSize: 14 }}
                    >
                      {task.completed ? 'Completed' : 'Mark as completed'}
                    </Checkbox>
                    {task.completed ? (
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 20 }} />
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );

  const renderCalendar = () => (
    <div>
      <Title level={4} style={{ marginBottom: 24, fontWeight: 600 }}>
        Calendar Overview
      </Title>
      <Card style={{ borderRadius: 12 }}>
        <Calendar
          cellRender={dateCellRender}
          style={{ width: '100%' }}
        />
      </Card>
      
      <Title level={5} style={{ marginTop: 32, marginBottom: 16, fontWeight: 600 }}>
        Task History
      </Title>
      <Card style={{ borderRadius: 12 }}>
        {tasks.length === 0 ? (
          <Empty description="No tasks yet" />
        ) : (
          <div>
            {tasks.slice().reverse().map(task => {
              const moduleInfo = getModuleInfo(task.module);
              return (
                <div 
                  key={task.id} 
                  style={{
                    padding: '16px 0',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleViewDetail(task)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: `${moduleInfo.color}15`,
                          color: moduleInfo.color,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {moduleInfo.label}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(task.createdAt).format('MMM D, YYYY')}
                        </Text>
                      </div>
                      <Text strong style={{ fontSize: 14 }}>
                        {task.content}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.completed ? (
                        <Badge status="success" text="Completed" />
                      ) : (
                        <Badge status="default" text="Pending" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <>
      <Layout style={{ background: 'transparent', height: '80vh' }}>
        <Sider width={240} style={{ background: '#fff', borderRadius: '12px 0 0 12px' }}>
          <div style={{ padding: '24px 16px' }}>
            <Title level={4} style={{ marginBottom: 24, fontWeight: 700, color: '#1a1a2e' }}>
              Schedule
            </Title>
            <Menu
              mode="inline"
              selectedKeys={[selectedTab]}
              items={menuItems}
              onClick={({ key }) => setSelectedTab(key)}
              style={{ border: 'none' }}
            />
          </div>
        </Sider>
        <Content style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {selectedTab === 'add' && renderAddTask()}
          {selectedTab === 'today' && renderTodayTasks()}
          {selectedTab === 'calendar' && renderCalendar()}
        </Content>
      </Layout>
    </>
  );
}
