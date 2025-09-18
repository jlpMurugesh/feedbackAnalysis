// --- 1. INITIALIZATION ---

const firebaseConfig = {
  apiKey: "AIzaSyBWN8f4kSyYQj_5F35DtL9Drw9za46kmUg",
  authDomain: "feedbackanalysis-28073.firebaseapp.com",
  projectId: "feedbackanalysis-28073",
  storageBucket: "feedbackanalysis-28073.firebasestorage.app",
  messagingSenderId: "542476452217",
  appId: "1:542476452217:web:63f66e4a57412b8378afa8",
  measurementId: "G-KJE7GJX71G"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM Elements & State ---
const csvFileInput = document.getElementById('csv-file-input');
const fileNameSpan = document.getElementById('file-name');
const processButton = document.getElementById('process-button');
const generateReportButton = document.getElementById('generate-report-button');
// REMOVED: downloadV1Button and downloadV2Button declarations

const statusMessage = document.getElementById('status-message');
const singleTrainerCard = document.getElementById('single-trainer-card');
const trainerNameInput = document.getElementById('trainer-name');

let headerInfoCache = null;
let rawDataCache = null;
let uploadedFileName = '';

// --- 2. AUTHENTICATION & EVENT LISTENERS ---
auth.onAuthStateChanged(user => {
    if (!user) window.location.href = '../User-authentication/index.html';
});

csvFileInput.addEventListener('change', handleFileSelect);
processButton.addEventListener('click', uploadDataToFirebase);
generateReportButton.addEventListener('click', () => {
    if (!uploadedFileName) {
        showStatus('Please process and upload a file first.', true);
        return;
    }
    window.location.href = `../feedback-report-module/index.html?reportId=${uploadedFileName}`;
});
// REMOVED: Event listeners for V1/V2 download buttons

// --- 3. CORE FILE HANDLING & PARSING ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    resetState();
    fileNameSpan.textContent = file.name;
    uploadedFileName = file.name.split('.').slice(0, -1).join('.');
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            if (jsonData.length === 0) throw new Error("The selected Excel sheet is empty.");
            
            processParsedData(jsonData);

            processButton.disabled = false;
            // REMOVED: Lines that enabled the V1/V2 download buttons
            
        } catch (error) {
            showStatus(`Processing Error: ${error.message}`, true);
            resetState();
        }
    };
    reader.onerror = (e) => showStatus(`File Reading Error: ${e.target.error.name}`, true);
    reader.readAsArrayBuffer(file);
}

function processParsedData(data) {
    showStatus('XLSX parsed successfully. Ready to upload.', false);
    const headers = Object.keys(data[0]);
    headerInfoCache = classifyHeaders(data, headers);
    rawDataCache = data;
    const isMultiTrainer = Array.from(headerInfoCache.values()).some(info => info.type === 'TRAINER_SPECIFIC');
    if (isMultiTrainer) {
        singleTrainerCard.classList.add('hidden');
    } else {
        singleTrainerCard.classList.remove('hidden');
    }
}

// --- 4. HEADER CLASSIFICATION LOGIC (UNCHANGED) ---
function getColumnStats(values) {
    const nonEmptyValues = values.map(v => v?.toString().trim() || '').filter(Boolean);
    if (nonEmptyValues.length === 0) return { count: 0, uniquenessRatio: 0, avgLength: 0, spaceRatio: 0, lengthStdDev: 0 };
    const uniqueValues = new Set(nonEmptyValues);
    const uniquenessRatio = uniqueValues.size / nonEmptyValues.length;
    const lengths = nonEmptyValues.map(v => v.length);
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);
    const avgLength = totalLength / nonEmptyValues.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / nonEmptyValues.length;
    const lengthStdDev = Math.sqrt(variance);
    const spaceCount = nonEmptyValues.filter(v => v.includes(' ')).length;
    const spaceRatio = spaceCount / nonEmptyValues.length;
    return { count: nonEmptyValues.length, uniquenessRatio, avgLength, spaceRatio, lengthStdDev };
}

