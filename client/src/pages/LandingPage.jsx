import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">U</span>
              </div>
              <span className="text-xl font-bold text-gray-900">uvox ai</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </a>
              <a href="#documentation" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Documentation
              </a>
              <a href="#resources" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Resources
              </a>
              <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Contact Sales
              </a>
            </div>

            {/* CTA Button */}
            <Link
              to="/dashboard"
              className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              JOIN / LOG IN
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradient Waves */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full">
            <svg
              className="absolute top-0 left-0 w-full h-full"
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <path
                d="M0,200 Q360,100 720,200 T1440,200 L1440,0 L0,0 Z"
                fill="url(#gradient1)"
              />
              <path
                d="M0,300 Q360,400 720,300 T1440,300 L1440,0 L0,0 Z"
                fill="url(#gradient1)"
                opacity="0.5"
              />
            </svg>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center">
            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              The only private
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
                uncensored
              </span>{' '}
              <span className="text-gray-900">Voice AI</span>
              <br />
              <span className="text-gray-900">Agents</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Build, deploy, and scale production-ready AI voice agents with complete privacy and no restrictions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="bg-gray-900 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-gray-800 transition-colors shadow-lg"
              >
                TRY FOR FREE
              </Link>
              <a
                href="#contact"
                className="bg-white text-gray-900 px-8 py-3 rounded-lg text-base font-medium border border-gray-300 hover:border-gray-400 transition-colors"
              >
                CONTACT SALES
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Trusted By Section */}
      <div className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-gray-500 uppercase tracking-wider mb-8">
            Trusted By
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center opacity-50">
            {/* Placeholder for company logos */}
            <div className="flex items-center justify-center">
              <div className="text-gray-400 font-semibold text-lg">Company 1</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-gray-400 font-semibold text-lg">Company 2</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-gray-400 font-semibold text-lg">Company 3</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-gray-400 font-semibold text-lg">Company 4</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-gray-400 font-semibold text-lg">Company 5</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-gray-400 font-semibold text-lg">Company 6</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
