import React from 'react'
import { useNavigate } from 'react-router-dom'

function Selection(props) {
  const [streamKey, setStreamKey] = React.useState('')
  const navigate = useNavigate()

  const onStreamKeyChange = e => {
    setStreamKey(e.target.value)
  }
  const onWatchStreamClick = () => {
    if (streamKey.trim() !== '') { // Added trim() for validation
      navigate(`/${streamKey.trim()}`)
    }
  }

  const onPublishStreamClick = () => {
    if (streamKey.trim() !== '') { // Added trim() for validation
      navigate(`/publish/${streamKey.trim()}`)
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && streamKey.trim() !== '') {
      // Default action: Watch Stream on Enter
      onWatchStreamClick();
    }
  };

  return (
    // Centered container with max-width
    <div className='container mx-auto max-w-xl px-4 pt-10 md:pt-16'>
      <div className='bg-slate-800 rounded-lg shadow-lg p-6 md:p-8'> {/* New card style */}
        <h1 className="text-3xl font-bold text-center mb-2 text-white">Welcome to Broadcast Box</h1>
        <p className="text-center text-gray-300 mb-6 leading-relaxed">
          Stream high-quality video in real time using WebRTC. Enter a stream key below to watch or publish.
        </p>

        <div className='mb-6'> {/* Increased bottom margin */}
          <label className='block text-sm font-medium text-gray-300 mb-2' htmlFor='streamKey'>
            Stream Key
          </label>
          {/* Input uses base styles from index.css + specific tweaks */}
          <input
            className='w-full' // Uses base styles now
            id='streamKey'
            type='text'
            placeholder='Enter a unique stream key'
            value={streamKey} // Controlled component
            onChange={onStreamKeyChange}
            onKeyPress={handleKeyPress} // Watch on Enter
            autoFocus
          />
        </div>

        {/* Updated button layout and styling */}
        <div className='flex flex-col sm:flex-row gap-4'>
          <button
            className='btn-primary w-full py-2.5' // Uses base primary button style
            type='button'
            onClick={onWatchStreamClick}
            disabled={!streamKey.trim()} // Disable if empty
          >
            Watch Stream
          </button>

          <button
            className='btn-secondary w-full py-2.5' // Uses base secondary button style
            type='button'
            onClick={onPublishStreamClick}
            disabled={!streamKey.trim()} // Disable if empty
          >
            Publish Stream
          </button>
        </div>
      </div>

      {/* Potential Q&A or Info Section - Styled Example */}
      {/*
      <div className="mt-8 bg-slate-800 rounded-lg shadow-lg p-6 md:p-8 text-gray-300">
        <h2 className="text-xl font-semibold mb-4 text-white">About Broadcast Box</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-white">What is it?</h3>
            <p className="mt-1 text-sm leading-relaxed">A tool to broadcast video with sub-second latency using WebRTC, designed for simplicity and showcasing modern streaming tech.</p>
          </div>
          <div>
            <h3 className="font-medium text-white">How does it work?</h3>
            <p className="mt-1 text-sm leading-relaxed">It uses WebRTC for both ingest (publishing) and playback (watching), offering speed and efficiency advantages over traditional RTMP/HLS.</p>
          </div>
          <div>
            <h3 className="font-medium text-white">Key Features:</h3>
            <ul className="list-disc list-inside mt-1 text-sm space-y-1">
              <li>Sub-second latency streaming.</li>
              <li>Support for modern codecs like AV1 (browser/client dependent).</li>
              <li>Publish directly from your browser or tools like OBS.</li>
              <li>No public IP needed for simple P2P scenarios (requires server reachability).</li>
            </ul>
          </div>
        </div>
      </div>
       */}
    </div>
  )
}

export default Selection;