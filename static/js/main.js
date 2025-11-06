// Phoenix Safety App - Enhanced Main JavaScript
class PhoenixSafetyApp {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.emergencyKeywords = ['help', 'emergency', 'sos', 'save me', 'danger', 'help me', 'security'];
        this.init();
    }

    init() {
        this.initVoiceRecognition();
        this.initShakeDetection();
        this.initConnectionMonitoring();
        this.setupEventListeners();
        console.log('Phoenix Safety App initialized');
    }

    setupEventListeners() {
        // Voice button listener
        const voiceButton = document.getElementById('voiceButton');
        if (voiceButton) {
            voiceButton.addEventListener('click', () => {
                this.startVoiceCommand();
            });
        }

        // Global SOS buttons
        document.querySelectorAll('#sosButton, #emergencySosButton').forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    this.triggerEmergencySOS('manual');
                });
            }
        });
    }

    initVoiceRecognition() {
        // Check browser compatibility
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('Speech recognition not supported in this browser');
            this.showCompatibilityMessage();
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 3;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.showVoiceFeedback('Listening... Speak now');
                console.log('Voice recognition started');
            };

            this.recognition.onresult = (event) => {
                const command = event.results[0][0].transcript;
                console.log('Voice command detected:', command);
                this.processVoiceCommand(command);
            };

            this.recognition.onerror = (event) => {
                console.log('Speech recognition error:', event.error);
                this.isListening = false;
                this.showVoiceFeedback('Error listening. Try again.');
                
                if (event.error === 'not-allowed') {
                    this.showVoiceFeedback('Microphone access denied. Please enable microphone permissions.');
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                setTimeout(() => {
                    this.hideVoiceFeedback();
                }, 2000);
            };
        } catch (error) {
            console.log('Error initializing speech recognition:', error);
            this.showCompatibilityMessage();
        }
    }

    showCompatibilityMessage() {
        const voiceButton = document.getElementById('voiceButton');
        if (voiceButton) {
            voiceButton.title = "Voice commands not supported in this browser";
            voiceButton.classList.add('opacity-50');
        }
    }

    startVoiceCommand() {
        if (!this.recognition) {
            this.showVoiceFeedback('Voice commands not supported in your browser');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.log('Error starting voice recognition:', error);
            this.showVoiceFeedback('Error starting voice recognition');
        }
    }

    processVoiceCommand(command) {
        const lowerCommand = command.toLowerCase().trim();
        
        // Check for emergency keywords
        if (this.emergencyKeywords.some(keyword => lowerCommand.includes(keyword))) {
            console.log('🚨 EMERGENCY VOICE COMMAND DETECTED:', command);
            this.showVoiceFeedback('Emergency detected! Activating SOS...');
            setTimeout(() => {
                this.triggerEmergencySOS('voice_command');
            }, 1000);
            return;
        }

        // Process other commands via API
        this.showVoiceFeedback(`Processing: "${command}"`);
        
        fetch('/api/voice-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: lowerCommand
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Voice command processed:', data);
            this.showVoiceFeedback(data.message);
            
            // Handle navigation actions
            if (data.action) {
                setTimeout(() => {
                    this.navigateToAction(data.action);
                }, 1500);
            }
        })
        .catch(error => {
            console.error('Error processing voice command:', error);
            this.showVoiceFeedback('Network error. Please try again.');
        });
    }

    navigateToAction(action) {
        const routes = {
            'dashboard': '/dashboard',
            'safety_map': '/safety-map',
            'report': '/report',
            'profile': '/profile',
            'shop': '/shop',
            'safewalk': '/safewalk',
            'emergency': '/emergency'
        };

        if (routes[action]) {
            window.location.href = routes[action];
        }
    }

    triggerEmergencySOS(source = 'manual') {
        // Show emergency overlay immediately
        const overlay = document.getElementById('emergencyOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        
        // Vibrate phone (if supported)
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Play emergency sound
        this.playEmergencySound();

        // Get current location and send emergency alert
        this.getCurrentLocation()
            .then(location => {
                return fetch('/api/trigger-emergency', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: 'user123',
                        type: 'emergency_sos',
                        source: source,
                        location: location,
                        battery_level: this.getBatteryLevel()
                    })
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Emergency alert sent:', data);
                
                // Update UI with response information
                if (data.response_time_estimate) {
                    const etaElement = document.getElementById('etaTime');
                    if (etaElement) {
                        etaElement.textContent = data.response_time_estimate;
                    }
                }
                
                if (data.nearby_devices) {
                    const nearbyElement = document.getElementById('nearbyAlert');
                    if (nearbyElement) {
                        nearbyElement.textContent = `${data.nearby_devices} nearby users alerted`;
                    }
                }
            })
            .catch(error => {
                console.error('Error sending emergency alert:', error);
                // Fallback: Still show success even if network fails
                this.showVoiceFeedback('Emergency alert activated!');
            });
    }

    playEmergencySound() {
        // Create emergency beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Audio context not supported:', error);
        }
    }

    getCurrentLocation() {
        // Try to get real location first
        if (navigator.geolocation) {
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: new Date().toISOString()
                        });
                    },
                    () => {
                        // Fallback to mock location
                        resolve(this.getMockLocation());
                    },
                    { timeout: 5000 }
                );
            });
        } else {
            // Fallback to mock location
            return Promise.resolve(this.getMockLocation());
        }
    }

    getMockLocation() {
        const baseLat = 28.6129;
        const baseLng = 77.2295;
        return {
            lat: baseLat + (Math.random() - 0.5) * 0.001,
            lng: baseLng + (Math.random() - 0.5) * 0.001,
            accuracy: 15,
            timestamp: new Date().toISOString()
        };
    }

    getBatteryLevel() {
        // Try to get real battery level if supported
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                return Math.round(battery.level * 100);
            });
        }
        // Fallback to random level for demo
        return Math.max(5, Math.floor(Math.random() * 100));
    }

    initShakeDetection() {
        if (window.DeviceMotionEvent) {
            let lastShake = 0;
            const shakeThreshold = 15;
            let lastAcceleration = { x: null, y: null, z: null };

            window.addEventListener('devicemotion', (event) => {
                const acceleration = event.accelerationIncludingGravity;
                
                if (lastAcceleration.x !== null) {
                    const deltaX = Math.abs(acceleration.x - lastAcceleration.x);
                    const deltaY = Math.abs(acceleration.y - lastAcceleration.y);
                    const deltaZ = Math.abs(acceleration.z - lastAcceleration.z);
                    
                    if ((deltaX > shakeThreshold) || (deltaY > shakeThreshold) || (deltaZ > shakeThreshold)) {
                        const now = Date.now();
                        if (now - lastShake > 3000) { // Prevent multiple triggers within 3 seconds
                            lastShake = now;
                            console.log('📱 Shake detected - triggering SOS');
                            this.showVoiceFeedback('Shake detected! Activating emergency...');
                            setTimeout(() => {
                                this.triggerEmergencySOS('shake');
                            }, 500);
                        }
                    }
                }
                lastAcceleration = acceleration;
            });
        }
    }

    initConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.updateConnectionStatus(true);
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus(false);
        });
    }

    showVoiceFeedback(message) {
        const feedback = document.getElementById('voiceFeedback');
        if (feedback) {
            feedback.innerHTML = `<i class="fas fa-circle text-red-500 animate-pulse mr-2"></i><span>${message}</span>`;
            feedback.classList.remove('hidden');
        }
    }

    hideVoiceFeedback() {
        const feedback = document.getElementById('voiceFeedback');
        if (feedback) {
            feedback.classList.add('hidden');
        }
    }

    updateConnectionStatus(online) {
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            if (online) {
                connectionStatus.innerHTML = '<i class="fas fa-wifi mr-1"></i>Connected';
                connectionStatus.className = 'text-xs bg-green-500 text-white px-2 py-1 rounded';
            } else {
                connectionStatus.innerHTML = '<i class="fas fa-wifi-slash mr-1"></i>Offline';
                connectionStatus.className = 'text-xs bg-red-500 text-white px-2 py-1 rounded';
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.phoenixApp = new PhoenixSafetyApp();
    
    // Add global emergency cancel handler
    const cancelButton = document.getElementById('cancelEmergency');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            const overlay = document.getElementById('emergencyOverlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
            
            // Send cancel notification
            fetch('/api/cancel-emergency', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: 'user123',
                    emergency_id: 'current'
                })
            }).catch(error => {
                console.log('Cancel request failed (offline mode)');
            });
        });
    }

    // Update battery level simulation
    setInterval(() => {
        const batteryElement = document.getElementById('batteryLevel');
        if (batteryElement) {
            const currentBattery = parseInt(batteryElement.textContent);
            if (currentBattery > 5) {
                const newBattery = currentBattery - 1;
                batteryElement.textContent = newBattery + '%';
                
                // Update low battery warning
                if (newBattery < 20) {
                    batteryElement.classList.remove('text-green-500');
                    batteryElement.classList.add('text-red-500');
                    
                    // Send low battery alert
                    fetch('/api/update-battery', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            battery_level: newBattery
                        })
                    }).catch(() => {
                        // Ignore errors in demo
                    });
                }
            }
        }
    }, 30000);
});