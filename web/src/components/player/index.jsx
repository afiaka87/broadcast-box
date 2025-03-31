import React, { useContext, useEffect, useMemo, useState, useRef } from 'react' // Added useRef
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
  return (
    <CinemaModeContext.Provider value={state}>
      {children}
    </CinemaModeContext.Provider>
  );
}

function PlayerPage() {
  const { cinemaMode, toggleCinemaMode } = useContext(CinemaModeContext);
  const [peerConnectionDisconnected, setPeerConnectionDisconnected] = React.useState(false)

  return (
    <>
      {peerConnectionDisconnected && <ErrorHeader> WebRTC has disconnected or failed to connect at all 😭 </ErrorHeader>}
      <div className={`flex flex-col items-center ${!cinemaMode && 'mx-auto px-2 py-2 container'}`}>
        <Player cinemaMode={cinemaMode} peerConnectionDisconnected={peerConnectionDisconnected} setPeerConnectionDisconnected={setPeerConnectionDisconnected} />
        <button className='bg-blue-900 px-4 py-2 rounded-lg mt-6' onClick={toggleCinemaMode}>
          {cinemaMode ? "Disable cinema mode" : "Enable cinema mode"}
        </button>
      </div>
    </>
  )
}

// Simple Eye icon SVG component
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);


