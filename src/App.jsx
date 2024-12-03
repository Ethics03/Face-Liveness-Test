import { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as facemesh from "@tensorflow-models/facemesh";
import * as handpose from "@tensorflow-models/handpose";
import { drawmesh } from "./utilities";
import Header from "./components/Header/Header";

function App() {
  const webref = useRef(null);
  const canvaref = useRef(null);
  const [liveness, setLiveness] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [gesture, setGesture] = useState("");

  let movementCount = 0;
  let blinkCount = 0;
  let lastBlinkTime = Date.now();
  let livenessTimeout;
  let previousLandmarks = null;
  let livenessHistory = [];
  const historySize = 5;

  const runModels = async () => {
    const faceNet = await facemesh.load({
      inputResolution: { width: 640, height: 480 },
      scale: 0.8,
    });
    const handNet = await handpose.load();

    setLiveness(false);
    setFallback(false);
    blinkCount = 0;

    livenessTimeout = setTimeout(() => {
      if (!liveness) setFallback(true);
    }, 15000);

    setInterval(() => detect(faceNet, handNet), 100);
  };

  const calculateEAR = (landmarks) => {
    const [leftP1, leftP2, leftP3, leftP4, leftP5, leftP6] = [
      landmarks[362], landmarks[385], landmarks[387], landmarks[263], landmarks[373], landmarks[380],
    ];
    const [rightP1, rightP2, rightP3, rightP4, rightP5, rightP6] = [
      landmarks[33], landmarks[160], landmarks[158], landmarks[133], landmarks[153], landmarks[144],
    ];

    const leftEAR =
      (Math.hypot(leftP2[0] - leftP6[0], leftP2[1] - leftP6[1]) +
        Math.hypot(leftP3[0] - leftP5[0], leftP3[1] - leftP5[1])) /
      (2 * Math.hypot(leftP1[0] - leftP4[0], leftP1[1] - leftP4[1]));

    const rightEAR =
      (Math.hypot(rightP2[0] - rightP6[0], rightP2[1] - rightP6[1]) +
        Math.hypot(rightP3[0] - rightP5[0], rightP3[1] - rightP5[1])) /
      (2 * Math.hypot(rightP1[0] - rightP4[0], rightP1[1] - rightP4[1]));

    return (leftEAR + rightEAR) / 2;
  };

  const detect = async (faceNet, handNet) => {
    if (webref.current?.video?.readyState !== 4) return;

    const video = webref.current.video;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    canvaref.current.width = videoWidth;
    canvaref.current.height = videoHeight;
    const ctx = canvaref.current.getContext("2d");
    ctx.clearRect(0, 0, videoWidth, videoHeight);

    let faceDetected = false;
    let handDetected = false;

    // Face detection
    const faces = await faceNet.estimateFaces(video, false);
    if (faces.length > 0) {
      faceDetected = true;
      const landmarks = faces[0].scaledMesh;
      const EAR = calculateEAR(landmarks);

      // Blink detection
      if (EAR < 0.25) {
        const currentTime = Date.now();
        if (currentTime - lastBlinkTime > 300) {
          blinkCount++;
          lastBlinkTime = currentTime;
        }
      }

      // Confirm liveness if sufficient blinks are detected
      if (blinkCount >= 3) {
        addToHistory("confirmed");
        blinkCount = 0; // Reset after confirmation
      }

      // Movement detection
      if (previousLandmarks) {
        const [horizontalMovements, verticalMovementSignificant] = analyzeMovement(landmarks);
        if (horizontalMovements >= 2 && verticalMovementSignificant) {
          movementCount++;
          if (movementCount >= 3) {
            addToHistory("confirmed");
          }
        }
      }

      previousLandmarks = landmarks;
      drawmesh(faces, ctx);
    } else {
      previousLandmarks = null;
      movementCount = 0; // Reset movement count if no face detected
    }

    // Hand detection
    const hands = await handNet.estimateHands(video);
    if (hands.length > 0) {
      handDetected = true;
      const landmarks = hands[0].landmarks;
      detectHandGesture(landmarks);
      drawHand(landmarks, ctx);
    }

    // Update liveness state based on both conditions
    if (isLivenessConfirmed() && handDetected) {
      setLiveness(true);
      clearTimeout(livenessTimeout);
    } else {
      setLiveness(false);
    }
  };

  const analyzeMovement = (landmarks) => {
    let totalHorizontalMovement = 0;
    let movementCount = 0;
    let verticalMovementSignificant = false;

    for (let i = 0; i < landmarks.length; i++) {
      if (i === 10 || i === 152 || i === 226) {
        const horizontalMovement = Math.abs(landmarks[i][0] - previousLandmarks[i][0]);
        totalHorizontalMovement += horizontalMovement;
        if (horizontalMovement > 10) movementCount++;
        if (Math.abs(landmarks[i][1] - previousLandmarks[i][1]) > 5) {
          verticalMovementSignificant = true;
        }
      }
    }

    return [movementCount, verticalMovementSignificant];
  };

  const detectHandGesture = (landmarks) => {
    if (landmarks[8][1] < landmarks[6][1] && landmarks[12][1] < landmarks[10][1]) {
      setGesture("Open Palm ✋");
    } else if (landmarks[8][1] > landmarks[6][1] && landmarks[12][1] > landmarks[10][1]) {
      setGesture("Closed Fist ✊");
    } else {
      setGesture("Unknown Gesture");
    }
  };

  const drawHand = (landmarks, ctx) => {
    ctx.fillStyle = "red";
    landmarks.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const addToHistory = (status) => {
    livenessHistory.push(status);
    if (livenessHistory.length > historySize) livenessHistory.shift();
  };

  const isLivenessConfirmed = () => {
    const confirmedCount = livenessHistory.filter((status) => status === "confirmed").length;
    return confirmedCount > historySize / 2;
  };

  useEffect(() => {
    runModels();
    return () => {
      clearTimeout(livenessTimeout);
    };
  }, []);

  return (
    <>
      <Header />
      <div className="container w-full">
        <div className="flex justify-center items-center h-screen relative">
          <Webcam className="webcam-video absolute w-640 h-480 rounded" ref={webref} />
          <canvas ref={canvaref} className="canvas-mesh absolute w-640 h-480" />
        </div>
        {fallback ? (
          <div className="relative text-center text-red-500 font-bold">
            <h1 className="relative text-center text-red-500 font-bold">Nod for Detection</h1>
            Liveness not detected. Please try again. ❌
          </div>
        ) : liveness ? (
          <div className="relative text-center text-green-500 font-bold">
            <h1 className="relative text-center text-green-500 font-bold">Nod for Detection</h1>
            Liveness Confirmed ✅
          </div>
        ) : (
          <div className="relative text-center text-yellow-500 font-bold">
            <h1 className="relative text-center text-yellow-500 font-bold">Nod for Detection</h1>
            Performing Liveness Check...
          </div>
        )}
        {gesture && (
          <div className="absolute text-center text-blue-500 font-bold">
            Hand Gesture Detected: {gesture}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
