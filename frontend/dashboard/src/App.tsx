import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import './App.css';
import YoloVersionList from './components/YoloVersionList';
import YoloModuleList from './components/YoloModuleList';

const { Header, Content, Footer } = Layout;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('versions');

  const menuItems = [
    { key: 'versions', label: 'Version Registry' },
    { key: 'modules', label: 'Module Registry' },
  ];

  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header>
        <div className="logo">YOLO-AUTO</div>
        <Menu
          theme="dark"
          mode="horizontal"
          onClick={(e) => setCurrentView(e.key)}
          selectedKeys={[currentView]}
          items={menuItems}
        />
      </Header>
      <Content style={{ padding: '0 50px' }}>
        <div className="site-layout-content" style={{ background: '#fff', padding: 24, minHeight: 'calc(100vh - 188px)', marginTop: 24 }}>
          {currentView === 'versions' && <YoloVersionList />}
          {currentView === 'modules' && <YoloModuleList />}
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>YOLO-AUTO 2025 Created by Windsurf AI</Footer>
    </Layout>
  );
};

export default App;
