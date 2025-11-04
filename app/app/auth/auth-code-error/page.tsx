import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
        <p className="text-gray-600 mb-6">
          Sorry, we couldn&apos;t complete your authentication. This could be due to an expired link or an error in the process.
        </p>
        <div className="space-y-2">
          <Link
            href="/login"
            className="block w-full bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Logging In Again
          </Link>
          <Link
            href="/signup"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Create New Account
          </Link>
        </div>
      </div>
    </div>
  )
}
