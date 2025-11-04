/**
 * Login Page
 * TODO: Implement authentication form and logic
 */

export default function Login() {
  return (
    <div className="container" style={{ padding: 'var(--spacing-xl)' }}>
      <h1>Log In</h1>
      <p className="text-secondary">Authentication coming soon...</p>
      
      {/* TODO: Story 3.1 - Implement Authentication */}
      <div style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)' }}>
        <p>Features to implement:</p>
        <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)' }}>
          <li>Email/password login form</li>
          <li>JWT token management</li>
          <li>Form validation</li>
          <li>Error handling</li>
        </ul>
      </div>
    </div>
  );
}
