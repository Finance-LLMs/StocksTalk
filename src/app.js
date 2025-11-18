// --- src/app.js ---
import { Conversation } from '@elevenlabs/client';

// Global variables for Medical Debater interface
let selectedAgent = '';
let selectedLanguage = 'english'; // Default to English
let currentTopic = '';

let conversation = null;
let mouthAnimationInterval = null;
let currentMouthState = 'M130,170 Q150,175 170,170'; // closed mouth
let sqlQueryRequested = false;
let lastAIResponse = '';
let waitingForSQLResponse = false;

// Create the animated doctor avatar SVG
function createAvatarSVG() {
    return `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 18px; font-weight: 500; color: var(--dark-navy); text-align: center; padding: 20px;">
            Choose your SQL Analyst
        </div>
    `;
}

// Create celebrity avatar with video only
function createCelebrityAvatar(opponent) {
    // Map for character videos - this is the primary content
    const videoMap = {
        'nelson': 'nelson.mp4',
        'michelle': 'barbarella.mp4',
        'taylor': 'taylor.mp4',
        'akshat': 'akshat.mp4',
        'alex': 'alex.mp4',
        'sarah': 'sarah.mp4'

    };
    
    // Fallback image map - only used if video fails completely
    const imageMap = {
        'michelle': 'michelle.jpg',
        'nelson': 'nelson.jpg', 
        'taylor': 'taylor.jpg',
        'singapore_uncle': 'singapore_uncle.jpg',
    'akshat': 'akshat.jpg'
    };
    
    const videoSrc = videoMap[opponent];
    const imageSrc = imageMap[opponent];
    
    // If no video and no image, fallback to SVG avatar
    if (!videoSrc && !imageSrc) return createAvatarSVG();
    
    return `
        <div class="celebrity-avatar-container">
            ${videoSrc ? 
                `<video 
                    src="/static/videos/${videoSrc}" 
                    class="celebrity-video"
                    muted
                    loop
                    playsinline
                    preload="auto"
                    id="avatarVideo"
                    style="display: block; visibility: visible; opacity: 1; z-index: 10; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain;"
                ></video>` : ''}
            <div class="fallback-avatar" style="display: none;">
                ${createAvatarSVG()}
            </div>
            <div class="speaking-indicator" id="speakingIndicator">
                <div class="speaking-wave"></div>
                <div class="speaking-wave"></div>
                <div class="speaking-wave"></div>
            </div>
        </div>
    `;
}

// Initialize avatar
function initializeAvatar() {
    const avatarWrapper = document.getElementById('animatedAvatar');
    const selectedOpponent = getSelectedOpponent();
    
    if (avatarWrapper) {
        if (selectedOpponent) {
            // Set the avatar content
            avatarWrapper.innerHTML = createCelebrityAvatar(selectedOpponent);
            
            // Get the video element if it exists
            const videoElement = document.getElementById('avatarVideo');
            if (videoElement) {
                console.log(`Setting up video for ${selectedOpponent}`);
                
                // Set critical video properties
                videoElement.muted = true;
                videoElement.loop = true;
                videoElement.playsInline = true;
                videoElement.controls = false;
                videoElement.autoplay = false; // Don't autoplay on load
                
                // Force load and prime the video
                videoElement.load();
                videoElement.currentTime = 0;
                
                // Apply explicit styles to ensure visibility
                videoElement.style.display = 'block';
                videoElement.style.visibility = 'visible';
                videoElement.style.opacity = '1';
                videoElement.style.width = 'auto';
                videoElement.style.height = 'auto';
                videoElement.style.maxWidth = '100%';
                videoElement.style.maxHeight = '100%';
                videoElement.style.objectFit = 'contain';
                videoElement.style.zIndex = '10';
                videoElement.style.position = 'absolute';
                videoElement.style.top = '50%';
                videoElement.style.left = '50%';
                videoElement.style.transform = 'translate(-50%, -50%)';
                
                // Debug video status
                videoElement.addEventListener('loadedmetadata', () => {
                    console.log(`Video metadata loaded for ${selectedOpponent}:`, {
                        duration: videoElement.duration,
                        readyState: videoElement.readyState,
                        networkState: videoElement.networkState
                    });
                });
                
                videoElement.addEventListener('loadeddata', () => {
                    console.log(`Video data loaded for ${selectedOpponent}`);
                });
                
                videoElement.addEventListener('canplay', () => {
                    console.log(`Video can play now for ${selectedOpponent}`);
                });
                
                videoElement.addEventListener('canplaythrough', () => {
                    console.log(`Video can play through completely for ${selectedOpponent}`);
                });
                
                // Handle errors
                videoElement.addEventListener('error', (e) => {
                    console.error(`Error with video for ${selectedOpponent}:`, 
                        videoElement.error ? videoElement.error.code : 'unknown error',
                        e);
                    
                    // Show fallback SVG avatar on error
                    const fallbackAvatar = avatarWrapper.querySelector('.fallback-avatar');
                    if (fallbackAvatar) {
                        fallbackAvatar.style.display = 'block';
                        videoElement.style.display = 'none';
                    }
                });
                
                // Add play/pause event listeners for debugging
                videoElement.addEventListener('play', () => {
                    console.log(`Video started playing for ${selectedOpponent}`);
                });
                
                videoElement.addEventListener('pause', () => {
                    console.log(`Video paused for ${selectedOpponent}`);
                });
                
                // Force browser to preload video
                try {
                    // Try to briefly play and pause to prime the video buffer
                    setTimeout(() => {
                        console.log('Attempting to prime video for playback...');
                        const primePromise = videoElement.play();
                        if (primePromise !== undefined) {
                            primePromise.then(() => {
                                console.log(`Successfully primed video for ${selectedOpponent}`);
                                setTimeout(() => {
                                    videoElement.pause();
                                    videoElement.currentTime = 0;
                                    console.log('Video primed and ready at first frame');
                                }, 50);
                            }).catch(e => {
                                console.log(`Couldn't prime video: ${e} - will try again when speaking starts`);
                                // This is expected in some browsers that block autoplay
                            });
                        }
                    }, 300); // Increased delay for better loading
                } catch (err) {
                    console.log('Video priming error:', err);
                    // Ignore - we'll try again when speaking starts
                }
            }
        } else {
            avatarWrapper.innerHTML = createAvatarSVG();
        }
    }
}

