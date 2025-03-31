import React, { useState, useEffect, useRef, useMemo } from 'react' // Added useState, useEffect, useRef, useMemo
import { useLocation } from 'react-router-dom'
import ErrorHeader from '../error-header'

// Success Message Component
function PublishSuccess({ subscribeUrl }) {
  return (
    <div className={'bg-emerald-600 text-white text-base font-medium ' + // Adjusted color/size
      'text-center p-4 rounded-lg whitespace-pre-wrap mb-4 shadow'
    }>
      Live! Streaming to: <a href={subscribeUrl} target="_blank" rel="noreferrer" className="font-semibold underline hover:text-emerald-100">{subscribeUrl}</a>
    </div>
  )
}


let mediaOptions = {
  audio: true,
  video: true // Request video by default
};

const mediaErrorMessages = {
  NotAllowedError: `Access to camera/screen was denied. Please grant permission in your browser and system settings.`,
  NotFoundError: `No camera or screen recording device found. Make sure a camera is connected or screen sharing is enabled.`,
  NotReadableError: `Hardware error: Could not read from the camera/screen device. Is it already in use by another application?`,
  AbortError: `Media request aborted, possibly due to a configuration change.`,
  TypeError: `Media constraints are not supported or malformed.`,
  SecurityError: `Media access denied due to browser security settings (e.g., not HTTPS, iframe restrictions).`,
  NoMediaDevices: `MediaDevices API not found. Publishing requires a modern browser and likely HTTPS.`
};