function classifyHeaders(data, headers) {
    const classification = new Map();
    const idHeader = headers[0];
    const metadataHeaders = new Set([idHeader, 'Start time', 'Completion time', 'Email', 'Name']);
    const trainerRegex = /\.([^.]+)$/;
    const UNIQUENESS_THRESHOLD = 0.7, AVG_LENGTH_THRESHOLD = 20, SPACE_RATIO_THRESHOLD = 0.5, STD_DEV_THRESHOLD = 15;
    headers.forEach(header => {
        if (metadataHeaders.has(header)) { classification.set(header, { type: 'METADATA' }); return; }
        const match = header.match(trainerRegex);
        if (match && match[1].trim().length > 0) { classification.set(header, { type: 'TRAINER_SPECIFIC', details: { questionText: header.substring(0, match.index).trim(), trainerName: match[1].trim() } }); return; }
        const stats = getColumnStats(data.map(row => row[header]));
        const isHighlyUnique = stats.uniquenessRatio > UNIQUENESS_THRESHOLD;
        const hasTextualProperties = (stats.avgLength > AVG_LENGTH_THRESHOLD || (stats.spaceRatio > SPACE_RATIO_THRESHOLD && stats.lengthStdDev > STD_DEV_THRESHOLD));
        if (stats.count > 0 && (isHighlyUnique || hasTextualProperties)) { classification.set(header, { type: 'TEXT_FIELD' }); return; }
        classification.set(header, { type: 'COMMON_QUESTION' });
    });
    return classification;
}

// --- 5. DATA TRANSFORMATION LOGIC (UNCHANGED) ---
// --- 5. VERSION 1: TRAINEE-CENTRIC TRANSFORMATION (UNCHANGED) ---
function generateTraineeCentricJson(data, headerInfo) {
    const isMultiTrainer = Array.from(headerInfo.values()).some(info => info.type === 'TRAINER_SPECIFIC');
    if (isMultiTrainer) {
        return transformMultiTrainerData(data, headerInfo);
    } else {
        const trainerName = trainerNameInput.value.trim();
        // Check for trainer name ONLY if the action is uploading
        if (!trainerName && (event.target && event.target.id === 'process-button')) {
            showStatus('Please enter the trainer\'s name before uploading.', true);
            return null;
        }
        return transformSingleTrainerData(data, headerInfo, trainerName || 'SINGLE_TRAINER_NAME_NOT_SET');
    }
}

function transformMultiTrainerData(data, headerInfo) {
    const output = { trainers: [] }; const trainers = new Set();
    headerInfo.forEach(info => { if (info.type === 'TRAINER_SPECIFIC') trainers.add(info.details.trainerName); });
    output.trainers = Array.from(trainers); const idHeader = Array.from(headerInfo.keys())[0];
    data.forEach(row => {
        const rowId = row[idHeader]; if (!rowId) return;
        const studentFeedback = { text: {} }; output.trainers.forEach(name => studentFeedback[name] = {});
        for (const header in row) {
            const info = headerInfo.get(header); if (!info) continue; const value = row[header];
            switch(info.type) {
                case 'TRAINER_SPECIFIC': studentFeedback[info.details.trainerName][info.details.questionText] = value; break;
                case 'TEXT_FIELD': studentFeedback.text[header] = value; break;
                case 'COMMON_QUESTION': studentFeedback[header] = value; break;
            }
        }
        output[rowId] = studentFeedback;
    }); return output;
}

function transformSingleTrainerData(data, headerInfo, trainerName) {
    const output = { trainer: trainerName }; const idHeader = Array.from(headerInfo.keys())[0];
    data.forEach(row => {
        const rowId = row[idHeader]; if (!rowId) return;
        const studentFeedback = { text: {} };
        for (const header in row) {
            const info = headerInfo.get(header); if (!info) continue; const value = row[header];
            switch(info.type) {
                case 'TEXT_FIELD': studentFeedback.text[header] = value; break;
                case 'COMMON_QUESTION': case 'TRAINER_SPECIFIC': studentFeedback[header] = value; break;
            }
        }
        output[rowId] = studentFeedback;
    }); return output;
}

