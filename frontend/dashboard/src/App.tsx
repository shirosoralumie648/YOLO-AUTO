import { Layout, Menu } from 'antd';
import YoloVersionList from './components/YoloVersionList';
import './App.css';

const { Header, Content, Footer } = Layout;

const App = () => (
  <Layout className="layout">
    <Header>
      <div className="logo" />
      <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['1']}>
        <Menu.Item key="1">Version Registry</Menu.Item>
      </Menu>
    </Header>
    <Content style={{ padding: '0 50px' }}>
      <div className="site-layout-content" style={{ background: '#fff', padding: 24, minHeight: 280, marginTop: 24 }}>
        <YoloVersionList />
      </div>
    </Content>
    <Footer style={{ textAlign: 'center' }}>YOLO-AUTO 2025 Created by Windsurf AI</Footer>
  </Layout>
);

export default App;
