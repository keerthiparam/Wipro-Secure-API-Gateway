import React, { useState, useEffect } from 'react';
import { 
  Server, Activity, AlertTriangle, Cpu, HardDrive, 
  CheckCircle, XCircle, ShieldAlert, Radio, RefreshCw, Lock, Zap 
} from 'lucide-react';
import './App.css';

export default function App() {
  const [metrics, setMetrics] = useState({
    total_devices: 4,
    online_devices: 3,
    offline_devices: 1,
    average_cpu: 35.25,
    average_memory: 46.75
  });

  const [devices, setDevices] = useState([
    { id: "R001", name: "Core Router", type: "Router", ip: "192.168.1.1", status: "Online", cpu: 42, memory: 65 },
    { id: "S001", name: "Access Switch", type: "Switch", ip: "192.168.1.2", status: "Online", cpu: 28, memory: 40 },
    { id: "F001", name: "Main Firewall", type: "Firewall", ip: "192.168.1.3", status: "Offline", cpu: 0, memory: 0 },
    { id: "R002", name: "Branch Router", type: "Router", ip: "192.168.1.4", status: "Online", cpu: 71, memory: 82 }
  ]);

  const [alerts, setAlerts] = useState([
    { device_id: "F001", device_name: "Main Firewall", severity: "Critical", message: "Device is offline" },
    { device_id: "R002", device_name: "Branch Router", severity: "Warning", message: "High CPU utilization" }
  ]);

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  // Fetch live data from NGINX Gateway (port 8080)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, dRes, aRes] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/devices'),
        fetch('/api/alerts')
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (dRes.ok) {
        const data = await dRes.json();
        setDevices(data.devices || []);
      }
      if (aRes.ok) {
        const data = await aRes.json();
        setAlerts(data.alerts || []);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.log('Connecting to gateway...', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 8000); // auto-refresh every 8s
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="navbar">
        <div className="logo-group">
          <Radio size={24} color="#3b82f6" />
          <h2>Wipro Secure API Gateway — NMS Dashboard</h2>
        </div>
        <div className="header-actions">
          <span className="timestamp">Last sync: {lastUpdated}</span>
          <button className="refresh-btn" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Metric Cards */}
        <div className="grid-cards">
          <div className="metric-card">
            <div className="metric-header">
              <span>Total Devices</span>
              <Server size={20} color="#3b82f6" />
            </div>
            <div className="metric-value">{metrics.total_devices}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Online Devices</span>
              <Activity size={20} color="#10b981" />
            </div>
            <div className="metric-value" style={{ color: '#10b981' }}>{metrics.online_devices}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Offline Devices</span>
              <AlertTriangle size={20} color="#ef4444" />
            </div>
            <div className="metric-value" style={{ color: '#ef4444' }}>{metrics.offline_devices}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Avg CPU Load</span>
              <Cpu size={20} color="#f59e0b" />
            </div>
            <div className="metric-value">{metrics.average_cpu}%</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Avg Memory Load</span>
              <HardDrive size={20} color="#8b5cf6" />
            </div>
            <div className="metric-value">{metrics.average_memory}%</div>
          </div>
        </div>

        {/* Gateway Security Banner */}
        <div className="gateway-banner">
          <div className="banner-item">
            <Zap size={18} color="#3b82f6" />
            <span>Gateway: <strong>NGINX Reverse Proxy (:8080)</strong></span>
          </div>
          <div className="banner-item">
            <Lock size={18} color="#10b981" />
            <span>Security: <strong>OAuth2 / Bearer JWT</strong></span>
          </div>
          <div className="banner-item">
            <Activity size={18} color="#f59e0b" />
            <span>Rate Limiting: <strong>10 req/sec</strong></span>
          </div>
        </div>

        {/* Main Grid: Device Table + Alerts */}
        <div className="dashboard-grid">
          {/* Device Table */}
          <div className="panel device-panel">
            <h3>Network Device Inventory</h3>
            <table className="device-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Device Name</th>
                  <th>Type</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>CPU Load</th>
                  <th>Memory</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.id}</strong></td>
                    <td>{d.name}</td>
                    <td><span className="type-badge">{d.type}</span></td>
                    <td><code>{d.ip}</code></td>
                    <td>
                      <span className={`status-badge ${d.status === 'Online' ? 'online' : 'offline'}`}>
                        {d.status === 'Online' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {d.status}
                      </span>
                    </td>
                    <td>
                      <div className="progress-wrapper">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${d.cpu}%`, 
                            backgroundColor: d.cpu > 70 ? '#ef4444' : '#10b981' 
                          }} 
                        />
                        <span>{d.cpu}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="progress-wrapper">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${d.memory}%`, 
                            backgroundColor: d.memory > 75 ? '#f59e0b' : '#3b82f6' 
                          }} 
                        />
                        <span>{d.memory}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alerts Panel */}
          <div className="panel alerts-panel">
            <div className="panel-title-group">
              <ShieldAlert size={20} color="#ef4444" />
              <h3>Active Alerts ({alerts.length})</h3>
            </div>
            <div className="alerts-list">
              {alerts.map((a, i) => (
                <div key={i} className={`alert-box ${a.severity.toLowerCase()}`}>
                  <div className="alert-badge">{a.severity}</div>
                  <div className="alert-text">
                    <strong>{a.device_name} ({a.device_id})</strong>
                    <p>{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}