function Publish() { // Renamed from Player to Publish for clarity
  const videoRef = useRef(null);
  const location = useLocation();
  const streamKey = useMemo(() => location.pathname.split('/').pop() || '', [location.pathname]); // Memoize stream key
  const [mediaAccessError, setMediaAccessError] = useState(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [useDisplayMedia, setUseDisplayMedia] = useState(false); // Start with webcam default
  const [peerConnectionDisconnected, setPeerConnectionDisconnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false); // Track connection state

  const apiPath = useMemo(() => import.meta.env.VITE_API_PATH ?? (() => {
      console.warn('[broadcast box] REACT_APP_API_PATH is deprecated, please use VITE_API_PATH instead');
      return import.meta.env.REACT_APP_API_PATH;
  })(), []); // Memoize API Path

  const subscribeUrl = useMemo(() => window.location.href.replace('/publish/', '/'), []); // Calculate subscribe URL once

  // Toggle media source
  const toggleMediaSource = () => {
    // Reset errors and success state when toggling
    setMediaAccessError(null);
    setPublishSuccess(false);
    setPeerConnectionDisconnected(false);
    setUseDisplayMedia(prev => !prev); // This will trigger the useEffect below
  };

  // Effect for handling WebRTC connection and media stream
  useEffect(() => {
    if (!streamKey) return; // Don't run if no stream key

    const peerConnection = new RTCPeerConnection();
    let stream = null;
    let cancelled = false; // Flag to prevent state updates after cleanup

    setPublishSuccess(false); // Reset success state on new attempt
    setPeerConnectionDisconnected(false); // Reset disconnect state
    setMediaAccessError(null); // Clear previous errors
    setIsConnecting(true); // Indicate connection attempt start

    const getMedia = useDisplayMedia ? navigator.mediaDevices.getDisplayMedia : navigator.mediaDevices.getUserMedia;

    getMedia(mediaOptions)
      .then(s => {
        if (cancelled || peerConnection.connectionState === "closed") {
            s.getTracks().forEach(t => t.stop());
            return Promise.reject(new Error("Operation cancelled or connection closed early")); // Abort promise chain
        }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s; // Show preview

        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          if (track.kind === 'audio') {
            peerConnection.addTransceiver(track, { direction: 'sendonly' });
          } else if (track.kind === 'video') {
            peerConnection.addTransceiver(track, {
              direction: 'sendonly',
              sendEncodings: [ // Example simulcast encodings
                { rid: 'high' },
                { rid: 'med', scaleResolutionDownBy: 2.0 },
                { rid: 'low', scaleResolutionDownBy: 4.0 }
              ]
            });
          }
        });

        // Setup ICE state change handler
        peerConnection.oniceconnectionstatechange = () => {
            if (cancelled) return;
            const state = peerConnection.iceConnectionState;
            if (state === 'connected' || state === 'completed') {
                setPublishSuccess(true);
                setPeerConnectionDisconnected(false);
                setIsConnecting(false);
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                setPublishSuccess(false);
                setPeerConnectionDisconnected(true);
                setIsConnecting(false);
                // Stop stream tracks if connection fails after starting
                stream?.getTracks().forEach(t => t.stop());
                if (videoRef.current) videoRef.current.srcObject = null; // Clear preview on final failure
            } else {
                // Handle intermediate states if needed (checking, new, etc.)
                 setPeerConnectionDisconnected(false); // Assume ok during intermediate states
            }
        };

        // Create offer and start WHIP handshake
        return peerConnection.createOffer();
      })
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => fetch(`${apiPath}/whip`, {
          method: 'POST',
          body: peerConnection.localDescription?.sdp,
          headers: {
            Authorization: `Bearer ${streamKey}`,
            'Content-Type': 'application/sdp'
          }
        }))
      .then(async response => {
          if (!response.ok) throw new Error(`WHIP request failed: ${response.status} ${response.statusText}`);
          return response.text(); // Get the answer SDP
      })
      .then(answer => peerConnection.setRemoteDescription({ sdp: answer, type: 'answer' }))
      .catch(error => {
          if (cancelled) return;
          console.error("Publish setup failed:", error);
          setMediaAccessError(error); // Show the error
          setIsConnecting(false); // Connection attempt failed
          setPublishSuccess(false);
          // Stop tracks if media was acquired but connection failed
          stream?.getTracks().forEach(t => t.stop());
          if (videoRef.current) videoRef.current.srcObject = null; // Clear preview on error
      });


    // Cleanup function
    return () => {
      cancelled = true; // Mark as cancelled
      peerConnection.close();
      stream?.getTracks().forEach(t => t.stop()); // Stop media tracks
      if (videoRef.current) videoRef.current.srcObject = null; // Clear video preview
      setPublishSuccess(false); // Ensure success is false on unmount/change
      setIsConnecting(false);
    };

  // Re-run effect if streamKey, useDisplayMedia, or apiPath changes
  }, [streamKey, useDisplayMedia, apiPath]);


  const errorMessage = mediaAccessError ? (mediaErrorMessages[mediaAccessError.name] || `An unexpected error occurred: ${mediaAccessError.message}`) : null;

  return (
    // Using container for consistent spacing
    <div className='container mx-auto max-w-4xl px-4 py-6'>
      {errorMessage && <ErrorHeader>{errorMessage}</ErrorHeader>}
      {peerConnectionDisconnected && !errorMessage && <ErrorHeader> WebRTC connection lost. Attempting to reconnect or switch source might help. </ErrorHeader>}
      {publishSuccess && <PublishSuccess subscribeUrl={subscribeUrl} />}

      {/* Video preview area */}
      <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden shadow-lg mb-6">
        <video
          ref={videoRef}
          autoPlay
          muted // Important for preview to avoid feedback
          playsInline
          className='block w-full h-full object-contain bg-black' // Contained video preview
        />
        {isConnecting && ( // Show loading indicator
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3">Connecting...</span>
            </div>
        )}
        {!videoRef.current?.srcObject && !isConnecting && !errorMessage && ( // Placeholder text
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-gray-400">
                <span>{useDisplayMedia ? 'Select screen/window to share' : 'Waiting for camera access...'}</span>
            </div>
        )}
      </div>


      {/* Toggle Button - Styled using base styles */}
      <button
        onClick={toggleMediaSource}
        className="btn-secondary w-full py-2.5" // Use secondary style
        disabled={isConnecting} // Disable while connecting
      >
        {useDisplayMedia ? 'Switch to Webcam' : 'Switch to Screen Share'}
      </button>
    </div>
  )
}

export default Publish;