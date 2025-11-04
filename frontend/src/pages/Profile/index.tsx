/**
 * Profile Page
 * TODO: Implement user profile display and editing
 */

export default function Profile() {
  return (
    <div className="container" style={{ padding: 'var(--spacing-xl)' }}>
      <h1>Profile</h1>
      <p className="text-secondary">User profile coming soon...</p>
      
      {/* TODO: Epic 3 - Implement User Profile Features */}
      <div style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)' }}>
        <p>Profile features to implement:</p>
        <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)' }}>
          <li>Display name</li>
          <li>Vehicle type selection</li>
          <li>Privacy mode toggle</li>
          <li>Account settings</li>
        </ul>
      </div>
    </div>
  );
}