// Get the currently selected opponent from buttons
function getSelectedOpponent() {
    const selectedButton = document.querySelector('.opponent-button.selected');
    return selectedButton ? selectedButton.getAttribute('data-opponent') : '';
}

// Preload videos for better performance
function preloadVideos(opponent) {
    // Map for character videos
    const videoMap = {
        'nelson': 'nelson.mp4',
        'michelle': 'barbarella.mp4',
        'taylor': 'taylor.mp4',
    };
    
    const videoSrc = videoMap[opponent];
    if (videoSrc) {
        // Check if video is already preloaded
        const existingPreloader = document.querySelector(`[data-preload-opponent="${opponent}"]`);
        if (existingPreloader) {
            console.log(`Video for ${opponent} is already preloaded`);
            return;
        }
        
        // Create a video element for preloading
        const preloader = document.createElement('video');
        
        // Set all attributes before setting src
        preloader.style.position = 'absolute';
        preloader.style.left = '-9999px';
        preloader.style.top = '-9999px';
        preloader.style.display = 'block'; // Actually display it but off-screen
        preloader.style.width = '10px';
        preloader.style.height = '10px';
        preloader.muted = true;
        preloader.playsInline = true;
        preloader.autoplay = false;
        preloader.controls = false;
        preloader.preload = 'auto';
        preloader.loop = true;
        
        // Set an ID and data attribute for easy identification
        const preloadId = `preload-${opponent}-${new Date().getTime()}`;
        preloader.id = preloadId;
        preloader.setAttribute('data-preload-opponent', opponent);
        
        console.log(`Starting preload for ${opponent} video:`, videoSrc);
        
        // Add to DOM for preloading
        document.body.appendChild(preloader);
        
        // Add event listeners
        preloader.addEventListener('loadedmetadata', () => {
            console.log(`Video metadata preloaded for ${opponent}:`, {
                duration: preloader.duration,
                readyState: preloader.readyState
            });
        });
        
        preloader.addEventListener('loadeddata', () => {
            console.log(`Successfully preloaded video data for ${opponent}:`, videoSrc);
            
            // Try to play and immediately pause to ensure the video is cached and ready
            preloader.play().then(() => {
                // Let it play for a moment to prime the buffer
                setTimeout(() => {
                    preloader.pause();
                    preloader.currentTime = 0;
                    console.log(`Preload complete for ${opponent} - video cached and primed`);
                    
                    // Keep the preloaded video in the DOM for faster access later,
                    // but make it completely hidden
                    preloader.style.opacity = '0';
                    preloader.style.visibility = 'hidden';
                    
                    // Create a flag showing this video is ready
                    const readyFlag = document.createElement('div');
                    readyFlag.id = `${opponent}-video-ready`;
                    readyFlag.style.display = 'none';
                    document.body.appendChild(readyFlag);
                }, 100);
            }).catch(err => {
                console.log(`Error during preload play for ${opponent}:`, err);
                console.log('This is normal in some browsers that block autoplay');
                // Still keep the preloaded video data
            });
        });
        
        preloader.addEventListener('error', (error) => {
            console.error(`Error preloading video for ${opponent}:`, error);
            if (document.getElementById(preloadId)) {
                document.body.removeChild(preloader);
            }
        });
        
        // Set src after all listeners are attached
        preloader.src = `/static/videos/${videoSrc}`;
        preloader.load(); // Start loading the video data
    }
}

// Handle opponent button selection
function selectOpponent(opponentValue) {
    // Remove selection from all buttons
    document.querySelectorAll('.opponent-button').forEach(button => {
        button.classList.remove('selected');
    });
    
    // Add selection to clicked button
    const selectedButton = document.querySelector(`[data-opponent="${opponentValue}"]`);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
    
    // Update global selectedAgent variable
    selectedAgent = opponentValue;
    
    // Apply market-specific themes to the body
    document.body.classList.remove('body-singapore-theme', 'body-india-theme');
    if (opponentValue === 'akshat') {
        document.body.classList.add('body-singapore-theme');
    }
    
    console.log(`Selected opponent: ${opponentValue}`);
    
    // Preload videos for the selected opponent
    preloadVideos(opponentValue);
    
    // Tell the avatar frame to update
    sendMessageToAvatarFrame('updateAvatar', { opponent: opponentValue });
    sendMessageToAvatarFrame('preloadVideo', { opponent: opponentValue });
    
    // Update avatar and form validity
    initializeAvatar();
    checkFormValidity();
}

