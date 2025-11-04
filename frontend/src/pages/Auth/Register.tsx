/**
 * Register Page
 * TODO: Implement registration form and logic
 */

export default function Register() {
  return (
    <div className="container" style={{ padding: 'var(--spacing-xl)' }}>
      <h1>Register</h1>
      <p className="text-secondary">Create your SpeedLink account...</p>
      
      {/* TODO: Story 3.1 - Implement Authentication */}
      <div style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)' }}>
        <p>Features to implement:</p>
        <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)' }}>
          <li>Email/password registration form</li>
          <li>Display name selection</li>
          <li>Vehicle type selection</li>
          <li>Password strength validation</li>
        </ul>
      </div>
    </div>
  );
}
