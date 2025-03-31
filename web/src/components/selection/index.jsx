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
      <div className='bg-indigo-900 rounded-lg shadow-lg p-6 md:p-8'> {/* Synthwave: New card style bg */}
        <h1 className="text-3xl font-bold text-center mb-2 text-cyan-100">Welcome to Broadcast Box</h1> {/* Synthwave: Text color */}
        <p className="text-center text-cyan-300 mb-6 leading-relaxed"> {/* Synthwave: Text color */}
          Stream high-quality video in real time using WebRTC. Enter a stream key below to watch or publish.
        </p>

        <div className='mb-6'> {/* Increased bottom margin */}
          <label className='block text-sm font-medium text-cyan-200 mb-2' htmlFor='streamKey'> {/* Synthwave: Text color */}
            Stream Key
          </label>
          {/* Input uses base styles from index.css + specific tweaks */}
          <input
            className='w-full' // Uses base styles now from index.css
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
            className='btn-primary w-full py-2.5' // Uses base primary button style (Fuchsia)
            type='button'
            onClick={onWatchStreamClick}
            disabled={!streamKey.trim()} // Disable if empty
          >
            Watch Stream
          </button>

          <button
            className='btn-secondary w-full py-2.5' // Uses base secondary button style (Cyan)
            type='button'
            onClick={onPublishStreamClick}
            disabled={!streamKey.trim()} // Disable if empty
          >
            Publish Stream
          </button>
        </div>
      </div>

      {/* Potential Q&A or Info Section - Styled Example (Update if uncommented) */}
      {/*
      <div className="mt-8 bg-indigo-900 rounded-lg shadow-lg p-6 md:p-8 text-cyan-300"> // Synthwave bg/text
        <h2 className="text-xl font-semibold mb-4 text-cyan-100">About Broadcast Box</h2> // Synthwave text
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-cyan-100">What is it?</h3> // Synthwave text
            <p className="mt-1 text-sm leading-relaxed">A tool to broadcast video with sub-second latency using WebRTC, designed for simplicity and showcasing modern streaming tech.</p>
          </div>
          // ... (update other text colors if needed)
        </div>
      </div>
       */}
    </div>
  )
}

export default Selection;