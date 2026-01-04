interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-3 border-[#d3dae1] rounded-full`}
        ></div>
        <div
          className={`${sizeClasses[size]} border-3 border-transparent border-t-neutral-700 rounded-full animate-spin absolute top-0 left-0`}
        ></div>
      </div>
    </div>
  );
}
