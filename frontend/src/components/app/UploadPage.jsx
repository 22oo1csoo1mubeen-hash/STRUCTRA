import WelcomeSection from './WelcomeSection';
import UploadCard from './UploadCard';
import HowItWorks from './HowItWorks';
import RecentUploads from './RecentUploads';

/**
 * UploadPage
 * The default landing page after authentication.
 * Composes: WelcomeSection + UploadCard + HowItWorks + RecentUploads
 */
export default function UploadPage() {
  const handleFilesSelected = (files) => {
    // Upload logic will be wired to the backend in a later phase
    console.log('Files selected:', files);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        paddingBottom: 40,
      }}
    >
      {/* Welcome greeting */}
      <WelcomeSection userName="Mubeen" />

      {/* Upload drag-and-drop card */}
      <UploadCard onFilesSelected={handleFilesSelected} />

      {/* How it works steps */}
      <HowItWorks />

      {/* Recent uploads / empty state */}
      <RecentUploads uploads={[]} />
    </div>
  );
}
