/**
 * ScribeCat Canvas Extension - Background Service Worker
 * Updates badge when courses are detected.
 */

// Set default badge on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ scribecatCourses: [], scribecatLastDetected: null });
  chrome.action.setBadgeBackgroundColor({ color: '#DEA549' });
});

// Listen for course detection from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'COURSES_DETECTED' && typeof message.count === 'number') {
    chrome.action.setBadgeText({ text: String(message.count) });
  }
});
