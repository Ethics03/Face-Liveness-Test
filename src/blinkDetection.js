// ./blinkDetection.js

/**
 * Calculates the Eye Aspect Ratio (EAR) for a given set of facial landmarks.
 * EAR is used to detect blinks based on the distance between the eyelid landmarks.
 * 
 * @param {Array} landmarks - An array of facial landmarks detected by the faceNet.
 * @returns {number} - The calculated EAR value.
 */
export  const calculateEAR = (landmarks) => {
    // Indices for the eye landmarks based on the 468-point model
    const leftEye = [
      landmarks[36], landmarks[37], landmarks[38], landmarks[39], landmarks[40], landmarks[41]
    ];
    const rightEye = [
      landmarks[42], landmarks[43], landmarks[44], landmarks[45], landmarks[46], landmarks[47]
    ];
  
    // Helper function to calculate distance between two points
    const distance = (point1, point2) => {
      return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
    };
  
    // Calculate the distances for the left eye
    const leftVertical1 = distance(leftEye[1], leftEye[5]);
    const leftVertical2 = distance(leftEye[2], leftEye[4]);
    const leftHorizontal = distance(leftEye[0], leftEye[3]);
  
    // Calculate the distances for the right eye
    const rightVertical1 = distance(rightEye[1], rightEye[5]);
    const rightVertical2 = distance(rightEye[2], rightEye[4]);
    const rightHorizontal = distance(rightEye[0], rightEye[3]);
  
    // Calculate EAR for each eye
    const leftEAR = (leftVertical1 + leftVertical2) / (2 * leftHorizontal);
    const rightEAR = (rightVertical1 + rightVertical2) / (2 * rightHorizontal);
  
    // Average the EAR values from both eyes
    const EAR = (leftEAR + rightEAR) / 2;
  
    return EAR;
  };

