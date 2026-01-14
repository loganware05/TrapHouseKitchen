import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <Icon className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">{title}</h3>
      <p className="text-gray-600 text-center max-w-md mb-6">{description}</p>
      {actionLabel && (actionLink || onAction) && (
        <>
          {actionLink ? (
            <Link
              to={actionLink}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}
