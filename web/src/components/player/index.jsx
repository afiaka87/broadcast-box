import React, { useContext, useEffect, useMemo, useState, useRef } from 'react'
import { parseLinkHeader } from '@web3-storage/parse-link-header'
import { useLocation, useSearchParams } from 'react-router-dom'
import ErrorHeader from '../error-header'

export const CinemaModeContext = React.createContext(null);

export function CinemaModeProvider({ children }) {
  const [searchParams] = useSearchParams();
  const cinemaModeInUrl = searchParams.get("cinemaMode") === "true"
  const [cinemaMode, setCinemaMode] = useState(() => cinemaModeInUrl || localStorage.getItem("cinema-mode") === "true")

  const state = useMemo(() => ({
    cinemaMode,
    setCinemaMode,
    toggleCinemaMode: () => setCinemaMode((prev) => !prev),
  }), [cinemaMode, setCinemaMode]);

  useEffect(() => localStorage.setItem("cinema-mode", cinemaMode), [cinemaMode]);

  // Add class to body when in cinema mode for global styling potential
  useEffect(() => {
      if (cinemaMode) {
          document.body.classList.add('cinema-mode-active');
      } else {
          document.body.classList.remove('cinema-mode-active');
      }
      // Cleanup function
      return () => {
          document.body.classList.remove('cinema-mode-active');
      };
  }, [cinemaMode]);


  return (
    <CinemaModeContext.Provider value={state}>
      {children}
    </CinemaModeContext.Provider>
  );
}

function PlayerPage() {
  const { cinemaMode, toggleCinemaMode } = useContext(CinemaModeContext);
  const [peerConnectionDisconnected, setPeerConnectionDisconnected] = useState(false) // Keep useState

  return (
    <>
      {/* Container adjusts based on cinema mode */}
      <div className={`flex flex-col items-center w-full ${cinemaMode ? 'h-screen' : 'container mx-auto px-4 py-6'}`}>
        {peerConnectionDisconnected && !cinemaMode && <ErrorHeader> WebRTC connection lost or failed. Please refresh. </ErrorHeader>}
        {peerConnectionDisconnected && cinemaMode && (
            <div className="absolute top-4 left-4 right-4 z-20">
                 <ErrorHeader> Connection lost. </ErrorHeader>
            </div>
        )}

        <Player
            cinemaMode={cinemaMode}
            peerConnectionDisconnected={peerConnectionDisconnected}
            setPeerConnectionDisconnected={setPeerConnectionDisconnected}
        />

        {!cinemaMode && (
            <button className='btn-secondary mt-6' onClick={toggleCinemaMode}>
             Enable Cinema Mode
            </button>
        )}
         {cinemaMode && (
            <button
                className='btn-secondary absolute bottom-4 right-4 z-20 opacity-80 hover:opacity-100'
                onClick={toggleCinemaMode}
                title="Exit Cinema Mode" // Tooltip
            >
             Exit Cinema Mode
            </button>
        )}
      </div>
    </>
  )
}

// Simple Eye icon SVG component
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"> {/* Slightly smaller */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);


