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
        text.textContent = "Loading MediaPipe...";

        await startTracking(camera);

        text.textContent = "Tracking active!";

        update();
    } catch (error) {
        text.textContent = "Error: " + error.message;
        console.error(error);
    }
}

function update() {
    if (isHandAvailable()) {
        let count = 0;
        if (isFingerUp("thumb")) { count++ }
        if (isFingerUp("index")) { count++ }
        if(isFingerUp("middle")) {count++}
        if(isFingerUp("ring")) {count++}
        if(isFingerUp("pinky")) {count++}
        text.textContent = "Fingers Up: " + count; 
    } else {
        text.textContent = "No Hand Available";
    }
    requestAnimationFrame(update);
}

load();
