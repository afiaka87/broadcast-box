// Optional: Add an icon import if you want one
// import { ExclamationTriangleIcon } from '@heroicons/react/20/solid'

export default function ErrorHeader({ children: error }) {
  // Using a slightly less intense red, consistent padding/rounding
  return (
    <div className={'bg-rose-600 text-white text-base font-medium ' + // Adjusted color/size
      'text-center p-4 rounded-lg whitespace-pre-wrap mb-4 shadow' // Added margin-bottom
    }>
      {/* Optional Icon: <ExclamationTriangleIcon className="h-5 w-5 inline-block mr-2 align-text-bottom" /> */}
      {error}
    </div>
  )
}