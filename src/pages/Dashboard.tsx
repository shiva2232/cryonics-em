// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, onValue, set, get } from "firebase/database";
import { auth, db } from "../contexts/firebase";
import LineChart from "../components/LineChart";
import ThreeDeviceScene from "../components/ThreeDeviceScene";
import "../assets/css/dashboard.css";
import PayloadUploadModal from "../components/PayloadUploadModal";

type DeviceData = {
  name?: string;
  deviceType?: string;
  ip?: string;
  signals?: Record<string, number>;
  commands?: {
    action: string,
    completedAt: number,
    errorMsg: "",
    issuedAt: string,
    output: string,
    status: "pending" | "executing" | "completed" | "error"
  }[];
  logs?: any[];
  metrics?: { ts: number; cpu?: number; mem?: number; net?: number; battery?: number }[];
  // ...other fields
}

interface IpData {
  ip: string;
  success: boolean;
  type: "IPv4" | "IPv6";
  continent: string;
  country: string;
  country_code?: string;
  region: string;
  city: string;
  postal?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  connection?: {
    asn?: number;
    isp?: string;
  };
  [key: string]: any; // For any additional fields
}

export default function DashboardPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCommand, setLastCommand] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"console" | "command" | "logs">("console");
  const [uploadOpen, setUploadOpen] = useState<string | undefined | null>(undefined)
  const [cmd, setCmd] = useState("")
  const [ipData, setIpData] = useState<IpData | null>(null);


  useEffect(() => {
    if (!deviceId || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const deviceRef = ref(db, `users/${uid}/${deviceId}`);

    const unsub = onValue(deviceRef, (snap) => {
      setLoading(false);
      if (!snap.exists()) {
        setDevice(null);
        return;
      }
      const data = snap.val() as DeviceData;
      setDevice(data);

      // watch commands: capture latest executed command for visualization
      if (data.commands && Array.isArray(data.commands) && data.commands.length > 0) {
        const last = data.commands[data.commands.length - 1];
        setLastCommand(last);
      }
    });

    return () => unsub();
  }, [deviceId]);

  useEffect(() => {
    if (device?.ip) {
      setLoading(true)
      fetch("https://ipwho.is/" + (device as any).ip).then(re => {
        if (!re.ok) console.log("IP details: Network response was not ok");
        return re.json()
      }).then((data) => {
        setLoading(false);
        setIpData(data);
      })
        .catch((_) => {
          setLoading(false);
        });
    }
  }, [device?.ip])

  function pushCommand() {
    if (!deviceId || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const deviceRef = ref(db, `users/${uid}/${deviceId}/commands`);

    get(deviceRef).then((value) => {
      let val;
      if (Array.isArray(value)) {
        value.push({
          "action": cmd,
          "issuedAt": new Date().getTime(),
          "status": "pending",
          "output": "",
          "errorMsg": ""
        })
        val = value;
      } else {
        val = [{
          "action": cmd,
          "issuedAt": new Date().getTime(),
          "status": "pending",
          "output": "",
          "errorMsg": ""
        }]
      }
      set(deviceRef, val)
    })
  }

  if (!deviceId) return <div className="dash-empty">No device selected</div>;
  if (loading) return <div className="dash-loading">Loading...</div>;
  if (!device) return <div className="dash-empty">Device not found</div>;

  return (
    <div className="dashboard-root">
      <header className="dash-header">
        <button className="link" onClick={() => navigate(-1)}>← Back</button>
        <div className="title">
          <h1>{device.name || deviceId}</h1>
          <div className="meta"><center>{device.deviceType?.toUpperCase()}</center></div>
        </div>
        <div className="right-controls">
          <button className="btn" onClick={() => { setUploadOpen(deviceId); console.log("hello world") }} >Flash / Upload</button>
          <button className="btn outline">Reboot</button>
        </div>
      </header>

      <main className="dash-main">
        <section className="left-col">
          <div className="card overview-card">
            <div className="card-row">
              <div>
                <div className="label">IP / Host</div>
                <div className="value">{device?.ip || "—"}</div>
              </div>
              <div>
                <div className="label">Firmware</div>
                <div className="value">{(device as any).firmware || "—"}</div>
              </div>
              <div>
                <div className="label">Uptime</div>
                <div className="value">{(device as any).uptime || "—"}</div>
              </div>
              <div>
                <div className="label">Battery</div>
                <div className="value">{device.metrics?.[device.metrics.length - 1]?.battery?.toFixed?.(2) ?? "—"}%</div>
              </div>
            </div>

            <div className="overview-actions tabs">
              <button
                className={`btn ${activeTab === "console" ? "primary" : ""}`}
                onClick={() => setActiveTab("console")}
              >
                Open Console
              </button>
              <button
                className={`btn ${activeTab === "command" ? "primary" : ""}`}
                onClick={() => setActiveTab("command")}
              >
                Send Command
              </button>
              <button
                className={`btn ${activeTab === "logs" ? "primary" : ""}`}
                onClick={() => setActiveTab("logs")}
              >
                Download Logs
              </button>
            </div>
            <div className="tab-content">
              {activeTab === "console" && (
                <>
                  <h2>Open Console</h2>
                  <p>Interact directly with your device in real time.</p>
                  {/* Your console UI here */}
                </>
              )}
              {activeTab === "command" && (
                <>
                  <h2>Send Command</h2>
                  <div className="form-group">
                    <input type="text" value={cmd} onChange={e => { setCmd(e.target.value) }} placeholder="Enter command" />
                  </div>
                  <button onClick={() => { pushCommand() }} >Execute</button>
                  <div style={{ backgroundColor: "#140827", width: "100%", padding: "5px", borderRadius: "5px", marginTop: "5px" }}>
                    <p style={{ color: device.commands?.at(0)?.output.startsWith("[STDOUT] ") ? "white" : "red" }} > &gt; {device.commands?.at(0)?.output?.replace("[STDOUT] ", "")?.replace("[STDERR] ", "")}</p>
                  </div>
                </>
              )}
              {activeTab === "logs" && (
                <>
                  <h2>Download Logs</h2>
                  <p>Select a log type to download:</p>
                  <select className="mb-2">
                    <option>High Priority Logs</option>
                    <option>All Logs</option>
                  </select>
                  <button>Download</button>
                </>
              )}
            </div>
          </div>

          <div className="card charts-card">
            <h3>Metrics (last 10 mins)</h3>
            <LineChart
              data={device.metrics ?? []}
              keys={["cpu", "net", "battery"]}
              height={220}
            />
          </div>

          <div className="card logs-card">
            <h3>Recent Logs</h3>
            <div className="logs-list">
              {device.logs && device.logs.length > 0 ? (
                [...device.logs].reverse().slice(0, 30).map((l: any, i: number) => (
                  <div className="log-item" key={i}>
                    <div className="log-time">{new Date(l.ts || Date.now()).toLocaleTimeString()}</div>
                    <div className="log-msg">{l.msg || JSON.stringify(l)}</div>
                  </div>
                ))
              ) : (
                <div className="muted">No logs</div>
              )}
            </div>
          </div>
        </section>

        <aside className="right-col">
          <div className="card three-card">
            <h3>Live Execution Visual</h3>
            <ThreeDeviceScene trigger={lastCommand} />
          </div>

          <div className="card commands-card">
            <h3>Commands</h3>
            <div className="commands-list">
              {device.commands && device.commands.length > 0 ? (
                [...device.commands].slice(-10).reverse().map((c: any, idx: number) => (
                  <div className="cmd-item" key={idx}>
                    <div className="cmd-name">{c.action || c.name}</div>
                    <div className={`cmd-status ${c.status || "idle"}`}>{c.status || "idle"}</div>
                  </div>
                ))
              ) : <div className="muted">No commands</div>}
            </div>
          </div>

          <div className="card signals-card">
            <h3>Signals</h3>
            <div className="signals-grid">
              {device.signals ? Object.entries(device.signals).map(([k, v]) => (
                <div className="signal" key={k}>
                  <div className="skey">{k}</div>
                  <div className="sval">{v}</div>
                </div>
              )) : <div className="muted">No signals</div>}
            </div>
          </div>

          <div className="card commands-card">
            <h3>IP info<sup>{ipData?.type ? "[" + ipData.type + "]" : ""}</sup></h3>
            <div className="commands-list">
              {ipData ?
                <>
                  <div className="cmd-item" >
                    <div className="cmd-name">City</div>
                    <div className="cmd-status">{ipData.city}</div>
                  </div>
                  <div className="cmd-item" >
                    <div className="cmd-name">Region</div>
                    <div className="cmd-status">{ipData.region}</div>
                  </div>
                  <div className="cmd-item" >
                    <div className="cmd-name">Country</div>
                    <div className="cmd-status">{ipData.country}-[{ipData.country_code}]</div>
                  </div>
                  <div className="cmd-item" >
                    <div className="cmd-name">ISP</div>
                    <div className="cmd-status">{ipData.connection?.isp}</div>
                  </div>
                </> : <div className="muted">No IP data</div>}
            </div>
          </div>
        </aside>
      </main>
      {uploadOpen && <PayloadUploadModal deviceId={deviceId} onClose={setUploadOpen} />}
    </div>
  );
}