function Player({ cinemaMode, peerConnectionDisconnected, setPeerConnectionDisconnected }) {
  const videoRef = useRef(null);
  const location = useLocation();
  const currentStreamKey = useMemo(() => location.pathname.split('/').pop() || '', [location.pathname]); // Memoize stream key
  const [videoLayers, setVideoLayers] = useState([]);
  const [mediaSrcObject, setMediaSrcObject] = useState(null);
  const [layerEndpoint, setLayerEndpoint] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const viewerCountIntervalRef = useRef(null);

  const apiPath = useMemo(() => import.meta.env.VITE_API_PATH ?? (() => {
      console.warn('[broadcast box] REACT_APP_API_PATH is deprecated, please use VITE_API_PATH instead');
      return import.meta.env.REACT_APP_API_PATH;
  })(), []); // Memoize API Path

  const onLayerChange = event => {
    if (!layerEndpoint) return;
    fetch(layerEndpoint, {
      method: 'POST',
      body: JSON.stringify({ mediaId: '1', encodingId: event.target.value }),
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error("Failed to change layer:", err)); // Add error handling
  }

  // Set video srcObject
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaSrcObject;
    }
  }, [mediaSrcObject]);

  // Fetch viewer count
  useEffect(() => {
    if (!currentStreamKey) return;

    const fetchViewerCount = async () => {
      try {
          const response = await fetch(`${apiPath}/status`);
          if (!response.ok) throw new Error(`Status fetch failed: ${response.status}`);

          const statuses = await response.json();
          const currentStreamStatus = statuses.find(status => status.streamKey === currentStreamKey);
          setViewerCount(currentStreamStatus?.viewerCount ?? 0); // Use optional chaining and nullish coalescing

      } catch (error) {
          // Don't reset count immediately, maybe status is temporarily down
          console.error("Error fetching viewer count:", error);
          // setViewerCount(0); // Optional: reset on persistent errors
      }
    };

    fetchViewerCount();
    viewerCountIntervalRef.current = setInterval(fetchViewerCount, 10000); // Poll every 10s

    return () => clearInterval(viewerCountIntervalRef.current); // Cleanup interval
  }, [currentStreamKey, apiPath]); // Depend on stream key and API path


  // Setup WebRTC Connection
  useEffect(() => {
    if (!currentStreamKey) return; // Don't connect if no stream key

    const peerConnection = new RTCPeerConnection();

    peerConnection.ontrack = event => setMediaSrcObject(event.streams[0]);

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setPeerConnectionDisconnected(true);
        setViewerCount(0); // Reset count on disconnect
        if (viewerCountIntervalRef.current) clearInterval(viewerCountIntervalRef.current); // Stop polling
      } else if (state === 'connected' || state === 'completed') {
        setPeerConnectionDisconnected(false);
      }
    };

    peerConnection.addTransceiver('audio', { direction: 'recvonly' });
    peerConnection.addTransceiver('video', { direction: 'recvonly' });

    let eventSource = null; // To close SSE connection

    peerConnection.createOffer()
      .then(offer => {
        offer.sdp = offer.sdp?.replace("useinbandfec=1", "useinbandfec=1;stereo=1"); // Optional chaining for safety
        return peerConnection.setLocalDescription(offer);
      })
      .then(() => fetch(`${apiPath}/whep`, {
        method: 'POST',
        body: peerConnection.localDescription?.sdp, // Use description from PC state
        headers: {
          Authorization: `Bearer ${currentStreamKey}`,
          'Content-Type': 'application/sdp'
        }
      }))
      .then(async response => { // Use async/await for cleaner response handling
        if (!response.ok) throw new Error(`WHEP request failed: ${response.status} ${response.statusText}`);

        const linkHeader = response.headers.get('Link');
        const answerSdp = await response.text();

        const parsedLinks = parseLinkHeader(linkHeader);
        const layerUrl = parsedLinks?.['urn:ietf:params:whep:ext:core:layer']?.url;
        const sseUrl = parsedLinks?.['urn:ietf:params:whep:ext:core:server-sent-events']?.url;

        if (layerUrl) setLayerEndpoint(`${window.location.protocol}//${layerUrl}`);
        if (sseUrl) {
           eventSource = new EventSource(`${window.location.protocol}//${sseUrl}`);
           eventSource.onerror = () => eventSource?.close(); // Close on error
           eventSource.addEventListener("layers", event => {
             try {
               const parsed = JSON.parse(event.data);
               const layers = parsed?.['1']?.['layers']?.map(l => l.encodingId);
               if (layers) setVideoLayers(layers);
             } catch (e) { console.error("Failed to parse layers event:", e); }
           });
        }

        return answerSdp; // Pass answer SDP to the next then()
      })
      .then(answer => peerConnection.setRemoteDescription({ sdp: answer, type: 'answer' }))
      .catch(error => {
        console.error("WebRTC connection setup failed:", error);
        setPeerConnectionDisconnected(true);
      });

    // Cleanup
    return () => {
      eventSource?.close(); // Close SSE connection
      peerConnection.close();
      setMediaSrcObject(null);
      setViewerCount(0);
      setVideoLayers([]);
      setLayerEndpoint('');
      if (viewerCountIntervalRef.current) clearInterval(viewerCountIntervalRef.current);
    };
  // Dependencies: Only re-run if stream key or API path changes. setPeerConnectionDisconnected is stable.
  }, [currentStreamKey, apiPath, setPeerConnectionDisconnected]);


  return (
    // Use aspect-ratio for video container when not in cinema mode
    <div className={`relative w-full ${cinemaMode ? 'h-full' : 'aspect-video bg-black rounded-lg overflow-hidden shadow-lg'}`}>
        <video
          ref={videoRef}
          autoPlay
          muted // Keep muted by default for UX
          controls
          playsInline
          className={`block w-full h-full object-contain bg-black`} // Ensure video fills container correctly
        />

        {/* Viewer Count Overlay - improved positioning and style */}
        {!cinemaMode && viewerCount > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center space-x-1 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md pointer-events-none">
                <EyeIcon />
                <span>{viewerCount}</span>
            </div>
        )}

        {/* Layer selector positioned outside the video container */}
        {!cinemaMode && videoLayers.length >= 2 && (
             <div className="absolute top-3 right-3 z-10">
                <select
                    onChange={onLayerChange}
                    className="text-xs bg-slate-700/80 backdrop-blur-sm border border-slate-600/80 text-white rounded py-1 px-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    defaultValue="disabled"
                >
                    <option value="disabled" disabled>Quality</option>
                    {videoLayers.map(layer => (
                        <option key={layer} value={layer}>{layer}</option>
                    ))}
                </select>
            </div>
        )}
    </div>
  );
}

export default PlayerPage;