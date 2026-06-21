/**
 * FarmRise Automated Notification & Sound Chime System
 * Designed for PWA Chrome installation or standard browser compatibility
 */

// Synthesize premium sound effects with Web Audio API without needing external static mp3 files
export function playNotificationChime(type: "general" | "success" | "admin" | "milestone" = "general") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    // Create new audio context instance on click or background event trigger
    const ctx = new AudioContextClass();
    
    if (type === "general" || type === "success") {
      // Crystal double high-chime
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = "sine";
      osc2.type = "triangle";
      
      // Chime note sequence: E6 (1318.51 Hz) to A6 (1760.00 Hz)
      osc1.frequency.setValueAtTime(1318.51, now);
      osc1.frequency.exponentialRampToValueAtTime(1760.00, now + 0.12);
      
      osc2.frequency.setValueAtTime(659.25, now);
      osc2.frequency.exponentialRampToValueAtTime(880.00, now + 0.12);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);
    } else if (type === "admin") {
      // Metallic golden coin cascade ("Ka-ching!") for administrative actions
      const now = ctx.currentTime;
      const notes = [987.77, 1318.51, 1567.98, 1975.53]; // B5 -> E6 -> G6 -> B6 (metallic ring)
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Slightly mix sine and triangle for high-quality clink
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        osc.frequency.exponentialRampToValueAtTime(freq + (idx * 20), now + idx * 0.06 + 0.1);
        
        gain.gain.setValueAtTime(0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.35);
      });
    } else if (type === "milestone") {
      // Triumph milestone fanfare (E5 -> G5 -> C6 -> E6 stacked sound)
      const now = ctx.currentTime;
      const notes = [659.25, 783.99, 1046.50, 1318.51];
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.08 + 0.4);
        
        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.65);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.7);
      });
    }
  } catch (err) {
    console.warn("[FarmRise Chime] AudioContext synthesis failed: ", err);
  }
}

// Request and request user prompt for Chrome Notification API
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("[FarmRise Push] System notifications not supported in this environment.");
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("[FarmRise Push] Native browser Notification access granted!");
      // Play brief test general chime to verify Web Audio Context initialization
      playNotificationChime("general");
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[FarmRise Push] Notification permission request error: ", err);
    return false;
  }
}

// Push system alert native browser/PWA level alerts with sound chimes
export function sendBrowserPushNotification(title: string, message: string, type: "general" | "success" | "admin" | "milestone" = "general") {
  // 1. Play synthesized custom audio alert chime
  playNotificationChime(type);
  
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  // 2. Fire the native Browser push popup card
  if (Notification.permission === "granted") {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          const swOptions = {
            body: message,
            icon: "/icon.png",
            badge: "/icon.png",
            tag: "farmrise-alerts-" + type,
            vibrate: [100, 50, 100],
            silent: true // Prefer custom synthesized chime audio over default metal vibration sound
          };
          reg.showNotification(title, swOptions as any);
        });
      } else {
        const notifOptions = {
          body: message,
          icon: "/icon.png"
        };
        new Notification(title, notifOptions);
      }
    } catch (err) {
      try {
        const fallbackOptions = {
          body: message,
          icon: "/icon.png"
        };
        new Notification(title, fallbackOptions);
      } catch (innerErr) {
        console.warn("[FarmRise Push] Failed showing native notification card", innerErr);
      }
    }
  }
}