function transformToTrainerCentric(traineeCentricJson) {
    const trainerCentricJson = {};
    const traineeIds = Object.keys(traineeCentricJson).filter(k => !isNaN(parseInt(k)));
    if (traineeCentricJson.trainers) {
        const commonQuestions = {}; const textResponses = {};
        traineeCentricJson.trainers.forEach(trainerName => { trainerCentricJson[trainerName] = {}; });
        traineeIds.forEach(id => {
            const traineeResponse = traineeCentricJson[id];
            for (const key in traineeResponse) {
                const value = traineeResponse[key];
                if (traineeCentricJson.trainers.includes(key)) {
                    const trainerName = key;
                    for (const question in value) {
                        if (!trainerCentricJson[trainerName][question]) trainerCentricJson[trainerName][question] = [];
                        trainerCentricJson[trainerName][question].push(value[question]);
                    }
                } else if (key === 'text') {
                    for (const question in value) {
                        if (!textResponses[question]) textResponses[question] = [];
                        textResponses[question].push(value[question]);
                    }
                } else {
                    const question = key;
                    if (!commonQuestions[question]) commonQuestions[question] = [];
                    commonQuestions[question].push(value);
                }
            }
        });
        traineeCentricJson.trainers.forEach(trainerName => {
            trainerCentricJson[trainerName].text = textResponses;
            trainerCentricJson[trainerName].commonQuestions = commonQuestions;
        });
    } else if (traineeCentricJson.trainer) {
        const trainerName = traineeCentricJson.trainer;
        trainerCentricJson[trainerName] = { text: {} };
        traineeIds.forEach(id => {
            const traineeResponse = traineeCentricJson[id];
            for (const question in traineeResponse) {
                const value = traineeResponse[question];
                if (question === 'text') {
                    for (const textQuestion in value) {
                        if (!trainerCentricJson[trainerName].text[textQuestion]) trainerCentricJson[trainerName].text[textQuestion] = [];
                        trainerCentricJson[trainerName].text[textQuestion].push(value[textQuestion]);
                    }
                } else {
                    if (!trainerCentricJson[trainerName][question]) trainerCentricJson[trainerName][question] = [];
                    trainerCentricJson[trainerName][question].push(value);
                }
            }
        });
    }
    const finalResult = {};
    Object.keys(trainerCentricJson).forEach(key => {
        if (isNaN(parseInt(key)) && key !== 'trainers' && key !== 'trainer') {
            finalResult[key] = trainerCentricJson[key];
        }
    });
    return finalResult;
}

// --- 6. UPLOAD & HIDDEN DOWNLOAD FUNCTIONS ---
function uploadDataToFirebase(event) {
    const v1Data = generateTraineeCentricJson(rawDataCache, headerInfoCache, event);
    if (!v1Data) return;
    
    const v2Data = transformToTrainerCentric(v1Data);
    
    showStatus('Uploading to Firebase...', false);
    processButton.disabled = true;
    generateReportButton.disabled = true;

    db.collection("feedbackReports").doc(uploadedFileName).set(v2Data)
        .then(() => {
            showStatus('Upload successful! You can now generate the report.', false, 'status-success');
            generateReportButton.disabled = false;
        })
        .catch((error) => {
            showStatus(`Upload failed: ${error.message}`, true, 'status-error');
        })
        .finally(() => {
            processButton.disabled = false;
        });
}

// NOTE: The actual download functions are kept in the code for potential debugging,
// but they are no longer connected to any UI element.
function triggerJsonDownload(data, filename) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${filename}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function downloadV1Json(event) {
    const traineeData = generateTraineeCentricJson(rawDataCache, headerInfoCache, event);
    if (traineeData) {
        triggerJsonDownload(traineeData, `${uploadedFileName}_trainee_centric`);
        showStatus('V1 JSON download initiated.', false);
    }
}

function downloadV2Json(event) {
    const traineeData = generateTraineeCentricJson(rawDataCache, headerInfoCache, event);
    if (traineeData) {
        const trainerCentricJson = transformToTrainerCentric(traineeData);
        triggerJsonDownload(trainerCentricJson, `${uploadedFileName}_trainer_centric`);
        showStatus('V2 JSON download initiated.', false);
    }
}

