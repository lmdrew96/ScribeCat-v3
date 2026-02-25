/**
 * ScribeCat Canvas Extension - Popup Script
 * Displays detected courses and provides copy-to-clipboard.
 */

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const coursesSection = document.getElementById('courses-section');
const courseList = document.getElementById('course-list');
const emptyState = document.getElementById('empty-state');
const copyBtn = document.getElementById('copy-btn');

let detectedCourses = [];

/** Check if the active tab is a Canvas page */
async function checkCanvasConnection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isCanvas = tab?.url?.includes('instructure.com');

    statusDot.className = `status-dot ${isCanvas ? 'connected' : 'disconnected'}`;
    statusText.textContent = isCanvas ? 'Connected to Canvas' : 'Not on a Canvas page';
  } catch {
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = 'Unable to detect page';
  }
}

/** Load courses from storage and display them */
async function loadCourses() {
  const data = await chrome.storage.local.get(['scribecatCourses']);
  detectedCourses = data.scribecatCourses || [];

  if (detectedCourses.length > 0) {
    coursesSection.style.display = 'block';
    emptyState.style.display = 'none';
    copyBtn.style.display = 'block';

    courseList.innerHTML = '';
    for (const course of detectedCourses) {
      const li = document.createElement('li');
      li.textContent = course;
      courseList.appendChild(li);
    }
  } else {
    coursesSection.style.display = 'none';
    emptyState.style.display = 'block';
    copyBtn.style.display = 'none';
  }
}

/** Copy course list as JSON to clipboard */
copyBtn.addEventListener('click', async () => {
  try {
    const json = JSON.stringify(detectedCourses);
    await navigator.clipboard.writeText(json);

    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');

    setTimeout(() => {
      copyBtn.textContent = 'Copy to Clipboard';
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch {
    copyBtn.textContent = 'Copy failed';
    setTimeout(() => {
      copyBtn.textContent = 'Copy to Clipboard';
    }, 2000);
  }
});

// Initialize
checkCanvasConnection();
loadCourses();
