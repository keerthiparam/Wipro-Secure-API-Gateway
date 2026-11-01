
import React, { useState, useEffect, useRef } from 'react';
import {
  Server, Activity, AlertTriangle, Cpu, HardDrive,
  CheckCircle, XCircle, ShieldAlert, Radio, RefreshCw, Lock, Zap,
  BarChart3, ShieldX, CheckCircle2, AlertOctagon
} from 'lucide-react';
import './App.css';

export default function App() {
  // Live NMS Data
  const [metrics, setMetrics] = useState(null);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [gatewayOnline, setGatewayOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // Real NGINX Monitoring Statistics
  const [monitoring, setMonitoring] = useState(null);
  const [burstRunning, setBurstRunning] = useState(false);
  const [burstResult, setBurstResult] = useState(null);
  const burstInProgress = useRef(false);

  // Small delay helper used when NGINX is still processing burst traffic.
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Fetch monitoring separately with retries: immediately after a burst,
  // this endpoint itself may briefly receive HTTP 429 from the rate limiter.
  const fetchMonitoringWithRetry = async (attempts = 4) => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const response = await fetch('/api/monitoring');
      if (response.status !== 429) {
        if (!response.ok) throw new Error(`Monitoring API returned ${response.status}`);
        return response.json();
      }
      await wait(700 * (attempt + 1));
    }
    throw new Error('Monitoring API remained rate-limited after retries');
  };

  // Fetch live data through the authenticated Vite proxy. A 429 on an API
  // endpoint means that request was throttled; it does NOT mean the gateway is offline.
  const fetchData = async () => {
    if (burstInProgress.current) return;

    setLoading(true);
    try {
      const healthRes = await fetch('/api/health');
      if (!healthRes.ok) {
        throw new Error(`Gateway health check returned ${healthRes.status}`);
      }
      setGatewayOnline(true);

      const [mRes, dRes, aRes] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/devices'),
        fetch('/api/alerts')
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      else if (mRes.status !== 429) console.error('Metrics API failed:', mRes.status);

      if (dRes.ok) {
        const dData = await dRes.json();
        setDevices(dData.devices || []);
      } else if (dRes.status !== 429) {
        console.error('Devices API failed:', dRes.status);
      }

      if (aRes.ok) {
        const aData = await aRes.json();
        setAlerts(aData.alerts || []);
      } else if (aRes.status !== 429) {
        console.error('Alerts API failed:', aRes.status);
      }

      try {
        const stats = await fetchMonitoringWithRetry();
        setMonitoring(stats);
      } catch (monitorError) {
        console.warn('Could not refresh NGINX monitoring yet:', monitorError.message);
      }
    } catch (err) {
      console.error('Gateway/API error:', err);
      setGatewayOnline(false);
      setMetrics(null);
      setDevices([]);
      setAlerts([]);
    } finally {
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
    }
  };

  // Send a deliberately concurrent burst and report the actual HTTP results.
  // 30 requests make the 5r/s + burst=10 policy visible in the UI.
  const testRateLimitBurst = async () => {
    if (burstInProgress.current) return;

    burstInProgress.current = true;
    setBurstRunning(true);
    setBurstResult(null);

    try {
      const results = await Promise.all(
        Array.from({ length: 30 }, async () => {
          try {
            const response = await fetch('/api/devices', { cache: 'no-store' });
            return response.status;
          } catch (error) {
            console.error('Burst request failed:', error);
            return 0;
          }
        })
      );

      const summary = {
        sent: results.length,
        successful: results.filter(status => status >= 200 && status < 300).length,
        rateLimited: results.filter(status => status === 429).length,
        unauthorized: results.filter(status => status === 401).length,
        other: results.filter(status => status !== 0 && status !== 429 && status !== 401 && !(status >= 200 && status < 300)),
        networkErrors: results.filter(status => status === 0).length
      };
      setBurstResult(summary);
    } finally {
      // Let NGINX's rate-limit bucket recover before polling protected APIs.
      await wait(1500);
      burstInProgress.current = false;
      setBurstRunning(false);
      await fetchData();
    }
  };

  // Initial fetch and automatic refresh every 6 seconds
  useEffect(() => {
    fetchData();

    const timer = setInterval(fetchData, 6000);

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

          <div className={`gateway-pill ${gatewayOnline ? 'online' : 'offline'}`}>
            <span className="dot"></span>
            <span>
              Gateway: {gatewayOnline ? 'ONLINE (:8080)' : 'OFFLINE (Unreachable)'}
            </span>
          </div>

          <span className="timestamp">
            Sync: {lastUpdated || 'Checking...'}
          </span>

          <button
            className="refresh-btn"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? 'spinning' : ''}
            />
            Refresh
          </button>

        </div>
      </header>

      <main className="dashboard-content">

        {/* Gateway Architecture and Security Banner */}
        <div className="gateway-banner">

          <div className="banner-item">
            <Zap size={18} color="#3b82f6" />
            <span>
              Proxy: <strong>NGINX (:8080)</strong>
            </span>
          </div>

          <div className="banner-item">
            <Lock size={18} color="#10b981" />
            <span>
              Auth:{' '}
              <strong className="active-badge">
                Active (OAuth2 + JWT)
              </strong>
            </span>
          </div>

          <div className="banner-item">
            <Activity size={18} color="#10b981" />
            <span>
              Rate Limit: <strong>5 req/sec (Burst: 10)</strong>
            </span>
          </div>

        </div>

        {/* Real NGINX API Gateway Telemetry */}
        <div className="stats-strip">

          <div className="stats-header">

            <div className="stats-title">
              <BarChart3 size={18} color="#3b82f6" />
              <h4>API Gateway Request Telemetry</h4>
            </div>

            <button
              className="burst-btn"
              onClick={testRateLimitBurst}
              disabled={loading || burstRunning}
              title="Send 30 concurrent requests to demonstrate NGINX rate limiting"
            >
              <Zap size={14} />
              {burstRunning ? 'Sending burst...' : 'Simulate Burst Traffic'}
            </button>

          </div>

          <div className="stats-grid">

            <div className="stat-box">
              <span className="stat-label">
                Total Requests
              </span>
              <span className="stat-num">
                {monitoring?.total_requests ?? '—'}
              </span>
            </div>

            <div className="stat-box success">
              <span className="stat-label">
                <CheckCircle2 size={14} />
                Successful Requests
              </span>
              <span className="stat-num">
                {monitoring?.successful_requests ?? '—'}
              </span>
            </div>

            <div className="stat-box error">
              <span className="stat-label">
                <AlertOctagon size={14} />
                Client Errors (4xx)
              </span>
              <span className="stat-num">
                {monitoring?.client_errors ?? '—'}
              </span>
            </div>

            <div className="stat-box error">
              <span className="stat-label">
                <ShieldAlert size={14} />
                Gateway Errors (502–504)
              </span>
              <span className="stat-num">
                {monitoring?.gateway_errors ?? '—'}
              </span>
            </div>

            <div className="stat-box blocked">
              <span className="stat-label">
                <ShieldX size={14} />
                429 Rate Violations
              </span>
              <span className="stat-num">
                {monitoring?.rate_limit_violations ?? '—'}
              </span>
            </div>

          </div>

          {burstResult && (
            <div className="burst-result" role="status" aria-live="polite">
              <strong>Burst test results</strong>
              <div className="burst-result-grid">
                <span>Sent: <b>{burstResult.sent}</b></span>
                <span>Successful: <b className="result-success">{burstResult.successful}</b></span>
                <span>HTTP 429: <b className="result-blocked">{burstResult.rateLimited}</b></span>
                <span>HTTP 401: <b>{burstResult.unauthorized}</b></span>
                <span>Other: <b>{burstResult.other}</b></span>
                <span>Network errors: <b>{burstResult.networkErrors}</b></span>
              </div>
              <span className={burstResult.rateLimited > 0 ? 'burst-verdict pass' : 'burst-verdict'}>
                {burstResult.rateLimited > 0
                  ? 'Rate limiting demonstrated: NGINX rejected excess requests.'
                  : 'No 429 responses observed. The rate-limit bucket may have replenished or the policy was not triggered.'}
              </span>
            </div>
          )}

          <p style={{
            color: '#94a3b8',
            fontSize: '0.75rem',
            marginBottom: 0
          }}>
            Statistics sourced from actual NGINX access logs.
          </p>

        </div>

        {/* Gateway Offline Warning */}
        {!gatewayOnline && (
          <div className="offline-alert">
            <AlertTriangle size={20} color="#f59e0b" />

            <div>
              <strong>
                Gateway Currently Unreachable at http://localhost:8080
              </strong>

              <p>
                Make sure the NGINX gateway and Flask backend are running.
                The dashboard will automatically update once connected.
              </p>
            </div>
          </div>
        )}

        {/* NMS Metric Cards */}
        <div className="grid-cards">

          <div className="metric-card">
            <div className="metric-header">
              <span>Total Devices</span>
              <Server size={20} color="#3b82f6" />
            </div>

            <div className="metric-value">
              {metrics ? metrics.total_devices : '—'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Online Devices</span>
              <Activity size={20} color="#10b981" />
            </div>

            <div
              className="metric-value"
              style={{ color: '#10b981' }}
            >
              {metrics ? metrics.online_devices : '—'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Offline Devices</span>
              <AlertTriangle size={20} color="#ef4444" />
            </div>

            <div
              className="metric-value"
              style={{ color: '#ef4444' }}
            >
              {metrics ? metrics.offline_devices : '—'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Avg CPU Load</span>
              <Cpu size={20} color="#f59e0b" />
            </div>

            <div className="metric-value">
              {metrics ? `${metrics.average_cpu}%` : '—'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Avg Memory Load</span>
              <HardDrive size={20} color="#8b5cf6" />
            </div>

            <div className="metric-value">
              {metrics ? `${metrics.average_memory}%` : '—'}
            </div>
          </div>

        </div>

        {/* Main Grid: Devices and Alerts */}
        <div className="dashboard-grid">

          {/* Device Inventory */}
          <div className="panel device-panel">

            <h3>Live Network Device Inventory</h3>

            {devices.length === 0 ? (
              <p className="empty-message">
                No devices retrieved. Waiting for gateway connection...
              </p>
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

                      <td>
                        <strong>{d.id}</strong>
                      </td>

                      <td>{d.name}</td>

                      <td>
                        <span className="type-badge">
                          {d.type}
                        </span>
                      </td>

                      <td>
                        <code>{d.ip}</code>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            d.status === 'Online' ? 'online' : 'offline'
                          }`}
                        >
                          {d.status === 'Online'
                            ? <CheckCircle size={14} />
                            : <XCircle size={14} />
                          }
                          {d.status}
                        </span>
                      </td>

                      <td>
                        <div className="progress-wrapper">

                          <div
                            className="progress-fill"
                            style={{
                              width: `${d.cpu}%`,
                              backgroundColor:
                                d.cpu > 70 ? '#ef4444' : '#10b981'
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
                              backgroundColor:
                                d.memory > 75 ? '#f59e0b' : '#3b82f6'
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

          {/* Active Alerts */}
          <div className="panel alerts-panel">

            <div className="panel-title-group">
              <ShieldAlert size={20} color="#ef4444" />
              <h3>Active Alerts ({alerts.length})</h3>
            </div>

            {alerts.length === 0 ? (
              <p className="empty-message">
                No active alerts reported.
              </p>
            ) : (

              <div className="alerts-list">

                {alerts.map((a, i) => (

                  <div
                    key={i}
                    className={`alert-box ${a.severity.toLowerCase()}`}
                  >

                    <div className="alert-badge">
                      {a.severity}
                    </div>

                    <div className="alert-text">

                      <strong>
                        {a.device_name} ({a.device_id})
                      </strong>

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
