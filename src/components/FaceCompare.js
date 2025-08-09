import React, { useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

function FaceCompare({ capturedImage, storedImageUrl }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (capturedImage && storedImageUrl) {
      compareFaces();
    }
  }, [capturedImage, storedImageUrl]);

  const compareFaces = async () => {
    const img1 = await faceapi.fetchImage(capturedImage);
    const img2 = await faceapi.fetchImage(storedImageUrl);

    const fullDesc1 = await faceapi.detectSingleFace(img1).withFaceLandmarks().withFaceDescriptor();
    const fullDesc2 = await faceapi.detectSingleFace(img2).withFaceLandmarks().withFaceDescriptor();

    if (!fullDesc1 || !fullDesc2) {
      setResult('Face not detected');
      return;
    }

    const distance = faceapi.euclideanDistance(fullDesc1.descriptor, fullDesc2.descriptor);

    setResult(distance < 0.6 ? '✅ Face Matched' : '❌ Face Not Matched');
  };

  return (
    <div>
      <h4>Face Match Result:</h4>
      {result && <p>{result}</p>}
    </div>
  );
}

export default FaceCompare;