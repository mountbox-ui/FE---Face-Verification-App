import React, { useRef, useEffect } from 'react';

function WebcamCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      videoRef.current.srcObject = stream;
    });
  }, []);

  const capture = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/jpeg');
    onCapture(dataURL); // send to parent
  };

  return (
    <div>
      <video ref={videoRef} width="320" height="240" autoPlay muted />
      <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }} />
      <button onClick={capture}>Capture</button>
    </div>
  );
}

export default WebcamCapture;