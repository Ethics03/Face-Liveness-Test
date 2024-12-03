
  export const drawmesh = (predictions, ctx) => {
    if (predictions.length > 0) {
      predictions.forEach((prediction) => {
        const keypoints = prediction.scaledMesh;
  
        
  
        // Draw Dots
        for (let i = 0; i < keypoints.length; i++) {
          const x = keypoints[i][0];
          const y = keypoints[i][1];
  
          ctx.beginPath();
          ctx.arc(x, y, 1 , 0, 2 * Math.PI);
          ctx.strokeStyle = "aqua";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }
  };