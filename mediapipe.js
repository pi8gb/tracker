
import {
    FilesetResolver,
    GestureRecognizer,
    FaceLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

// ---------------- SETTINGS ----------------

const WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const HAND_MODEL =
    "https://storage.googleapis.com/mediapipe-models/" +
    "gesture_recognizer/gesture_recognizer/float16/1/" +
    "gesture_recognizer.task";

const FACE_MODEL =
    "https://storage.googleapis.com/mediapipe-models/" +
    "face_landmarker/face_landmarker/float16/1/" +
    "face_landmarker.task";

// ---------------- DATA ----------------

let recognizer;
let faceTracker;
let videoElement;

let handPoints = [];
let facePoints = [];
let faceBlendshapes = [];
let gestureName = "None";

let ready = false;
let processing = false;
let lastVideoTime = -1;

// ---------------- LANDMARK NAMES ----------------

const HAND_NAMES = {
    wrist: 0,
    thumb_cmc: 1,
    thumb_mcp: 2,
    thumb_ip: 3,
    thumb_tip: 4,
    index_mcp: 5,
    index_pip: 6,
    index_dip: 7,
    index_tip: 8,
    middle_mcp: 9,
    middle_pip: 10,
    middle_dip: 11,
    middle_tip: 12,
    ring_mcp: 13,
    ring_pip: 14,
    ring_dip: 15,
    ring_tip: 16,
    pinky_mcp: 17,
    pinky_pip: 18,
    pinky_dip: 19,
    pinky_tip: 20
};

const FACE_NAMES = {
    nose: 1,
    forehead: 10,
    chin: 152,
    left_eye_outer: 33,
    left_eye_inner: 133,
    right_eye_inner: 362,
    right_eye_outer: 263,
    upper_lip: 13,
    lower_lip: 14,
    mouth_left: 61,
    mouth_right: 291
};

// ---------------- START ----------------

export async function startTracking(video) {
    if (ready) return;

    videoElement = video;

    const vision = await FilesetResolver.forVisionTasks(WASM_URL);

    recognizer = await GestureRecognizer.createFromOptions(
        vision,
        {
            baseOptions: { modelAssetPath: HAND_MODEL },
            runningMode: "VIDEO",
            numHands: 1
        }
    );

    faceTracker = await FaceLandmarker.createFromOptions(
        vision,
        {
            baseOptions: { modelAssetPath: FACE_MODEL },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true
        }
    );

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    });

    videoElement.srcObject = stream;
    await videoElement.play();

    ready = true;
    lastVideoTime = -1;

    requestAnimationFrame(trackFrame);
}

// ---------------- TRACKING LOOP ----------------

function trackFrame() {
    if (!ready) return;

    if (
        !processing &&
        videoElement.readyState >= 2 &&
        videoElement.currentTime !== lastVideoTime
    ) {
        processing = true;
        lastVideoTime = videoElement.currentTime;

        try {
            const now = performance.now();

            const hands = recognizer.recognizeForVideo(
                videoElement, now
            );

            const face = faceTracker.detectForVideo(
                videoElement, now
            );

            handPoints = hands.landmarks?.[0] ?? [];
            facePoints = face.faceLandmarks?.[0] ?? [];

            gestureName =
                hands.gestures?.[0]?.[0]?.categoryName ?? "None";

            faceBlendshapes =
                face.faceBlendshapes?.[0]?.categories ?? [];
        } catch (error) {
            console.error("Tracking error:", error);
        } finally {
            processing = false;
        }
    }

    requestAnimationFrame(trackFrame);
}

// ---------------- HAND POSITIONS ----------------

// handPos("index_tip", "x")
// handPos("wrist", "y")
// handPos(8, "z")

export function handPos(point, axis = "x") {
    const index = typeof point === "number"
        ? point
        : HAND_NAMES[String(point).toLowerCase()];

    const landmark = handPoints[index];
    axis = axis.toLowerCase();

    if (!landmark || !["x", "y", "z"].includes(axis)) {
        return null;
    }

    return landmark[axis];
}

// Always returns the wrist coordinates.
export function handPosition() {
    if (!isHandAvailable()) return null;

    return {
        x: handPos("wrist", "x"),
        y: handPos("wrist", "y"),
        z: handPos("wrist", "z")
    };
}

export function isHandAvailable() {
    return handPoints.length > 0;
}

// ---------------- FINGER DETECTION ----------------

// isFingerUp("index")
// Valid names: thumb, index, middle, ring, pinky
//
// This is a geometric estimate. Hand rotation can affect results.