// Language is now fixed to English

// Animate mouth when speaking
function startMouthAnimation() {
    if (mouthAnimationInterval) return; // Already animating
    
    const avatarWrapper = document.getElementById('animatedAvatar');
    if (avatarWrapper) {
        avatarWrapper.classList.add('avatar-speaking');
        
        // If it's a celebrity avatar, show the speaking indicator
        const speakingIndicator = document.getElementById('speakingIndicator');
        if (speakingIndicator) {
            speakingIndicator.style.display = 'flex';
        }
        
        // Handle video playback if available
        const videoElement = document.getElementById('avatarVideo');
        if (videoElement) {
            // Ensure the video is visible with proper styles
            videoElement.style.display = 'block';
            videoElement.style.visibility = 'visible';
            videoElement.style.opacity = '1';
            videoElement.style.zIndex = '10';
            
            // Make sure any fallback image is hidden
            const fallbackImage = document.getElementById('avatarFallbackImage');
            if (fallbackImage) {
                fallbackImage.style.display = 'none';
            }
            
            console.log('Starting video playback for speaking animation');
            try {
                // Reset video to beginning
                videoElement.currentTime = 0;
                
                // Explicitly set video properties before playing
                videoElement.muted = true;
                videoElement.loop = true;
                videoElement.playsInline = true;
                
                // Play with retries
                let retryCount = 0;
                const maxRetries = 3;
                
                const attemptPlay = () => {
                    console.log(`Attempt #${retryCount + 1} to play video`);
                    const playPromise = videoElement.play();
                    
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('Video started playing successfully');
                                // Double check to make sure video is visible
                                videoElement.style.display = 'block';
                                videoElement.style.visibility = 'visible';
                                videoElement.style.opacity = '1';
                            })
                            .catch(error => {
                                console.error(`Error playing video (attempt ${retryCount + 1}):`, error);
                                retryCount++;
                                
                                if (retryCount < maxRetries) {
                                    console.log(`Retrying video play in ${retryCount * 200}ms...`);
                                    // Try again with increasing delay
                                    setTimeout(attemptPlay, retryCount * 200);
                                } else {
                                    console.error('Max video play retries reached. Showing fallback if available.');
                                    // If video fails to play after all retries, show fallback
                                    if (fallbackImage) {
                                        fallbackImage.style.display = 'block';
                                    }
                                    
                                    const fallbackAvatar = avatarWrapper.querySelector('.fallback-avatar');
                                    if (fallbackAvatar) {
                                        fallbackAvatar.style.display = 'block';
                                    }
                                }
                            });
                    } else {
                        console.log('Play promise was undefined, video may already be playing');
                    }
                };
                
                // Start first attempt with a slight delay to ensure video is ready
                setTimeout(attemptPlay, 100);
            } catch (error) {
                console.error('Video playback error:', error);
                // Show fallback avatar in case of errors
                const fallbackAvatar = avatarWrapper.querySelector('.fallback-avatar');
                if (fallbackAvatar) {
                    fallbackAvatar.style.display = 'block';
                }
            }
        }
    }
    
    mouthAnimationInterval = setInterval(() => {
        const mouthElement = document.getElementById('avatarMouth');
        if (mouthElement) {
            // Random probability to change mouth state - creates natural speaking pattern
            const shouldChangeMouth = Math.random() > 0.4; // 60% chance to change
            
            if (shouldChangeMouth) {
                currentMouthState = currentMouthState === 'M130,170 Q150,175 170,170' 
                    ? 'M130,170 Q150,195 170,170' // open mouth (oval)
                    : 'M130,170 Q150,175 170,170'; // closed mouth
                
                mouthElement.setAttribute('d', currentMouthState);
                mouthElement.setAttribute('fill', currentMouthState.includes('195') ? '#8B4513' : 'none');
                mouthElement.setAttribute('opacity', currentMouthState.includes('195') ? '0.7' : '1');
            }
        }
    }, Math.random() * 200 + 100); // Variable timing 100-300ms
}

// Stop mouth animation
function stopMouthAnimation() {
    if (mouthAnimationInterval) {
        clearInterval(mouthAnimationInterval);
        mouthAnimationInterval = null;
    }
    
    const avatarWrapper = document.getElementById('animatedAvatar');
    if (avatarWrapper) {
        avatarWrapper.classList.remove('avatar-speaking');
        
        // Hide speaking indicator for celebrity avatars
        const speakingIndicator = document.getElementById('speakingIndicator');
        if (speakingIndicator) {
            speakingIndicator.style.display = 'none';
        }
        
        // Handle video pause but keep showing it
        const videoElement = document.getElementById('avatarVideo');
        
        if (videoElement) {
            console.log('Pausing video and resetting to first frame');
            
            try {
                // Ensure the video is paused
                videoElement.pause();
                
                // Reset to first frame (using a short timeout to ensure pause completes first)
                setTimeout(() => {
                    videoElement.currentTime = 0;
                    
                    // Double-check that the video is still at frame 0
                    setTimeout(() => {
                        if (videoElement.currentTime > 0.1) {
                            console.log('Video not at frame 0, forcing reset');
                            videoElement.currentTime = 0;
                        }
                    }, 50);
                }, 50);
                
                // Keep video visible, just paused at first frame
                videoElement.style.display = 'block';
                videoElement.style.visibility = 'visible';
                videoElement.style.opacity = '1';
                
            } catch (error) {
                console.error('Error pausing video:', error);
            }
        }
    }
    
    // Reset mouth to closed state
    currentMouthState = 'M130,170 Q150,175 170,170';
    const mouthElement = document.getElementById('avatarMouth');
    if (mouthElement) {
        mouthElement.setAttribute('d', currentMouthState);
        mouthElement.setAttribute('fill', 'none');
        mouthElement.setAttribute('opacity', '1');
    }
}

