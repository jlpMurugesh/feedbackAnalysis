// --- 1. INITIALIZATION ---

// Step 1: Paste your Firebase Configuration here
const firebaseConfig = {
  apiKey: "AIzaSyBWN8f4kSyYQj_5F35DtL9Drw9za46kmUg",
  authDomain: "feedbackanalysis-28073.firebaseapp.com",
  projectId: "feedbackanalysis-28073",
  storageBucket: "feedbackanalysis-28073.firebasestorage.app",
  messagingSenderId: "542476452217",
  appId: "1:542476452217:web:63f66e4a57412b8378afa8",
  measurementId: "G-KJE7GJX71G"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const csvFileInput = document.getElementById('csv-file-input');
const fileNameSpan = document.getElementById('file-name');
const processButton = document.getElementById('process-button');
const downloadJsonButton = document.getElementById('download-json-button');
const statusMessage = document.getElementById('status-message');
const singleTrainerCard = document.getElementById('single-trainer-card');
const trainerNameInput = document.getElementById('trainer-name');

// App state
let processedJsonData = null;
let uploadedFileName = '';

// --- 2. AUTHENTICATION GUARD ---

auth.onAuthStateChanged(user => {
    if (!user) {
        // If the user is not logged in, redirect them to the login page.
        console.log("No user logged in. Redirecting...");
        window.location.href = '../User authentication/index.html';
    } else {
        console.log("User is logged in:", user.email);
    }
});

// --- 3. EVENT LISTENERS ---

csvFileInput.addEventListener('change', handleFileSelect);
processButton.addEventListener('click', uploadDataToFirebase);
downloadJsonButton.addEventListener('click', downloadJsonFile);

// --- 4. CORE FUNCTIONS ---

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    resetState();
    fileNameSpan.textContent = file.name;
    uploadedFileName = file.name.split('.').slice(0, -1).join('.'); // a.csv -> a

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            try {
                processParsedData(results.data, results.meta.fields);
                processButton.disabled = false;
                downloadJsonButton.disabled = false;
            } catch (error) {
                showStatus(error.message, true);
                resetState();
            }
        },
        error: (error) => {
            showStatus(`CSV Parsing Error: ${error.message}`, true);
            resetState();
        }
    });
}

function processParsedData(data, headers) {
    showStatus('CSV parsed successfully. Ready to process.', false);
    
    // Logic to detect if it's a multi-trainer form
    const isMultiTrainer = headers.some(h => h.includes('.') && h.startsWith('The trainer'));

    if (isMultiTrainer) {
        singleTrainerCard.classList.add('hidden');
        processedJsonData = transformMultiTrainerData(data, headers);
    } else {
        singleTrainerCard.classList.remove('hidden');
        // For single trainer, we need the user to click the button
        // The transformation will happen inside the upload function
        processedJsonData = { type: 'single', data, headers };
    }
}

function transformMultiTrainerData(data, headers) {
    const output = { trainers: [] };
    const trainers = new Set();
    const trainerQuestions = {};

    // Identify trainers and their specific questions
    headers.forEach(header => {
        if (header.includes('.') && header.startsWith('The trainer')) {
            const parts = header.split('.');
            const trainerName = parts[parts.length - 1].trim();
            trainers.add(trainerName);

            // Store the original question text without the trainer name part
            const questionText = parts.slice(0, -1).join('.').trim();
            if (!trainerQuestions[trainerName]) {
                trainerQuestions[trainerName] = [];
            }
            trainerQuestions[trainerName].push({ originalHeader: header, questionText });
        }
    });
    output.trainers = Array.from(trainers);

    const mcqRatings = ['Excellent', 'Very Good', 'Good', 'Average', 'Poor'];
    
    data.forEach((row, index) => {
        if (!row.Id) return; // Skip if row is invalid

        const studentFeedback = { text: {} };
        
        // Initialize trainer objects
        output.trainers.forEach(name => studentFeedback[name] = {});

        for (const header in row) {
            const value = row[header];
            let handled = false;

            // 1. Handle Trainer-Specific Questions
            for (const trainerName in trainerQuestions) {
                const questionInfo = trainerQuestions[trainerName].find(q => q.originalHeader === header);
                if (questionInfo) {
                    studentFeedback[trainerName][questionInfo.questionText] = value;
                    handled = true;
                    break;
                }
            }
            if (handled) continue;

            // 2. Handle Text/Comment Questions
            if (header.toLowerCase().includes('what went well') || header.toLowerCase().includes('what needs improvement')) {
                studentFeedback.text[header] = value;
                handled = true;
            }
            if (handled) continue;

            // 3. Handle Common MCQs (not tied to a trainer)
            if (mcqRatings.includes(value) && !header.includes('.')) {
                studentFeedback[header] = value;
                handled = true;
            }
        }
        output[row.Id] = studentFeedback;
    });

    return output;
}

function transformSingleTrainerData(data, headers, trainerName) {
    const output = { trainer: trainerName };

    data.forEach(row => {
        if (!row.Id) return;

        const studentFeedback = { text: {} };
        for (const header in row) {
            const value = row[header];
            if (header.toLowerCase().includes('what went well') || header.toLowerCase().includes('what needs improvement')) {
                studentFeedback.text[header] = value;
            } else if (header !== 'Id' && header !== 'Start time' && header !== 'Completion time' && header !== 'Email' && header !== 'Name') {
                studentFeedback[header] = value;
            }
        }
        output[row.Id] = studentFeedback;
    });

    return output;
}

function uploadDataToFirebase() {
    if (!processedJsonData) {
        showStatus('No data to upload.', true);
        return;
    }

    let finalJsonData = processedJsonData;

    // If it's a single trainer form, transform it now
    if (processedJsonData.type === 'single') {
        const trainerName = trainerNameInput.value.trim();
        if (!trainerName) {
            showStatus('Please enter the trainer\'s name.', true);
            return;
        }
        finalJsonData = transformSingleTrainerData(processedJsonData.data, processedJsonData.headers, trainerName);
    }
    
    showStatus('Uploading to Firebase...', false);
    processButton.disabled = true;

    // Use the filename (without extension) as the document ID in Firestore
    db.collection("feedbackReports").doc(uploadedFileName).set(finalJsonData)
        .then(() => {
            showStatus('Successfully uploaded to Firestore!', false, 'status-success');
            processButton.disabled = false;
        })
        .catch((error) => {
            showStatus(`Error: ${error.message}`, true, 'status-error');
            console.error("Error writing document: ", error);
            processButton.disabled = false;
        });
}


function downloadJsonFile() {
    if (!processedJsonData) {
        showStatus('No data to download.', true);
        return;
    }

    let finalJsonData = processedJsonData;

    // Handle single trainer case for download as well
    if (processedJsonData.type === 'single') {
        const trainerName = trainerNameInput.value.trim() || 'SINGLE_TRAINER_NAME_NOT_SET';
        finalJsonData = transformSingleTrainerData(processedJsonData.data, processedJsonData.headers, trainerName);
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalJsonData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${uploadedFileName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showStatus('JSON file download initiated.', false);
}


// --- 5. UTILITY FUNCTIONS ---

function showStatus(message, isError = false, className = '') {
    statusMessage.textContent = message;
    statusMessage.className = isError ? 'status-error' : (className || '');
}

function resetState() {
    processedJsonData = null;
    uploadedFileName = '';
    fileNameSpan.textContent = 'No file selected';
    processButton.disabled = true;
    downloadJsonButton.disabled = true;
    singleTrainerCard.classList.add('hidden');
    trainerNameInput.value = '';
    showStatus('');
}