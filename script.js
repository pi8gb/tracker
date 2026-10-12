import {
    startTracking,
    isHandAvailable,
    handPos,
    handPosition,
    handExpression,
    handExpressionName,
    isFingerUp,
    handDistance,
    isHeadAvailable,
    headPos,
    headPosition,
    headExpression,
    headExpressionName
} from "./mediapipe.js";

const camera = document.getElementById("camera");
const status = document.getElementById("status");
const handOutput = document.getElementById("hand");
const headOutput = document.getElementById("head");

async function main() {
    try {
        status.textContent = "Loading MediaPipe...";

        await startTracking(camera);

        status.textContent = "Tracking active!";

        update();
    } catch (error) {
        status.textContent = "Error: " + error.message;
        console.error(error);
    }
}

function update() {
    if (isHandAvailable()) {
        // Get any hand landmark
        const indexX = handPos("index_tip", "x");
        const indexY = handPos("index_tip", "y");

        // Always gets wrist coordinates
        const wrist = handPosition();

        // Get gesture number
        const gesture = handExpression();

        // Detect individual fingers
        const indexUp = isFingerUp("index");
        const thumbUp = isFingerUp("thumb");

        // Distance between fingertips
        const pinchDistance = handDistance(
            "thumb_tip",
            "index_tip"
        );

        handOutput.textContent =
            `Gesture: ${gesture} (${handExpressionName()})
             Index X: ${indexX?.toFixed(3)}
             Index Y: ${indexY?.toFixed(3)}
             Wrist: ${JSON.stringify(wrist)}
             Index finger up: ${indexUp}
             Thumb extended: ${thumbUp}
             Pinch distance: ${pinchDistance?.toFixed(3)}`;
    } else {
        handOutput.textContent = "No hand detected";
    }

    if (isHeadAvailable()) {
        const noseX = headPos("nose", "x");
        const nose = headPosition();

        headOutput.textContent =
            `Expression: ${headExpressionName()} (${headExpression()})
             Nose X: ${noseX?.toFixed(3)}
             Nose position: ${JSON.stringify(nose)}`;
    } else {
        headOutput.textContent = "No face detected";
    }

    requestAnimationFrame(update);
}

main();