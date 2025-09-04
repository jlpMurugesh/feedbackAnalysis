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

// --- DOM Elements & Global State ---
const reportIdDisplay = document.getElementById('report-id-display');
const batchNameInput = document.getElementById('batch-name');
const feedbackTitleInput = document.getElementById('feedback-title');
const downloadPdfButton = document.getElementById('download-pdf-button');
const statusMessage = document.getElementById('status-message');

let reportData = null;
let reportId = null;

const RATING_MAP = { 'Excellent': 5, 'Very Good': 4, 'Good': 3, 'Average': 2, 'Poor': 1 };
const REVERSE_RATING_MAP = { 5: 'Excellent', 4: 'Very Good', 3: 'Good', 2: 'Average', 1: 'Poor' };

// --- 2. ON PAGE LOAD ---
window.onload = () => {
    auth.onAuthStateChanged(user => {
        if (!user) { window.location.href = '../User-authentication/index.html'; return; }
        const params = new URLSearchParams(window.location.search);
        reportId = params.get('reportId');
        if (!reportId) { showStatus('Error: No report ID provided.', true); return; }
        reportIdDisplay.textContent = `Report ID: ${reportId}`;
        fetchReportData(reportId);
    });
};

async function fetchReportData(id) {
    try {
        const docRef = db.collection("feedbackReports").doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            reportData = docSnap.data();
            downloadPdfButton.disabled = false;
            showStatus('Report data loaded successfully. Enter details to generate.', false);
        } else {
            showStatus(`Error: Report with ID "${id}" not found.`, true);
        }
    } catch (error) {
        showStatus(`Error fetching data: ${error.message}`, true);
    }
}

downloadPdfButton.addEventListener('click', handlePdfGeneration);

// --- 3. GEMINI API INTEGRATION ---
async function getAiSummary(comments) {
    const GEMINI_API_KEY = 'AIzaSyD2TbTEtF9t3l0GA-p6dXmXAQ3XSmkOteQ';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GOOGLE_AI_STUDIO_KEY_HERE') {
        return "AI summary is disabled. Please add your Gemini API key in script.js.";
    }

    const prompt = `

        {
            task: "Go thorugh the feedback comments and give me the unique comments by going thorugh all of them. Remove the duplicate ones/the comments which try to imply the same thing"
            outputFormat: "Only the comments that I gave as input below. No labeling of titles or anything of that sort. Just the original comments given by me but by removing the redundant comment. Also give me only the top 5 comments which seem relevant. Give as bullet points "
        }

        Feedback Comments:
        ${comments.map((c) => `- ${c}`).join("\n")}
    `;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error.message || 'API request failed'); }
        const data = await response.json();
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else { return "AI returned an unexpected response format."; }
    } catch (error) {
        console.error("Error fetching AI summary:", error);
        return `Could not generate AI summary. Error: ${error.message}`;
    }
}

// --- 4. PDF GENERATION LOGIC (FINAL, ROBUST VERSION) ---
async function handlePdfGeneration() {
    const batchName = batchNameInput.value.trim();
    const feedbackTitle = feedbackTitleInput.value.trim();
    if (!batchName || !feedbackTitle) { showStatus('Please fill in both Batch Name and Feedback Title.', true); return; }
    downloadPdfButton.disabled = true;
    showStatus('Generating report(s)... Please wait.', false);
    const trainerNames = Object.keys(reportData);
    if (trainerNames.length > 1) {
        const zip = new JSZip();
        for (const trainerName of trainerNames) {
            showStatus(`Generating PDF for ${trainerName}...`, false);
            const trainerData = reportData[trainerName];
            const pdfBlob = await createPdfForTrainer(trainerName, trainerData, batchName, feedbackTitle);
            zip.file(`${trainerName}_Feedback.pdf`, pdfBlob);
        }
        showStatus('Zipping files...', false);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        triggerDownload(zipBlob, `${reportId}_Feedback_Reports.zip`);
    } else if (trainerNames.length === 1) {
        const trainerName = trainerNames[0];
        const trainerData = reportData[trainerName];
        const pdfBlob = await createPdfForTrainer(trainerName, trainerData, batchName, feedbackTitle);
        triggerDownload(pdfBlob, `${trainerName}_Feedback.pdf`);
    }
    showStatus('Download complete!', false);
    downloadPdfButton.disabled = false;
}