// --- 7. UTILITY FUNCTIONS ---
function resetState() {
    headerInfoCache = null; rawDataCache = null;
    uploadedFileName = '';
    fileNameSpan.textContent = 'No file selected';
    processButton.disabled = true;
    generateReportButton.disabled = true;
    // REMOVED: Lines that disabled V1/V2 buttons
    singleTrainerCard.classList.add('hidden');
    trainerNameInput.value = '';
    showStatus('');
}

function showStatus(message, isError = false, className = '') {
    statusMessage.textContent = message;
    statusMessage.className = isError ? 'status-error' : (className || '');
}

// --- Full implementation of unchanged functions for copy-pasting ---
function getColumnStats(values) {
    const nonEmptyValues = values.map(v => v?.toString().trim() || '').filter(Boolean);
    if (nonEmptyValues.length === 0) return { count: 0, uniquenessRatio: 0, avgLength: 0, spaceRatio: 0, lengthStdDev: 0 };
    const uniqueValues = new Set(nonEmptyValues);
    const uniquenessRatio = uniqueValues.size / nonEmptyValues.length;
    const lengths = nonEmptyValues.map(v => v.length);
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);
    const avgLength = totalLength / nonEmptyValues.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / nonEmptyValues.length;
    const lengthStdDev = Math.sqrt(variance);
    const spaceCount = nonEmptyValues.filter(v => v.includes(' ')).length;
    const spaceRatio = spaceCount / nonEmptyValues.length;
    return { count: nonEmptyValues.length, uniquenessRatio, avgLength, spaceRatio, lengthStdDev };
}

