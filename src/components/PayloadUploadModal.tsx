import { useState } from "react";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import "../assets/css/dashboard-modal.css"; // reuse colors/vars

export default function PayloadUploadModal({ deviceId, onClose }: { deviceId: string, onClose: any }) {
  const [file, setFile] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const db = getFirestore();
  const auth = getAuth();

  const MAX_FILE_SIZE = 750 * 1024; // 750 KB raw size limit

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target?.files?.[0] || null;
    if (selected) {
      if (selected.size > MAX_FILE_SIZE) {
        alert(`File is too large. Max allowed is ${(MAX_FILE_SIZE / 1024).toFixed(0)} KB.`);
        e.target.value = ""; // reset file input
        return;
      }
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first.");
    const user = auth.currentUser;
    if (!user) return alert("Not authenticated");

    setUploading(true);
    try {
      const base64 = await blobToBase64(file);
      await addDoc(collection(db, "payloads"), {
        userId: user.uid,
        deviceId,
        payloadData: base64,
        status: "pending",
        uploadedAt: serverTimestamp(),
      });
      alert("Payload uploaded successfully!");
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload payload.");
    }
    setUploading(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Upload Payload</h2>
        <p className="muted">Select a executable file to flash onto the device (max 750 KB)</p>
        <input
          type="file"
          accept=".bin"
          disabled={uploading}
          onChange={handleFileChange}
        />
        <div className="modal-actions">
          <button className="btn" onClick={() => onClose()} disabled={uploading}>Cancel</button>
          <button className="btn primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

function blobToBase64(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