async function createPdfForTrainer(trainerName, trainerData, batchName, feedbackTitle) {
    // 1. Create a temporary, isolated container
    const tempContainer = document.createElement('div');
    tempContainer.id = 'pdf-template-container'; // Use the ID to apply styles
    document.body.appendChild(tempContainer);

    // 2. Generate and inject the HTML for this specific trainer (NOW ASYNC)
    tempContainer.innerHTML = await generateReportHtml(trainerName, trainerData, batchName, feedbackTitle);
    
    // 3. Wait for the browser to fully render the content
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Capture the canvas from the specific element inside the temp container
    const reportElement = tempContainer.querySelector('.report-page');
    const canvas = await html2canvas(reportElement, { scale: 2 });
    
    // 5. Clean up the DOM immediately after capture
    document.body.removeChild(tempContainer);

    // 6. Generate and return the PDF blob
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF({ orientation: 'p', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    return pdf.output('blob');
}

function triggerDownload(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Update generateReportHtml to be async and call getAiSummary
async function generateReportHtml(trainerName, trainerData, batchName, feedbackTitle) {
    // FIX 2: Filter out unwanted keys like 'Last modified time'
    const questions = Object.keys(trainerData)
        .filter(k => k !== 'text' && k !== 'commonQuestions' && k.toLowerCase() !== 'last modified time');

    let totalTraineeCount = 0;
    const questionStats = {};
    let overallRatingSum = 0;
    let totalRatingsCount = 0;
    
    questions.forEach(q => {
        const responses = trainerData[q];
        if (responses.length > totalTraineeCount) totalTraineeCount = responses.length;
        questionStats[q] = { 'Excellent': 0, 'Very Good': 0, 'Good': 0, 'Average': 0, 'Poor': 0 };
        responses.forEach(res => {
            if (questionStats[q][res] !== undefined) {
                questionStats[q][res]++;
                overallRatingSum += RATING_MAP[res] || 0;
                totalRatingsCount++;
            }
        });
    });

    const overallProgramRating = totalRatingsCount > 0 ? (overallRatingSum / totalRatingsCount).toFixed(2) : 'N/A';

    // FIX 1: DYNAMIC GRID STYLING
    const numQuestions = questions.length;
    let flexBasis = 'calc(25% - 20px)'; // Default to 4 columns
    if (numQuestions <= 3) {
        flexBasis = 'calc(33.333% - 20px)'; // 3 columns
    } else if (numQuestions === 5 || numQuestions === 6) {
        flexBasis = 'calc(33.333% - 20px)'; // 3 columns for 5 or 6 items
    } else if (numQuestions === 7) {
        flexBasis = 'calc(25% - 20px)'; // 4 columns looks better for 7
    }

    let questionsHtml = '';
    questions.forEach(q => {
        const stats = questionStats[q];
        questionsHtml += `
            <div class="question-card" style="flex-basis: ${flexBasis};">
                <div class="question-title">${q}</div>
                <table class="question-table">
                    <tbody>
                        <tr><td>Excellent</td><td>${stats['Excellent']}</td></tr>
                        <tr><td>Very Good</td><td>${stats['Very Good']}</td></tr>
                        <tr><td>Good</td><td>${stats['Good']}</td></tr>
                        <tr><td>Average</td><td>${stats['Average']}</td></tr>
                        <tr><td>Poor</td><td>${stats['Poor']}</td></tr>
                        <tr><td><strong>Total responded trainees</strong></td><td><strong>${trainerData[q].length}</strong></td></tr>
                    </tbody>
                </table>
            </div>
        `;
    });

    // FIX 3: DYNAMIC TEXTUAL QUESTIONS WITH AI SUMMARY
    let commentsHtml = '';
    if (trainerData.text) {
        for (const question in trainerData.text) {
            const allResponses = trainerData.text[question];
            // Get unique, non-empty responses
            const uniqueResponses = Array.from(new Set(allResponses.filter(res => res && res.trim() !== '')));
            
            let responseList = '<ul>';
            uniqueResponses.forEach(res => {
                responseList += `<li>${res}</li>`;
            });
            responseList += '</ul>';

            // Generate AI Summary for this question's responses
            let aiSummaryHtml = '';
            
            if (uniqueResponses.length > 0) {
    try {
        showStatus(`Generating AI summary for "${question}"...`, false);
        const aiSummary = await getAiSummary(uniqueResponses);

        // Split summary into lines, filter non-empty, replace * with →, and wrap in <li>
        const bulletLines = aiSummary
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('*') || line.startsWith('-'))
            .map(line => line.replace(/^(\*|-)/, ''))
            .map(line => `<li>${line}</li>`)
            .join('');

        aiSummaryHtml = `
            <div class="ai-summary">
                <strong>AI Summary (Top 5 Relevant Comments):</strong>
                <br>
                <ul class="ai-summary-list">
                    ${bulletLines}
                </ul>
            </div>
        `;
    } catch (error) {
        console.error('Error generating AI summary:', error);
        aiSummaryHtml = `
            <div class="ai-summary">
                <strong>AI Summary:</strong>
                <p style="color: #dc3545;">Could not generate AI summary: ${error.message}</p>
            </div>
        `;
    }
}

            commentsHtml += `
                <div class="comments-section">
                    <div class="comments-header">${question.trim()} (Comments by trainees)</div>
                    <div class="comments-body">
                        ${aiSummaryHtml}
                    </div>
                </div>
            `;
        }
    }

    return `
        <div class="report-page">
            <div class="report-header">ILP - (${feedbackTitle})</div>
            <table class="info-table">
                <thead><tr><th>Batch Name</th><th>Total Trainee Count</th><th>Trainer Name</th><th>Overall Program Rating—Out of 5</th></tr></thead>
                <tbody><tr><td>${batchName}</td><td>${totalTraineeCount}</td><td>${trainerName}</td><td>${overallProgramRating}</td></tr></tbody>
            </table>
            <div class="questions-grid">${questionsHtml}</div>
            ${commentsHtml}
            
            
        </div>
    `;
}

// --- 6. UTILITY FUNCTIONS ---
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? '#dc3545' : '#28a745';
}




