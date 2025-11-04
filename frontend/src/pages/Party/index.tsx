/**
 * Party Management Page
 * TODO: Implement party creation, joining, and management
 */

export default function Party() {
  return (
    <div className="container" style={{ padding: 'var(--spacing-xl)' }}>
      <h1>Party Management</h1>
      <p className="text-secondary">Party features coming soon...</p>
      
      {/* TODO: Story 3.2 - Implement Party/Group Creation */}
      <div style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)' }}>
        <h3>Create Party</h3>
        <p style={{ fontSize: 'var(--font-size-small)', marginTop: 'var(--spacing-sm)' }}>
          Generate 6-digit party code for group rides
        </p>
      </div>

      <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)' }}>
        <h3>Join Party</h3>
        <p style={{ fontSize: 'var(--font-size-small)', marginTop: 'var(--spacing-sm)' }}>
          Enter 6-digit code to join existing party
        </p>
      </div>
    </div>
  );
}