export function isFingerUp(finger) {
    if (!isHandAvailable()) return false;

    finger = String(finger).toLowerCase();

    const fingers = {
        thumb: ["thumb_tip", "thumb_ip"],
        index: ["index_tip", "index_pip"],
        middle: ["middle_tip", "middle_pip"],
        ring: ["ring_tip", "ring_pip"],
        pinky: ["pinky_tip", "pinky_pip"]
    };

    const pair = fingers[finger];
    if (!pair) return false;

    const tip = handPoints[HAND_NAMES[pair[0]]];
    const joint = handPoints[HAND_NAMES[pair[1]]];
    const wrist = handPoints[0];

    if (!tip || !joint || !wrist) return false;

    const distance = (a, b) =>
        Math.hypot(a.x - b.x, a.y - b.y);

    // Thumb uses the same general extension test.
    return distance(tip, wrist) > distance(joint, wrist) * 1.1;
}

// ---------------- HAND GESTURES ----------------

// 0 = none / unknown
// 1 = thumbs up
// 2 = thumbs down
// 3 = open palm
// 4 = closed fist
// 5 = pointing up
// 6 = victory
// 7 = I love you
// 8 = pinch (custom distance detection)

export function handExpression() {
    if (!isHandAvailable()) return 0;

    const expressions = {
        Thumb_Up: 1,
        Thumb_Down: 2,
        Open_Palm: 3,
        Closed_Fist: 4,
        Pointing_Up: 5,
        Victory: 6,
        ILoveYou: 7
    };

    if (expressions[gestureName] !== undefined) {
        return expressions[gestureName];
    }

    const pinchDistance = handDistance("thumb_tip", "index_tip");

    if (pinchDistance !== null && pinchDistance < 0.05) {
        return 8;
    }

    return 0;
}

export function handExpressionName() {
    const names = {
        0: "None",
        1: "Thumbs up",
        2: "Thumbs down",
        3: "Open palm",
        4: "Closed fist",
        5: "Pointing up",
        6: "Victory",
        7: "I love you",
        8: "Pinch"
    };

    return names[handExpression()];
}

// ---------------- FACE POSITIONS ----------------

// headPos("nose", "x")
// headPos("chin", "y")

export function headPos(point, axis = "x") {
    const index = typeof point === "number"
        ? point
        : FACE_NAMES[String(point).toLowerCase()];

    const landmark = facePoints[index];
    axis = axis.toLowerCase();

    if (!landmark || !["x", "y", "z"].includes(axis)) {
        return null;
    }

    return landmark[axis];
}

// Always returns nose coordinates.
export function headPosition() {
    if (!isHeadAvailable()) return null;

    return {
        x: headPos("nose", "x"),
        y: headPos("nose", "y"),
        z: headPos("nose", "z")
    };
}

export function isHeadAvailable() {
    return facePoints.length > 0;
}

// ---------------- FACE EXPRESSIONS ----------------

// 0 = neutral / unknown
// 1 = smile
// 2 = mouth open
// Uses MediaPipe's face blendshape scores, not guessed mouth width.

function blendshapeScore(name) {
    const shape = faceBlendshapes.find(
        item => item.categoryName === name
    );

    return shape?.score ?? 0;
}

export function headExpression() {
    if (!isHeadAvailable()) return 0;

    const mouthOpen = blendshapeScore("jawOpen");
    const smileLeft = blendshapeScore("mouthSmileLeft");
    const smileRight = blendshapeScore("mouthSmileRight");

    if (mouthOpen > 0.45) return 2;

    if ((smileLeft + smileRight) / 2 > 0.5) return 1;

    return 0;
}

export function headExpressionName() {
    const names = {
        0: "Neutral / unknown",
        1: "Smile",
        2: "Mouth open"
    };

    return names[headExpression()];
}

// ---------------- DISTANCE ----------------

// Distance between two hand points in normalized image coordinates.

export function handDistance(pointA, pointB) {
    const ax = handPos(pointA, "x");
    const ay = handPos(pointA, "y");
    const bx = handPos(pointB, "x");
    const by = handPos(pointB, "y");

    if ([ax, ay, bx, by].some(v => v === null)) {
        return null;
    }

    return Math.hypot(bx - ax, by - ay);
}

// ---------------- STATUS / CLEANUP ----------------

export function isTrackingReady() {
    return ready;
}

export function stopTracking() {
    ready = false;

    handPoints = [];
    facePoints = [];
    faceBlendshapes = [];
    gestureName = "None";
    lastVideoTime = -1;

    if (videoElement?.srcObject) {
        videoElement.srcObject.getTracks().forEach(
            track => track.stop()
        );
        videoElement.srcObject = null;
    }

    recognizer?.close();
    faceTracker?.close();

    recognizer = null;
    faceTracker = null;
    videoElement = null;
}