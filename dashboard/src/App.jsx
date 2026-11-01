import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, Activity, AlertTriangle, Cpu, HardDrive, 
  CheckCircle, XCircle, ShieldAlert, Radio, RefreshCw, Lock, Zap,
  BarChart3, ShieldX, CheckCircle2, AlertOctagon
} from 'lucide-react';
import './App.css';

export default function App() {
  // Live Data States
  const [metrics, setMetrics] = useState(null);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [gatewayOnline, setGatewayOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // API Request Statistics (Recommendation #3)
  const [requestStats, setRequestStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    rateLimited429: 0
  });

  // Helper to record API request metrics
  const recordRequest = (status) => {
    setRequestStats(prev => ({
      ...prev,
      total: prev.total + 1,
      success: (status >= 200 && status < 300) ? prev.success + 1 : prev.success,
      failed: (status >= 500 || status === 0) ? prev.failed + 1 : prev.failed,
      rateLimited429: status === 429 ? prev.rateLimited429 + 1 : prev.rateLimited429
    }));
  };

  // Fetch live data from NGINX Gateway
  const fetchData = async () => {
    setLoading(true);
    let healthOk = false;

    // 1. Check Gateway /api/health
    try {
      const healthRes = await fetch('/api/health');
      recordRequest(healthRes.status);
      if (healthRes.ok) healthOk = true;
    } catch {
      recordRequest(0);
    }

    setGatewayOnline(healthOk);

    // 2. If Gateway is reachable, fetch metrics, devices, alerts
    if (healthOk) {
      try {
        const [mRes, dRes, aRes] = await Promise.all([
          fetch('/api/metrics'),
          fetch('/api/devices'),
          fetch('/api/alerts')
        ]);

        recordRequest(mRes.status);
        recordRequest(dRes.status);
        recordRequest(aRes.status);

        if (mRes.ok) setMetrics(await mRes.json());
        if (dRes.ok) {
          const dData = await dRes.json();
          setDevices(dData.devices || []);
        }
        if (aRes.ok) {
          const aData = await aRes.json();
          setAlerts(aData.alerts || []);
        }
      } catch (err) {
        console.error('Error parsing live API data:', err);
      }
    } else {
      // Clear data if gateway is offline so it doesn't show fake hardcoded data
      setMetrics(null);
      setDevices([]);
      setAlerts([]);
    }

    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  };

  // Simulate multiple fast requests to test rate limiting (429)
  const testRateLimitBurst = async () => {
    for (let i = 0; i < 12; i++) {
      fetch('/api/devices')
        .then(res => recordRequest(res.status))
        .catch(() => recordRequest(0));
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 6000); // Poll live API every 6 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="logo-group">
          <Radio size={24} color="#3b82f6" />
          <h2>Wipro Secure API Gateway — NMS Dashboard</h2>
        </div>

        <div className="header-actions">
          {/* Gateway Status Badge (Recommendation #5) */}
          <div className={`gateway-pill ${gatewayOnline ? 'online' : 'offline'}`}>
            <span className="dot"></span>
            <span>Gateway: {gatewayOnline ? 'ONLINE (:8080)' : 'OFFLINE (Unreachable)'}</span>
          </div>

          <span className="timestamp">Sync: {lastUpdated || 'Checking...'}</span>
          <button className="refresh-btn" onClick={fetchData} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Gateway Architecture & Security Banner (Recommendation #1 & #2) */}
        <div className="gateway-banner">
          <div className="banner-item">
            <Zap size={18} color="#3b82f6" />
            <span>Proxy: <strong>NGINX (:8080)</strong></span>
          </div>

          {/* Corrected to Pending/Testing for Person 2 */}
          <div className="banner-item">
            <Lock size={18} color="#94a3b8" />
            <span>Auth: <strong className="pending-badge">Pending (Person 2 - Branch person2-auth)</strong></span>
          </div>

          {/* Corrected to 5 req/sec with burst 10 */}
          <div className="banner-item">
            <Activity size={18} color="#10b981" />
            <span>Rate Limit: <strong>5 req/sec (Burst: 10)</strong></span>
          </div>
        </div>

        {/* API Request Telemetry Statistics (Recommendation #3) */}
        <div className="stats-strip">
          <div className="stats-header">
            <div className="stats-title">
              <BarChart3 size={18} color="#3b82f6" />
              <h4>API Gateway Request Telemetry</h4>
            </div>
            <button className="burst-btn" onClick={testRateLimitBurst} title="Send rapid requests to trigger 429 limit">
              <Zap size={14} />
              Simulate Burst Traffic (Test Rate Limit)
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-label">Total Requests</span>
              <span className="stat-num">{requestStats.total}</span>
            </div>
            <div className="stat-box success">
              <span className="stat-label"><CheckCircle2 size={14} /> Successful (200 OK)</span>
              <span className="stat-num">{requestStats.success}</span>
            </div>
            <div className="stat-box error">
              <span className="stat-label"><AlertOctagon size={14} /> Failed (Errors)</span>
              <span className="stat-num">{requestStats.failed}</span>
            </div>
            <div className="stat-box blocked">
              <span className="stat-label"><ShieldX size={14} /> 429 Rate Violations</span>
              <span className="stat-num">{requestStats.rateLimited429}</span>
            </div>
          </div>
        </div>

        {/* Offline Warning Banner if Gateway is unreachable */}
        {!gatewayOnline && (
          <div className="offline-alert">
            <AlertTriangle size={20} color="#f59e0b" />
            <div>
              <strong>Gateway Currently Unreachable at http://localhost:8080</strong>
              <p>Make sure Person 1's NGINX gateway and Flask backend are running. The dashboard will automatically update once connected.</p>
            </div>
          </div>
        )}

        {/* Metric Cards (Recommendation #4) */}
        <div className="grid-cards">
          <div className="metric-card">
            <div className="metric-header">
              <span>Total Devices</span>
              <Server size={20} color="#3b82f6" />
            </div>
            <div className="metric-value">{metrics ? metrics.total_devices : '—'}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Online Devices</span>
              <Activity size={20} color="#10b981" />
            </div>
            <div className="metric-value" style={{ color: '#10b981' }}>
              {metrics ? metrics.online_devices : '—'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Offline Devices</span>
              <AlertTriangle size={20} color="#ef4444" />
            </div>
            <div className="metric-value" style={{ color: '#ef4444' }}>
              {metrics ? metrics.offline_devices : '—'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Avg CPU Load</span>
              <Cpu size={20} color="#f59e0b" />
            </div>
            <div className="metric-value">{metrics ? `${metrics.average_cpu}%` : '—'}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Avg Memory Load</span>
              <HardDrive size={20} color="#8b5cf6" />
            </div>
            <div className="metric-value">{metrics ? `${metrics.average_memory}%` : '—'}</div>
          </div>
        </div>

        {/* Main Grid: Device Table + Alerts */}
        <div className="dashboard-grid">
          {/* Device Table */}
          <div className="panel device-panel">
            <h3>Live Network Device Inventory</h3>
            {devices.length === 0 ? (
              <p className="empty-message">No devices retrieved. Waiting for gateway connection...</p>
            ) : (
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
            )}
          </div>

          {/* Alerts Panel */}
          <div className="panel alerts-panel">
            <div className="panel-title-group">
              <ShieldAlert size={20} color="#ef4444" />
              <h3>Active Alerts ({alerts.length})</h3>
            </div>
            {alerts.length === 0 ? (
              <p className="empty-message">No active alerts reported.</p>
            ) : (
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}