function classifyHeaders(data, headers) {
    const classification = new Map();
    const idHeader = headers[0];
    const metadataHeaders = new Set([idHeader, 'Start time', 'Completion time', 'Email', 'Name']);
    const trainerRegex = /\.([^.]+)$/;
    const UNIQUENESS_THRESHOLD = 0.7, AVG_LENGTH_THRESHOLD = 20, SPACE_RATIO_THRESHOLD = 0.5, STD_DEV_THRESHOLD = 15;
    headers.forEach(header => {
        if (metadataHeaders.has(header)) { classification.set(header, { type: 'METADATA' }); return; }
        const match = header.match(trainerRegex);
        if (match && match[1].trim().length > 0) { classification.set(header, { type: 'TRAINER_SPECIFIC', details: { questionText: header.substring(0, match.index).trim(), trainerName: match[1].trim() } }); return; }
        const stats = getColumnStats(data.map(row => row[header]));
        const isHighlyUnique = stats.uniquenessRatio > UNIQUENESS_THRESHOLD;
        const hasTextualProperties = (stats.avgLength > AVG_LENGTH_THRESHOLD || (stats.spaceRatio > SPACE_RATIO_THRESHOLD && stats.lengthStdDev > STD_DEV_THRESHOLD));
        if (stats.count > 0 && (isHighlyUnique || hasTextualProperties)) { classification.set(header, { type: 'TEXT_FIELD' }); return; }
        classification.set(header, { type: 'COMMON_QUESTION' });
    });
    return classification;
}
function generateTraineeCentricJson(data, headerInfo, sourceEvent) {
    const isMultiTrainer = Array.from(headerInfo.values()).some(info => info.type === 'TRAINER_SPECIFIC');
    if (isMultiTrainer) {
        return transformMultiTrainerData(data, headerInfo);
    } else {
        const trainerName = trainerNameInput.value.trim();
        if (!trainerName && (sourceEvent && sourceEvent.target.id === 'process-button')) {
            showStatus('Please enter the trainer\'s name before uploading.', true);
            return null;
        }
        return transformSingleTrainerData(data, headerInfo, trainerName || 'SINGLE_TRAINER_NAME_NOT_SET');
    }
}
function transformMultiTrainerData(data, headerInfo) {
    const output = { trainers: [] }; const trainers = new Set();
    headerInfo.forEach(info => { if (info.type === 'TRAINER_SPECIFIC') trainers.add(info.details.trainerName); });
    output.trainers = Array.from(trainers); const idHeader = Array.from(headerInfo.keys())[0];
    data.forEach(row => {
        const rowId = row[idHeader]; if (!rowId) return;
        const studentFeedback = { text: {} }; output.trainers.forEach(name => studentFeedback[name] = {});
        for (const header in row) {
            const info = headerInfo.get(header); if (!info) continue; const value = row[header];
            switch(info.type) {
                case 'TRAINER_SPECIFIC': studentFeedback[info.details.trainerName][info.details.questionText] = value; break;
                case 'TEXT_FIELD': studentFeedback.text[header] = value; break;
                case 'COMMON_QUESTION': studentFeedback[header] = value; break;
            }
        }
        output[rowId] = studentFeedback;
    }); return output;
}
function transformSingleTrainerData(data, headerInfo, trainerName) {
    const output = { trainer: trainerName }; const idHeader = Array.from(headerInfo.keys())[0];
    data.forEach(row => {
        const rowId = row[idHeader]; if (!rowId) return;
        const studentFeedback = { text: {} };
        for (const header in row) {
            const info = headerInfo.get(header); if (!info) continue; const value = row[header];
            switch(info.type) {
                case 'TEXT_FIELD': studentFeedback.text[header] = value; break;
                case 'COMMON_QUESTION': case 'TRAINER_SPECIFIC': studentFeedback[header] = value; break;
            }
        }
        output[rowId] = studentFeedback;
    }); return output;
}
function transformToTrainerCentric(traineeCentricJson) {
    const trainerCentricJson = {};
    const traineeIds = Object.keys(traineeCentricJson).filter(k => !isNaN(parseInt(k)));
    if (traineeCentricJson.trainers) {
        const commonQuestions = {}; const textResponses = {};
        traineeCentricJson.trainers.forEach(trainerName => { trainerCentricJson[trainerName] = {}; });
        traineeIds.forEach(id => {
            const traineeResponse = traineeCentricJson[id];
            for (const key in traineeResponse) {
                const value = traineeResponse[key];
                if (traineeCentricJson.trainers.includes(key)) {
                    const trainerName = key;
                    for (const question in value) {
                        if (!trainerCentricJson[trainerName][question]) trainerCentricJson[trainerName][question] = [];
                        trainerCentricJson[trainerName][question].push(value[question]);
                    }
                } else if (key === 'text') {
                    for (const question in value) {
                        if (!textResponses[question]) textResponses[question] = [];
                        textResponses[question].push(value[question]);
                    }
                } else {
                    const question = key;
                    if (!commonQuestions[question]) commonQuestions[question] = [];
                    commonQuestions[question].push(value);
                }
            }
        });
        traineeCentricJson.trainers.forEach(trainerName => {
            trainerCentricJson[trainerName].text = textResponses;
            trainerCentricJson[trainerName].commonQuestions = commonQuestions;
        });
    } else if (traineeCentricJson.trainer) {
        const trainerName = traineeCentricJson.trainer;
        trainerCentricJson[trainerName] = { text: {} };
        traineeIds.forEach(id => {
            const traineeResponse = traineeCentricJson[id];
            for (const question in traineeResponse) {
                const value = traineeResponse[question];
                if (question === 'text') {
                    for (const textQuestion in value) {
                        if (!trainerCentricJson[trainerName].text[textQuestion]) trainerCentricJson[trainerName].text[textQuestion] = [];
                        trainerCentricJson[trainerName].text[textQuestion].push(value[textQuestion]);
                    }
                } else {
                    if (!trainerCentricJson[trainerName][question]) trainerCentricJson[trainerName][question] = [];
                    trainerCentricJson[trainerName][question].push(value);
                }
            }
        });
    }
    const finalResult = {};
    Object.keys(trainerCentricJson).forEach(key => {
        if (isNaN(parseInt(key)) && key !== 'trainers' && key !== 'trainer') {
            finalResult[key] = trainerCentricJson[key];
        }
    });
    return finalResult;
}