async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
    } catch (error) {
        console.error('Microphone permission denied:', error);
        return false;
    }
}

async function getSignedUrl(opponent, mode = null) {
    try {
        let url = opponent ? `/api/signed-url?opponent=${opponent}` : '/api/signed-url';
        if (mode) {
            url += `&mode=${mode}`;
        }
        // Add language parameter
        if (selectedLanguage) {
            url += `&language=${selectedLanguage}`;
        }
        console.log('Requesting signed URL for:', opponent, 'mode:', mode, 'language:', selectedLanguage, 'URL:', url);
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Failed to get signed URL, status:', response.status);
            throw new Error('Failed to get signed URL');
        }
        const data = await response.json();
        console.log('Received signed URL response:', data);
        return data.signedUrl;
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw error;
    }
}

async function getAgentId() {
    const response = await fetch('/api/getAgentId');
    const { agentId } = await response.json();
    return agentId;
}

function updateStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
    statusElement.classList.toggle('connected', isConnected);
}

function updateSpeakingStatus(mode) {
    const statusElement = document.getElementById('speakingStatus');
    const sqlQueryButton = document.getElementById('sqlQueryButton');
    
    // Update based on the exact mode string we receive
    const isSpeaking = mode.mode === 'speaking';
    statusElement.textContent = isSpeaking ? 'Agent Speaking' : 'Agent Silent';
    statusElement.classList.toggle('speaking', isSpeaking);
    
    // Animate avatar based on speaking state
    if (isSpeaking) {
        console.log('Agent is now speaking, starting video playback');
        
        // Tell the avatar frame to start video playbook
        sendMessageToAvatarFrame('startSpeaking', { speaking: true });
        
        // Also use local animation control with delay for better sync
        setTimeout(() => {
            startMouthAnimation();
        }, 100);
        
        // Disable SQL query button when agent is speaking
        if (sqlQueryButton) {
            sqlQueryButton.disabled = true;
        }
    } else {
        console.log('Agent is now silent, pausing video');
        
        // Tell the avatar frame to stop video playback
        sendMessageToAvatarFrame('stopSpeaking', { speaking: false });
        
        // Also stop local animation
        stopMouthAnimation();
        
        // Only enable SQL query button when:
        // 1. Agent is done speaking
        // 2. Button should be visible
        // 3. We're not in the middle of a SQL query request
        if (sqlQueryButton && sqlQueryButton.style.display !== 'none' && !sqlQueryRequested) {
            sqlQueryButton.disabled = false;
        }
        
        // If the agent just finished speaking and we requested a SQL query,
        // the onMessage handler will automatically process the response
        if (sqlQueryRequested && !waitingForSQLResponse) {
            console.log('Agent finished speaking after SQL query request, response already processed');
        }
    }
    
    console.log('Speaking status updated:', { mode, isSpeaking }); // Debug log
}

// Function to disable/enable form controls
function setFormControlsState(disabled) {
    const opponentButtons = document.querySelectorAll('.opponent-button');
    
    opponentButtons.forEach(button => button.disabled = disabled);
}

