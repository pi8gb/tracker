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
const text = document.getElementById("text");

async function load() {
    try {
        text.textContent = "Starting...";

        console.log("1. Starting MediaPipe");

        console.log("2. Calling startTracking()");
        await startTracking(camera);
        console.log("3. startTracking() finished");

        text.textContent = "Tracking active!";
        update();

    } catch (error) {
        text.textContent = "Error: " + error.message;
        console.error("MediaPipe error:", error);
    }
}

function update() {
    if (isHandAvailable()) {
        let count = 0;
        if (isFingerUp("thumb")) { count++ }
        if (isFingerUp("index")) { count++ }
        if (isFingerUp("middle")) { count++ }
        if (isFingerUp("ring")) { count++ }
        if (isFingerUp("pinky")) { count++ }
        text.textContent = "Fingers Up: " + count;
    } else {
        text.textContent = "No Hand Available";
    }
    requestAnimationFrame(update);
}

load();
