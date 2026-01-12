interface LoadingModalProps {
  isOpen: boolean;
  message: string;
}

export function LoadingModal({ isOpen, message }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-2xl max-w-sm w-full mx-4">
        {/* Spinner */}
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
        </div>

        {/* Message */}
        <p className="text-gray-700 text-center font-medium">{message}</p>

        {/* Sub message */}
        <p className="text-gray-500 text-sm text-center mt-2">
          Vui lòng đợi...
        </p>
      </div>
    </div>
  );
}
