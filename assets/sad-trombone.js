// Create audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Create oscillator
const oscillator = audioContext.createOscillator();
const gainNode = audioContext.createGain();

// Connect nodes
oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

// Set up oscillator
oscillator.type = 'sine';
oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // Start at A4
oscillator.frequency.linearRampToValueAtTime(220, audioContext.currentTime + 1); // Slide down to A3

// Set up gain
gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);

// Start and stop
oscillator.start();
oscillator.stop(audioContext.currentTime + 1);

// Create WAV file
const sampleRate = 44100;
const duration = 1; // 1 second
const numSamples = sampleRate * duration;
const audioData = new Float32Array(numSamples);

// Generate audio data
for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const frequency = 440 - (220 * t); // Linear frequency sweep
    audioData[i] = 0.3 * Math.sin(2 * Math.PI * frequency * t);
}

// Convert to WAV format
const wavData = new Uint8Array(44 + audioData.length * 2);
const view = new DataView(wavData.buffer);

// Write WAV header
const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

writeString(0, 'RIFF');
view.setUint32(4, 36 + audioData.length * 2, true);
writeString(8, 'WAVE');
writeString(12, 'fmt ');
view.setUint32(16, 16, true);
view.setUint16(20, 1, true);
view.setUint16(22, 1, true);
view.setUint32(24, sampleRate, true);
view.setUint32(28, sampleRate * 2, true);
view.setUint16(32, 2, true);
view.setUint16(34, 16, true);
writeString(36, 'data');
view.setUint32(40, audioData.length * 2, true);

// Write audio data
for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(44 + i * 2, sample * 0x7FFF, true);
}

// Create blob and download
const blob = new Blob([wavData], { type: 'audio/wav' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'sad-trombone.wav';
a.click(); 