function Player({ cinemaMode, peerConnectionDisconnected, setPeerConnectionDisconnected }) {
  const videoRef = useRef(null); // Changed to useRef
  const location = useLocation();
  const [videoLayers, setVideoLayers] = useState([]); // Keep useState
  const [mediaSrcObject, setMediaSrcObject] = useState(null); // Keep useState
  const [layerEndpoint, setLayerEndpoint] = useState(''); // Keep useState
  const [viewerCount, setViewerCount] = useState(0); // <-- ADDED: State for viewer count
  const viewerCountIntervalRef = useRef(null); // <-- ADDED: Ref to store interval ID

  const onLayerChange = event => {
    fetch(layerEndpoint, {
      method: 'POST',
      body: JSON.stringify({ mediaId: '1', encodingId: event.target.value }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaSrcObject
    }
  }, [mediaSrcObject]) // Removed videoRef from deps as it's a ref

  // <-- ADDED: Effect for fetching viewer count
  useEffect(() => {
    const currentStreamKey = location.pathname.split('/').pop();
    if (!currentStreamKey) return; // Don't run if no stream key

    const fetchViewerCount = async () => {
      try {
          const apiPath = import.meta.env.VITE_API_PATH ?? (() => {
              console.warn('[broadcast box] REACT_APP_API_PATH is deprecated, please use VITE_API_PATH instead');
              return import.meta.env.REACT_APP_API_PATH;
          })();
          const response = await fetch(`${apiPath}/status`);
          if (!response.ok) {
              console.error("Failed to fetch status:", response.statusText);
              setViewerCount(0); // Reset on error
              return;
          }
          const statuses = await response.json();
          const currentStreamStatus = statuses.find(status => status.streamKey === currentStreamKey);

          if (currentStreamStatus) {
              setViewerCount(currentStreamStatus.viewerCount);
          } else {
              // Stream might not be live yet or status endpoint is slow
              setViewerCount(0);
          }
      } catch (error) {
          console.error("Error fetching viewer count:", error);
          setViewerCount(0); // Reset on error
      }
    };

    // Fetch immediately
    fetchViewerCount();

    // Fetch periodically (every 10 seconds)
    viewerCountIntervalRef.current = setInterval(fetchViewerCount, 10000);

    // Cleanup function to clear interval
    return () => {
      if (viewerCountIntervalRef.current) {
        clearInterval(viewerCountIntervalRef.current);
      }
    };
  }, [location.pathname]); // Re-run if the stream key (path) changes


  React.useEffect(() => {
    const peerConnection = new RTCPeerConnection() // eslint-disable-line

    peerConnection.ontrack = function (event) {
      setMediaSrcObject(event.streams[0])
    }

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setPeerConnectionDisconnected(false)
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') { // Added 'closed'
        setPeerConnectionDisconnected(true)
        // Also reset viewer count if connection is lost
        setViewerCount(0);
        if (viewerCountIntervalRef.current) {
           clearInterval(viewerCountIntervalRef.current); // Stop polling if disconnected
        }
      }
    }

    peerConnection.addTransceiver('audio', { direction: 'recvonly' })
    peerConnection.addTransceiver('video', { direction: 'recvonly' })

    peerConnection.createOffer().then(offer => {
      offer["sdp"] = offer["sdp"].replace("useinbandfec=1", "useinbandfec=1;stereo=1")
      peerConnection.setLocalDescription(offer)

      const apiPath = import.meta.env.VITE_API_PATH ?? (() => {
      console.warn('[broadcast box] REACT_APP_API_PATH is deprecated, please use VITE_API_PATH instead');
      return import.meta.env.REACT_APP_API_PATH;
      })();

      fetch(`${apiPath}/whep`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${location.pathname.split('/').pop()}`,
          'Content-Type': 'application/sdp'
        }
      }).then(r => {
        if (!r.ok) { // Handle fetch errors for WHEP
            throw new Error(`WHEP request failed: ${r.statusText}`);
        }
        const parsedLinkHeader = parseLinkHeader(r.headers.get('Link'))
        // Safely access potentially missing header values
        const layerUrl = parsedLinkHeader?.['urn:ietf:params:whep:ext:core:layer']?.url;
        const sseUrl = parsedLinkHeader?.['urn:ietf:params:whep:ext:core:server-sent-events']?.url;

        if (layerUrl) {
           setLayerEndpoint(`${window.location.protocol}//${layerUrl}`);
        }
        if (sseUrl) {
           const evtSource = new EventSource(`${window.location.protocol}//${sseUrl}`);
           evtSource.onerror = err => evtSource.close();

           evtSource.addEventListener("layers", event => {
             try { // Add try-catch for JSON parsing
               const parsed = JSON.parse(event.data);
               // Safe navigation for potentially missing keys
               const layers = parsed?.['1']?.['layers']?.map(l => l.encodingId);
               if (layers) {
                 setVideoLayers(layers);
               }
             } catch (e) {
               console.error("Failed to parse layers event data:", e);
             }
           });
           // Store evtSource to close it in cleanup? Maybe not strictly needed if PC closes.
        }


        return r.text()
      }).then(answer => {
        peerConnection.setRemoteDescription({
          sdp: answer,
          type: 'answer'
        })
      }).catch(error => { // Catch errors from the WHEP fetch chain
        console.error("WHEP connection setup failed:", error);
        setPeerConnectionDisconnected(true); // Mark as disconnected on setup failure
        // Maybe show an error message to the user here
      });
    })

    return function cleanup() {
      peerConnection.close()
      setMediaSrcObject(null); // Clear video on cleanup
      setViewerCount(0); // Reset viewer count on cleanup/navigation
      if (viewerCountIntervalRef.current) { // Clear interval on component unmount
         clearInterval(viewerCountIntervalRef.current);
      }
    }
    // Added dependencies: location.pathname to re-initiate connection if stream changes
  }, [location.pathname, setPeerConnectionDisconnected])

  return (
    <>
      <div className="relative w-full"> {/* Added relative positioning container */}
        <video
          ref={videoRef}
          autoPlay
          muted
          controls
          playsInline
          className={`bg-black w-full ${cinemaMode ? "h-full" : ""}`} // Simplified className
          style={cinemaMode ? { maxHeight: '100vh', maxWidth: '100vw' } : {}}
        />
        {/* -- ADDED: Viewer Count Display -- */}
        {!cinemaMode && ( // Only show outside cinema mode for now, adjust as needed
            <div className="absolute bottom-14 left-4 md:bottom-16 lg:bottom-20 flex items-center space-x-1 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded">
                <EyeIcon />
                <span>{viewerCount}</span>
            </div>
        )}
      </div>


      {videoLayers.length >= 2 &&
        <select defaultValue="disabled" onChange={onLayerChange} className="mt-2 appearance-none border w-full py-2 px-3 leading-tight focus:outline-hidden focus:shadow-outline bg-gray-700 border-gray-700 text-white rounded-sm shadow-md placeholder-gray-200">
          <option value="disabled" disabled={true}>Choose Quality Level</option>
          {videoLayers.map(layer => {
            return <option key={layer} value={layer}>{layer}</option>
          })}
        </select>
      }
    </>
  )
}

// Ensure the PlayerPage component still wraps Player and provides context
export default PlayerPage;