async function startConversation() {
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    
    try {
        // Disable start button immediately to prevent multiple clicks
        startButton.disabled = true;
        
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            alert('Microphone permission is required for the conversation.');
            startButton.disabled = false;
            return;
        }
        
        // Get selected opponent
        const selectedOpponent = getSelectedOpponent();
        
        const signedUrl = await getSignedUrl(selectedOpponent);
        //const agentId = await getAgentId(); // You can switch to agentID for public agents
        
        // Set user stance to "for" and AI stance to "against" by default
        const userStance = "for";
        const aiStance = "against";
        
        // Use a default topic since we removed topic selection
        const topicText = "General Discussion";
        
        conversation = await Conversation.startSession({
            signedUrl: signedUrl,
            //agentId: agentId, // You can switch to agentID for public agents
            dynamicVariables: {
                topic: topicText,
                user_stance: userStance,
                ai_stance: aiStance
            },
            onMessage: (message) => {
                console.log('Received message:', message);
                if (message.source === 'ai' && message.message) {
                    console.log('AI response received:', message.message);
                    
                    // Only capture and process if we're specifically waiting for a SQL query response
                    if (waitingForSQLResponse && sqlQueryRequested) {
                        console.log('Processing SQL query from AI response');
                        lastAIResponse = message.message;
                        processSQLResponse(lastAIResponse);
                        waitingForSQLResponse = false;
                    } else {
                        // For regular conversation, just log the response
                        console.log('Regular conversation message, not processing as SQL');
                    }
                }
            },
            onConnect: () => {
                console.log('Connected');
                updateStatus(true);
                setFormControlsState(true); // Disable form controls
                startButton.style.display = 'none';
                endButton.disabled = false;
                endButton.style.display = 'flex';
                
                // Show and enable SQL query button
                const sqlQueryButton = document.getElementById('sqlQueryButton');
                if (sqlQueryButton) {
                    sqlQueryButton.disabled = false;
                    sqlQueryButton.style.display = 'flex';
                }
            },            
            onDisconnect: () => {
                console.log('Disconnected');
                updateStatus(false);
                setFormControlsState(false); // Re-enable form controls
                startButton.disabled = false;
                startButton.style.display = 'flex';
                endButton.disabled = true;
                endButton.style.display = 'none';
                
                // Hide SQL query button
                const sqlQueryButton = document.getElementById('sqlQueryButton');
                if (sqlQueryButton) {
                    sqlQueryButton.disabled = true;
                    sqlQueryButton.style.display = 'none';
                }
                
                updateSpeakingStatus({ mode: 'listening' }); // Reset to listening mode on disconnect
                stopMouthAnimation(); // Ensure avatar animation stops
            },
            onError: (error) => {
                console.error('Conversation error:', error);
                setFormControlsState(false); // Re-enable form controls on error
                startButton.disabled = false;
                startButton.style.display = 'flex';
                endButton.disabled = true;
                endButton.style.display = 'none';
                
                // Hide SQL query button
                const sqlQueryButton = document.getElementById('sqlQueryButton');
                if (sqlQueryButton) {
                    sqlQueryButton.disabled = true;
                    sqlQueryButton.style.display = 'none';
                }
                
                alert('An error occurred during the conversation.');
            },
            onModeChange: (mode) => {
                console.log('Mode changed:', mode); // Debug log to see exact mode object
                updateSpeakingStatus(mode);
            }
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        setFormControlsState(false); // Re-enable form controls on error
        startButton.disabled = false;
        alert('Failed to start conversation. Please try again.');
    }
}

async function endConversation() {
    console.log('Ending conversation...');
    if (conversation) {
        try {
            await conversation.endSession();
            console.log('Conversation ended successfully');
        } catch (error) {
            console.error('Error ending conversation:', error);
        } finally {
            conversation = null;
        }
    } else {
        console.log('No active conversation to end');
    }
}

// Function to generate SQL query and open screener URL
async function generateSQLQuery() {
    if (conversation && !sqlQueryRequested) {
        try {
            // Set flags to indicate we're expecting a SQL query
            sqlQueryRequested = true;
            
            // Add a small delay before setting waitingForSQLResponse to avoid
            // capturing any immediate acknowledgment responses
            setTimeout(() => {
                waitingForSQLResponse = true;
                console.log('Now waiting for SQL query response from AI');
            }, 500);
            
            // Disable the SQL query button and add loading indicator
            const sqlButton = document.getElementById('sqlQueryButton');
            if (sqlButton) {
                sqlButton.disabled = true;
                sqlButton.classList.add('loading');
                
                // Change button text to indicate processing
                sqlButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    Generating SQL Query...
                `;
            }
            
            // Log the request time for debugging
            console.log(`SQL query generation requested at ${new Date().toISOString()}`);
            
            // Send a message to the AI asking for SQL query generation
            try {
                // Prepare the SQL query generation prompt with more specific instructions
                const summaryPrompt = "Generate a SQL query for stock screening based on our conversation. Please provide only the SQL query conditions without any explanations, formatted like this default query: Return on invested capital > 25 AND Earnings yield > 15 AND Book value > 0 AND Market Capitalization > 15, using top 4-5 important and popular parameters of these available parameters: [Sales, OPM, Profit after tax, Market Capitalization, Sales latest quarter, Profit after tax latest quarter, YOY Quarterly sales growth, YOY Quarterly profit growth, Price to Earning, Dividend yield, Price to book value, Return on capital employed, Return on assets, Debt to equity, Return on equity, EPS, Debt, Promoter holding, Change in promoter holding, Earnings yield, Pledged percentage, Industry PE, Sales growth, Profit growth, Current price, Price to Sales, Price to Free Cash Flow, EVEBITDA, Enterprise Value, Current ratio, Interest Coverage Ratio, PEG Ratio, Return over 3months, Return over 6months, Sales growth 3Years, Sales growth 5Years, Profit growth 3Years, Profit growth 5Years, Average return on equity 5Years, Average return on equity 3Years, Return over 1year, Return over 3years, Return over 5years] using the join operators: [+ - / * > < AND OR]. DO NOT ADD ANY OTHER TEXT TO THIS";
                
                // Method 1: Using sendTextMessage (original method)
                if (typeof conversation.sendTextMessage === 'function') {
                    await conversation.sendTextMessage(summaryPrompt);
                    console.log('SQL query requested using sendTextMessage');
                } 
                // Method 2: Using sendUserMessage 
                else if (typeof conversation.sendUserMessage === 'function') {
                    await conversation.sendUserMessage(summaryPrompt);
                    console.log('SQL query requested using sendUserMessage');
                }
                // Method 3: Using prompt
                else if (typeof conversation.prompt === 'function') {
                    await conversation.prompt(summaryPrompt);
                    console.log('SQL query requested using prompt');
                }                
                // Method 4: Using write
                else if (typeof conversation.write === 'function') {
                    await conversation.write(summaryPrompt);
                    console.log('SQL query requested using write');
                }
                // Method 5: Using ask
                else if (typeof conversation.ask === 'function') {
                    await conversation.ask(summaryPrompt);
                    console.log('SQL query requested using ask');
                }
                // Method 6: If none of the above works, log the available methods and information
                else {
                    console.error('No suitable message sending method found on conversation object');
                    console.log('Available methods:', 
                        Object.getOwnPropertyNames(Object.getPrototypeOf(conversation)));
                    console.log('Conversation object keys:', Object.keys(conversation));
                    console.log('Conversation object:', conversation);
                    throw new Error('No suitable method to send message to AI');
                }
            } catch (innerError) {
                console.error('Error sending message:', innerError);
                throw innerError;
            }
            
            console.log('SQL query generation requested, waiting for response...');
            
            // Safety fallback: If after 60 seconds the flag is still set, reset it
            setTimeout(() => {
                if (sqlQueryRequested) {
                    console.log(`SQL query generation timed out after 60 seconds at ${new Date().toISOString()}`);
                    sqlQueryRequested = false;
                    waitingForSQLResponse = false;
                    
                    // Reset the button if it's still on the page and disabled
                    const sqlButtonCheck = document.getElementById('sqlQueryButton');
                    if (sqlButtonCheck && sqlButtonCheck.disabled && sqlButtonCheck.style.display !== 'none') {
                        sqlButtonCheck.disabled = false;
                        sqlButtonCheck.classList.remove('loading');
                        sqlButtonCheck.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                <path d="M8 7h8"></path>
                                <path d="M8 11h8"></path>
                            </svg>
                            Generate SQL Query
                        `;
                        console.log('SQL button reset by timeout fallback');
                    }
                }
            }, 60000);
        } catch (error) {
            console.error('Error requesting SQL query generation:', error);
            alert('Failed to request SQL query generation. Please try again.');
            
            // Re-enable the button on error
            setTimeout(() => {
                sqlQueryRequested = false;
                waitingForSQLResponse = false;
                const sqlButton = document.getElementById('sqlQueryButton');
                if (sqlButton) {
                    sqlButton.disabled = false;
                    sqlButton.classList.remove('loading');
                    sqlButton.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            <path d="M8 7h8"></path>
                            <path d="M8 11h8"></path>
                        </svg>
                        Generate SQL Query
                    `;
                }
            }, 1000);
        }
    } else if (sqlQueryRequested) {
        console.log('SQL query generation already in progress');
    } else {
        console.log('No active conversation or conversation object not available');
    }
}

// Function to process AI response for SQL query and redirect to screener
async function processSQLResponse(responseText) {
    try {
        console.log('=== PROCESSING SQL RESPONSE ===');
        console.log('Raw AI response:', responseText);
        console.log('Response length:', responseText.length);
        
        // Extract SQL query from the AI response
        // The AI might return the SQL in various formats, so we need to be flexible
        let sqlQuery = responseText.trim();
        
        // Remove common prefixes the AI might add
        sqlQuery = sqlQuery.replace(/^(Here's the SQL query|The SQL query is|SQL query:|Here is the|Based on our conversation,|The query you need is)/i, '');
        
        // Remove code block markers
        sqlQuery = sqlQuery.replace(/```sql\s*/i, '').replace(/```\s*$/i, '');
        sqlQuery = sqlQuery.replace(/```\s*/i, '').replace(/```\s*$/i, '');
        
        // Remove common suffixes
        sqlQuery = sqlQuery.replace(/(This query will|This should|Hope this helps|Let me know if)/i, '');
        
        // Extract content between quotes if present
        const quotedMatch = sqlQuery.match(/["'`]([^"'`]+)["'`]/);
        if (quotedMatch) {
            console.log('Found quoted content:', quotedMatch[1]);
            sqlQuery = quotedMatch[1];
        }
        
        // If the response contains multiple lines, try to find the actual SQL query
        const lines = sqlQuery.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log('Response lines:', lines);
        
        for (const line of lines) {
            // Look for lines that look like SQL conditions
            if (line.match(/\w+\s*[><=]+\s*\d+|\w+\s+(AND|OR)\s+\w+/i)) {
                console.log('Found SQL-like line:', line);
                sqlQuery = line;
                break;
            }
        }
        
        // Clean up any remaining formatting
        sqlQuery = sqlQuery.trim();
        sqlQuery = sqlQuery.replace(/^\s*[-*]\s*/, ''); // Remove bullet points
        sqlQuery = sqlQuery.replace(/[.!?]*$/, ''); // Remove trailing punctuation
        
        console.log('Final extracted SQL query:', sqlQuery);
        console.log('SQL query length:', sqlQuery.length);
        
        if (!sqlQuery || sqlQuery.length < 5) {
            console.error('Invalid SQL query extracted');
            throw new Error('No valid SQL query found in AI response. AI response was: ' + responseText.substring(0, 200));
        }
        
        console.log('Sending to backend for URL conversion...');
        
        // Send SQL query to backend for URL conversion
        const response = await fetch('/api/sql-to-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sqlQuery })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Backend error: ${errorData.error || response.statusText}`);
        }
        
        const { url } = await response.json();
        console.log('Generated screener URL:', url);
        
        // Open the screener URL in a new tab
        window.open(url, '_blank');
        
        // Show success message
        console.log('SQL query processed successfully!');
        
        // Reset the SQL query button and flags
        sqlQueryRequested = false;
        waitingForSQLResponse = false;
        const sqlButton = document.getElementById('sqlQueryButton');
        if (sqlButton) {
            sqlButton.disabled = false;
            sqlButton.classList.remove('loading');
            sqlButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    <path d="M8 7h8"></path>
                    <path d="M8 11h8"></path>
                </svg>
                Generate SQL Query
            `;
        }
        
    } catch (error) {
        console.error('Error processing SQL response:', error);
        alert(`Failed to process SQL query: ${error.message}`);
        
        // Reset button and flags on error
        sqlQueryRequested = false;
        waitingForSQLResponse = false;
        const sqlButton = document.getElementById('sqlQueryButton');
        if (sqlButton) {
            sqlButton.disabled = false;
            sqlButton.classList.remove('loading');
            sqlButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    <path d="M8 7h8"></path>
                    <path d="M8 11h8"></path>
                </svg>
                Generate SQL Query
            `;
        }
    }
}

// Q&A with Nelson Mandela
async function startQnA() {
    try {
        console.log('Starting Q&A with Nelson Mandela...');
        
        // End any existing conversation first
        if (conversation) {
            console.log('Ending existing conversation before starting Q&A...');
            await endConversation();
            // Wait a moment to ensure cleanup is complete
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Request microphone permission first
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            alert('Microphone permission is required for the Q&A session.');
            return;
        }
        
        // Set form controls state
        setFormControlsState(true);
        
        // Force select Nelson Mandela
        selectOpponent('nelson');
        
        // Explicitly tell avatar frame to update
        sendMessageToAvatarFrame('updateAvatar', { opponent: 'nelson' });
        
        // Get signed URL for Nelson Mandela Q&A mode
        const signedUrl = await getSignedUrl('nelson', 'qna');
        
        console.log('Creating Q&A conversation with signed URL...');
        console.log('Signed URL details:', signedUrl);
        
        // Create new conversation with the same structure as the debate but simpler parameters
        conversation = await Conversation.startSession({
            signedUrl: signedUrl,
            // Add simple dynamic variables to make it a Q&A session
            dynamicVariables: {
                topic: "Allowing AI to override human decisions in healthcare",
                user_stance: "curious",
                ai_stance: "against"
            },
            onMessage: (message) => {
                console.log('Q&A Received message:', message);
                if (message.source === 'ai' && message.message) {
                    console.log('Q&A AI response received:', message.message);
                    
                    // Only capture and process if we're specifically waiting for a SQL query response
                    if (waitingForSQLResponse && sqlQueryRequested) {
                        console.log('Processing SQL query from Q&A AI response');
                        lastAIResponse = message.message;
                        processSQLResponse(lastAIResponse);
                        waitingForSQLResponse = false;
                    } else {
                        // For regular Q&A conversation, just log the response
                        console.log('Regular Q&A message, not processing as SQL');
                    }
                }
            },
            onConnect: () => {
                console.log('Q&A session connected successfully');
                updateStatus(true);
                updateSpeakingStatus({ mode: 'listening' });
                
                // Send an initial greeting to keep the connection active
                setTimeout(() => {
                    console.log('Q&A session ready for user input');
                }, 1000);
                
                // Hide Q&A button and show end button
                document.getElementById('qnaButton').style.display = 'none';
                document.getElementById('endButton').style.display = 'flex';
                document.getElementById('startButton').style.display = 'none';
                document.getElementById('sqlQueryButton').style.display = 'none';
            },
            onDisconnect: () => {
                console.log('Q&A session disconnected');
                updateStatus(false);
                updateSpeakingStatus({ mode: 'agent_silent' });
                stopMouthAnimation();
                setFormControlsState(false);
                
                // Reset button visibility
                document.getElementById('qnaButton').style.display = 'block';
                document.getElementById('endButton').style.display = 'none';
                document.getElementById('startButton').style.display = 'flex';
                document.getElementById('sqlQueryButton').style.display = 'none';
            },
            onError: (error) => {
                console.error('Q&A session error:', error);
                updateStatus(false);
                updateSpeakingStatus({ mode: 'agent_silent' });
                stopMouthAnimation();
                setFormControlsState(false);
                
                // Reset button visibility
                document.getElementById('qnaButton').style.display = 'block';
                document.getElementById('endButton').style.display = 'none';
                document.getElementById('startButton').style.display = 'flex';
                document.getElementById('sqlQueryButton').style.display = 'none';
                
                alert('An error occurred during the Q&A session.');
            },
            onModeChange: (mode) => {
                console.log('Q&A mode changed:', mode);
                updateSpeakingStatus(mode);
                
                // Use the same mouth/video animation functions for Q&A mode
                if (mode.mode === 'speaking') {
                    startMouthAnimation();
                } else {
                    stopMouthAnimation();
                }
            }
        });

        console.log('Q&A conversation session created successfully');

    } catch (error) {
        console.error('Error starting Q&A:', error);
        setFormControlsState(false);
        
        // Reset button visibility on error
        document.getElementById('qnaButton').style.display = 'block';
        document.getElementById('endButton').style.display = 'none';
        document.getElementById('startButton').style.display = 'flex';
        document.getElementById('sqlQueryButton').style.display = 'none';
        
        alert('Failed to start Q&A session. Please check your internet connection and try again.');
    }
}

// Function to communicate with the avatar iframe
function sendMessageToAvatarFrame(action, data = {}) {
    const avatarFrame = document.querySelector('iframe[src*="avatar.html"]');
    if (avatarFrame && avatarFrame.contentWindow) {
        console.log(`Sending message to avatar frame: ${action}`, data);
        avatarFrame.contentWindow.postMessage({ action, data }, window.location.origin);
    } else {
        console.error('Avatar frame not found or not ready');
    }
}

// Function to check if all video elements are correctly configured
function validateVideoElements() {
    console.log('Validating video elements...');
    
    // Check main avatar video
    const avatarVideo = document.getElementById('avatarVideo');
    if (avatarVideo) {
        console.log('Avatar video found:', {
            src: avatarVideo.src,
            display: avatarVideo.style.display,
            visibility: avatarVideo.style.visibility,
            opacity: avatarVideo.style.opacity,
            zIndex: avatarVideo.style.zIndex,
            readyState: avatarVideo.readyState,
            networkState: avatarVideo.networkState,
            error: avatarVideo.error
        });
        
        // Make sure it has proper styles
        avatarVideo.style.display = 'block';
        avatarVideo.style.visibility = 'visible';
        avatarVideo.style.opacity = '1';
        avatarVideo.style.zIndex = '10';
        
        // If there's an error or the video isn't ready, attempt to reload it
        if (avatarVideo.error || avatarVideo.networkState === 3) {
            console.log('Video has errors, attempting to reload...');
            const currentSrc = avatarVideo.src;
            avatarVideo.src = '';
            setTimeout(() => {
                avatarVideo.src = currentSrc;
                avatarVideo.load();
            }, 100);
        }
    } else {
        console.log('Avatar video element not found');
    }
    
    // Check for any preloaded videos
    const preloadedVideos = document.querySelectorAll('[data-preload-opponent]');
    console.log(`Found ${preloadedVideos.length} preloaded video elements`);
    
    // Ensure the selected opponent is properly set up
    const selectedOpponent = getSelectedOpponent();
    if (selectedOpponent && !document.getElementById(`${selectedOpponent}-video-ready`)) {
        console.log(`Selected opponent ${selectedOpponent} video not ready, preloading again...`);
        preloadVideos(selectedOpponent);
    }
}


let audioContext;
let mediaStream;
let analyser;
let dataArray;

async function startMicMonitoring() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioContext.createMediaStreamSource(mediaStream);
  analyser = audioContext.createAnalyser();
  source.connect(analyser);
  analyser.fftSize = 512;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
}

function isUserSpeaking(threshold = 15) {
  analyser.getByteFrequencyData(dataArray);
  const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  return avg > threshold;
}


async function waitForUserToStopSpeaking(silenceDuration = 2000, pollInterval = 200) {
    let silentFor = 0;
    return new Promise(resolve => {
      const check = () => {
        if (!isUserSpeaking()) {
          silentFor += pollInterval;
          if (silentFor >= silenceDuration) {
            resolve();
            return;
          }
        } else {
          silentFor = 0; // Reset timer if user speaks again
        }
        setTimeout(check, pollInterval);
      };
      check();
    });
  }

// Initialize avatar when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded, starting initialization...');
    
    // Preload all available videos at startup
    console.log('Preloading videos...');
    preloadVideos('nelson');
    
    // Tell avatar frame to preload videos too (once it's loaded)
    setTimeout(() => {
        sendMessageToAvatarFrame('preloadVideo', { opponent: 'nelson' });
    }, 1000);
    
    // Wait a bit to ensure video preloading has started
    setTimeout(() => {
        console.log('Initializing avatar...');
        // Initialize avatar
        initializeAvatar();
        
        // Run a check to make sure video elements are ready
        setTimeout(validateVideoElements, 1000);
    }, 500);
    
    // Enable start button when opponent is selected
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    
    // Ensure initial button states
    endButton.style.display = 'none';
    
    function checkFormValidity() {
        const opponentSelected = getSelectedOpponent() !== '';
        
        // Set a default topic since we removed topic selection
        currentTopic = 'General Discussion';
        
        startButton.disabled = !opponentSelected;
    }
    
    // Make checkFormValidity globally accessible
    window.checkFormValidity = checkFormValidity;
    
    // Add event listeners for opponent buttons
    document.querySelectorAll('.opponent-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const opponentValue = e.currentTarget.getAttribute('data-opponent');
            selectOpponent(opponentValue);
        });
    });
    
    // Initialize theme based on any pre-selected agent
    const initialSelectedButton = document.querySelector('.opponent-button.selected');
    if (initialSelectedButton) {
        const initialOpponent = initialSelectedButton.getAttribute('data-opponent');
        // Set the market theme without changing button selection
        if (initialOpponent === 'akshat') {
            document.body.classList.add('body-singapore-theme');
        }
    }
    
    // Default language is always English now
    selectedLanguage = 'english';
    
    // Add event listeners for conversation control buttons
    startButton.addEventListener('click', startConversation);
    endButton.addEventListener('click', endConversation);
    
    // Add event listener for SQL query button
    const sqlQueryButton = document.getElementById('sqlQueryButton');
    if (sqlQueryButton) {
        sqlQueryButton.addEventListener('click', generateSQLQuery);
    }
    
    // Initial check
    checkFormValidity();
});

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});