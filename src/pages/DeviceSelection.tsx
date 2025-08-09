import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import '../assets/css/device-selection.css';
import { useNavigate } from 'react-router-dom';

interface DeviceOption {
  id: string;
  label: string;
  icon: string;
}

interface UserDevice {
  id: string;
  name: string;
  deviceType: string;
}

const devices: DeviceOption[] = [
  { id: 'esp8266', label: 'ESP8266', icon: '📡' },
  { id: 'linux', label: 'Linux Device', icon: '💻' },
  { id: 'android', label: 'Android Device', icon: '📱' }
];

const DeviceSelection: React.FC = () => {
  const navigate=useNavigate();
  const [userDevices, setUserDevices] = useState<UserDevice[]>([]);
  const [newDeviceType, setNewDeviceType] = useState<string>('');
  const [newDeviceName, setNewDeviceName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  const auth = getAuth();
  const db = getDatabase();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const devicesRef = ref(db, `users/${user.uid}`);
    onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deviceList: UserDevice[] = Object.entries(data).map(
          ([deviceId, value]: any) => ({
            id: deviceId,
            name: value.name,
            deviceType: value.deviceType
          })
        );
        setUserDevices(deviceList);
      } else {
        setUserDevices([]);
      }
      setLoading(false);
    });
  }, [auth, db]);

  const handleCreateDevice = async () => {
    if (!newDeviceType || !newDeviceName.trim()) {
      alert('Please select a device type and enter a name.');
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    const devicesRef = ref(db, `users/${user.uid}`);
    const newDeviceRef = push(devicesRef);

    await set(newDeviceRef, {
      name: newDeviceName,
      deviceType: newDeviceType,
      signals: {},
      commands: [],
      logs: []
    });

    setNewDeviceName('');
    setNewDeviceType('');
    setShowModal(false);
  };

  const handleSelectExisting = (deviceId: string) => {
    navigate(`/${deviceId}`)
    // Navigate to dashboard
  };

  return (
    <div className="device-selection-container">
      <header>
        <h1>My Devices</h1>
        <button className="add-device-btn" onClick={() => setShowModal(true)}>
          + Add Device
        </button>
      </header>

      {loading ? (
        <p className="loading-text">Loading devices...</p>
      ) : userDevices.length === 0 ? (
        <p className="no-devices">No devices found. Add one to get started.</p>
      ) : (
        <div className="device-grid">
          {userDevices.map((device) => {
            const deviceInfo = devices.find((d) => d.id === device.deviceType);
            return (
              <div
                key={device.id}
                className="device-card"
                onClick={() => handleSelectExisting(device.id)}
              >
                <div className="device-icon">{deviceInfo?.icon}</div>
                <h3>{device.name}</h3>
                <span className="device-type">{deviceInfo?.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for adding device */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add New Device</h2>
            <select
              value={newDeviceType}
              onChange={(e) => setNewDeviceType(e.target.value)}
            >
              <option value="">-- Select Device Type --</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Enter device name"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
            />
            <button className="create-btn" onClick={handleCreateDevice}>
              Create Device
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceSelection;
