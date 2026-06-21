const PageLoader = () => (
  <div className="flex min-h-[50vh] w-full items-center justify-center">
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"
      role="status"
      aria-label="Loading"
    />
  </div>
);

export default PageLoader;
