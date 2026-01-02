# Phase 1 Testing Guide

## 🧪 Quick Test Checklist

Before running real tests, ensure the app is properly configured:

### Prerequisites

1. **Environment Setup**
   ```bash
   # Copy .env.example to .env
   cp .env.example .env
   
   # Edit .env and add:
   # - VITE_CONVEX_URL (from `npx convex dev`)
   # - ASSEMBLYAI_API_KEY (from assemblyai.com)
   ```

2. **Start Services**
   ```bash
   # Terminal 1: Convex backend
   pnpm convex:dev
   
   # Terminal 2: Electron app
   pnpm dev
   ```

---

## ✅ Feature Tests

### Test 1: Audio Recording

**Steps:**
1. Click "Home" to enter Recording Mode
2. Select a microphone from the dropdown
3. Click the red Record button
4. Speak into the microphone for 10-15 seconds
5. Observe:
   - ✅ Waveform animates based on your voice
   - ✅ Recording timer increments
   - ✅ Recording indicator shows "Recording..."

6. Click Pause button
7. Observe:
   - ✅ Waveform stops animating
   - ✅ Status shows "Paused"
   - ✅ Timer stops incrementing

8. Click Resume
9. Observe:
   - ✅ Waveform resumes
   - ✅ Timer continues from where it paused

10. Click Stop (square button)
11. Observe:
    - ✅ Recording ends
    - ✅ Controls reset

**Expected Result:** Audio file saved to `{userData}/recordings/{sessionId}.webm`

---

### Test 2: Live Transcription

**Steps:**
1. Start a recording (Test 1, steps 1-3)
2. Speak clearly: "This is a test of the live transcription system."
3. Wait 1-2 seconds
4. Observe:
   - ✅ Text appears in Live Transcript area
   - ✅ Partial transcripts shown in italic
   - ✅ Final transcripts shown in normal text
   - ✅ Blinking cursor on latest partial

5. Speak more: "It should handle multiple sentences and pause detection."
6. Observe:
   - ✅ New segments appear
   - ✅ Auto-scrolls to bottom

**Expected Result:** Transcription accuracy > 90% for clear speech

**Note:** If transcription doesn't appear:
- Check Convex DevTools for errors
- Verify `ASSEMBLYAI_API_KEY` in `.env`
- Check network connection

---

### Test 3: Session Persistence

**Steps:**
1. Complete a recording (Tests 1-2)
2. Click Stop
3. Switch to "Study" view
4. Observe:
   - ✅ New session appears in sidebar
   - ✅ Shows correct title (auto-generated with timestamp)
   - ✅ Shows duration
   - ✅ Shows date

5. Quit the Electron app completely
6. Restart: `pnpm dev`
7. Switch to Study view
8. Observe:
   - ✅ Session still exists
   - ✅ All metadata intact

**Expected Result:** Sessions persist across app restarts

---

### Test 4: Audio Playback

**Steps:**
1. In Study view, select a session with audio
2. Observe playback controls appear
3. Click Play button
4. Observe:
   - ✅ Waveform animates
   - ✅ Timer advances
   - ✅ Seek slider moves
   - ✅ Audio plays correctly

5. Click a transcript segment
6. Observe:
   - ✅ Audio seeks to that segment's timestamp
   - ✅ Segment highlights

7. Drag seek slider
8. Observe:
   - ✅ Audio position updates
   - ✅ Transcript highlights correct segment

**Expected Result:** Playback syncs perfectly with transcript

---

### Test 5: Pause/Resume with Timestamps

**Steps:**
1. Start recording
2. Speak: "First segment"
3. Wait for transcript
4. Pause recording
5. Wait 5 seconds (don't speak)
6. Resume recording
7. Speak: "Second segment after pause"
8. Stop recording
9. Play back in Study view
10. Observe:
    - ✅ No 5-second gap in audio
    - ✅ Timestamps are continuous
    - ✅ Both segments transcribed correctly

**Expected Result:** Pause doesn't create audio gaps

---

### Test 6: Long Recording (Optional)

**⚠️ Warning:** This test takes 50+ minutes

**Steps:**
1. Start recording
2. Play a podcast or lecture video
3. Let it record for 50+ minutes
4. Monitor:
   - Memory usage (Activity Monitor / Task Manager)
   - Transcription latency
   - UI responsiveness

5. Stop recording
6. Check:
   - ✅ No crashes
   - ✅ Audio file size reasonable (~5-10 MB per minute)
   - ✅ Transcript complete

**Expected Result:** App handles long recordings without issues

---

### Test 7: Trash System

**Steps:**
1. In Study view, right-click a session
2. Select "Delete" (if available, or modify to add context menu)
3. Check Convex dashboard:
   - ✅ `isDeleted: true`
   - ✅ `deletedAt` timestamp set

4. Query deleted sessions:
   ```typescript
   // In Convex dashboard > Functions > Query
   sessions.listDeleted({ userId: "anonymous-user" })
   ```

5. Verify:
   - ✅ Deleted session appears

6. Restore (if implemented):
   ```typescript
   sessions.restore({ id: "<session-id>" })
   ```

**Expected Result:** Soft delete preserves data; cron cleanup happens daily

---

## 🐛 Debugging Tips

### Transcription Not Working

1. **Check API Key:**
   ```bash
   # In terminal running Electron
   echo $ASSEMBLYAI_API_KEY
   ```

2. **Check Token Request:**
   - Open DevTools (Cmd+Option+I)
   - Console tab
   - Look for "AssemblyAI connection opened" or errors

3. **Test API Key Manually:**
   ```bash
   curl -X POST https://api.assemblyai.com/v2/realtime/token \
     -H "authorization: YOUR_API_KEY"
   ```

### Audio Not Recording

1. **Check Permissions:**
   - System Preferences > Security & Privacy > Microphone
   - Ensure Electron/your app is allowed

2. **Check Device List:**
   - Console should show devices from `enumerateDevices()`
   - If empty, permissions not granted

### Sessions Not Appearing

1. **Check Convex Connection:**
   - Convex dashboard shows active connections
   - Terminal 1 shows "Convex dev server running"

2. **Check User ID:**
   - Currently hardcoded as `"anonymous-user"`
   - All sessions should use same ID

---

## 📊 Performance Benchmarks

### Expected Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Transcription Latency | < 2 sec | _test_ |
| Memory (10 min recording) | < 200 MB | _test_ |
| CPU (during recording) | < 30% | _test_ |
| Audio File Size (1 min) | ~1 MB | _test_ |

Fill in "Actual" after testing!

---

## ✅ Phase 1 Sign-Off

Once all tests pass:

- [ ] Audio recording works for 50+ minutes
- [ ] Live transcription is accurate and fast
- [ ] Pause/resume maintains correct timestamps
- [ ] Sessions persist after restart
- [ ] Playback syncs with transcript
- [ ] Themes apply correctly
- [ ] Panels resize smoothly

**Sign-off Date:** _____________  
**Tested By:** _____________

---

**Ready to proceed to Phase 2!** 🎉

Next: Begin implementing TipTap editor and AI note generation.
