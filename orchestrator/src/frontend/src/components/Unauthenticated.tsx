import React from "react";

const Unauthenticated: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
        <h2 className="mb-4 text-gray-800 text-2xl font-semibold">
          🔐 Authentication Required
        </h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          You need to be authenticated to access PoolMind. Please use the
          official Telegram bot to get started.
        </p>

        <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
          <h3 className="font-semibold text-blue-800 mb-2">
            How to get started:
          </h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Open the PoolMind Telegram bot</li>
            <li>Follow the authentication instructions</li>
            <li>You'll be redirected back here with proper credentials</li>
          </ol>
        </div>

        <div className="text-sm text-gray-500">
          <p>Need help? Contact our support team.</p>
        </div>
      </div>
    </div>
  );
};

export default Unauthenticated;
