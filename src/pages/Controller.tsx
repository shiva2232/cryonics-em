import { useState, useCallback } from "react";
import {
  ref,
  set,
  get
} from "firebase/database";
import { auth, db as database } from "../contexts/firebase"; // Adjust path as needed
import { useLocation } from "react-router-dom";
import '../assets/css/controller.css';

const initialMacro = `gpio pin=2 mode=OUTPUT state=HIGH
sleep ms=500
gpio pin=2 state=LOW`;

export default function Controller() {
  const location = useLocation();
  const { deviceId } = location.state; // Expect uid & deviceId passed in location state
  const uid = auth.currentUser?.uid;
  console.log(uid, deviceId, "are uid and deviceId")
  const [out, setOut] = useState<string>("");

  // Local states for inputs
  const [gpioPin, setGpioPin] = useState<string>("2");
  const [gpioMode, setGpioMode] = useState<string>("OUTPUT");
  const [gpioState, setGpioState] = useState<string>("HIGH");

  const [pwmPin, setPwmPin] = useState<string>("2");
  const [pwmDuty, setPwmDuty] = useState<string>("512");
  const [pwmFreq, setPwmFreq] = useState<string>("1000");

  const [serialWrite, setSerialWrite] = useState<string>("");
  const [macro, setMacro] = useState<string>(initialMacro);

  // Convenience function to add a new command to Firebase RTDB
  const sendCommand = useCallback(
    async (command: any) => {
      try {
        const commandsRef = ref(database, `users/${uid}/${deviceId}/commands/0`);
        await set(commandsRef, {
          ...command,
          status: "pending",
          issuedAt: Date.now(),
          completedAt: null,
          errorMsg: "",
          output: "",
        });
        setOut(prev => `> Sent command: ${JSON.stringify(command)}\n` + prev);
        return true;
      } catch (e: any) {
        setOut(prev => `! Error sending command: ${e.message || e}\n` + prev);
        return false;
      }
    },
    [uid, deviceId]
  );

  // Fetch device info once
  const fetchInfo = useCallback(async () => {
    try {
      const infoRef = ref(database, `users/${uid}/${deviceId}`);
      const snapshot = await get(infoRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setOut(prev => `> Info: ${JSON.stringify(data)}\n` + prev);
      } else {
        setOut(prev => "> Info: No data found\n" + prev);
      }
    } catch (e: any) {
      setOut(prev => `! Error fetching info: ${e.message || e}\n` + prev);
    }
  }, [uid, deviceId]);

  // For ping, just confirm device presence
  const pingDevice = useCallback(() => {
    // You can implement presence checking or simply print that ping "sent"
    setOut(prev => `> Ping sent to device ${deviceId}\n` + prev);
  }, [deviceId]);

  // Serial read - read latest serial output from database
  const readSerial = useCallback(async () => {
    try {
      const serialRef = ref(database, `users/${uid}/${deviceId}/serial_output`);
      const snapshot = await get(serialRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setOut(prev => `> Serial Read: ${JSON.stringify(data)}\n` + prev);
      } else {
        setOut(prev => "> Serial Read: No data\n" + prev);
      }
    } catch (e: any) {
      setOut(prev => `! Error reading serial: ${e.message || e}\n` + prev);
    }
  }, [uid, deviceId]);

  // Write serial data by sending serial_write command
  const writeSerial = async () => {
    if (!serialWrite.trim()) return;
    await sendCommand({ action: "serial_write", data: serialWrite, appendNewline: true });
    setSerialWrite("");
  };

  // Run Macro: parse macro string into command lines and push commands sequentially
  // For simplicity, push macro as a single "macro" action
  const runMacro = async () => {
    if (!macro.trim()) return;
    await sendCommand({ action: "macro", macro: macro });
  };

  // GPIO set
  const setGPIO = async () => {
    const cmd = {
      action: "gpio",
      pin: parseInt(gpioPin),
      mode: gpioMode,
      state: gpioState,
    };
    await sendCommand(cmd);
  };

  // GPIO read command requests device to read pin and respond somewhere in database
  const readGPIO = async () => {
    await sendCommand({ action: "gpio_read", pin: parseInt(gpioPin) });
  };

  // PWM set command
  const setPWM = async () => {
    const cmd = {
      action: "pwm",
      pin: parseInt(pwmPin),
      duty: parseInt(pwmDuty),
      freq: parseInt(pwmFreq),
    };
    await sendCommand(cmd);
  };

  return (
    <div className="card-controller">
      <section className="panel">
        <h4>Device Control for {deviceId}</h4>
        <button onClick={pingDevice}>Ping</button>
        <button onClick={fetchInfo}>Info</button>
      </section>

      <section className="panel">
        <h4>GPIO</h4>
        <div className="row">
          <input value={gpioPin} onChange={e => setGpioPin(e.target.value)} />
          <select value={gpioMode} onChange={e => setGpioMode(e.target.value)}>
            <option>OUTPUT</option>
            <option>INPUT</option>
            <option>INPUT_PULLUP</option>
          </select>
          <select value={gpioState} onChange={e => setGpioState(e.target.value)}>
            <option>HIGH</option>
            <option>LOW</option>
          </select>
          <button onClick={setGPIO}>Set</button>
          <button onClick={readGPIO}>Read</button>
        </div>
      </section>

      <section className="panel">
        <h4>PWM</h4>
        <div className="row">
          <input value={pwmPin} onChange={e => setPwmPin(e.target.value)} />
          <input value={pwmDuty} onChange={e => setPwmDuty(e.target.value)} />
          <input value={pwmFreq} onChange={e => setPwmFreq(e.target.value)} />
          <button onClick={setPWM}>Set PWM</button>
        </div>
      </section>

      <section className="panel">
        <h4>Serial</h4>
        <div className="row">
          <input
            value={serialWrite}
            onChange={e => setSerialWrite(e.target.value)}
            placeholder="Text to write to UART"
          />
          <button onClick={writeSerial}>Write</button>
          <button onClick={readSerial}>Read</button>
        </div>
      </section>

      <section className="panel">
        <h4>Macro</h4>
        <textarea rows={6} value={macro} onChange={e => setMacro(e.target.value)} />
        <div className="row">
          <button onClick={runMacro}>Run Macro</button>
        </div>
      </section>

      <section className="panel">
        <h4>Output</h4>
        <pre className="output">{out}</pre>
      </section>
    </div>
  );
}
