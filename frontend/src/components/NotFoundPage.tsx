import React from 'react'
import { ArrowLeft, Compass } from 'lucide-react'

export const NotFoundPage: React.FC = () => (
  <main className="app-recovery-screen not-found-screen">
    <div className="app-recovery-card">
      <div className="app-recovery-icon" aria-hidden="true"><Compass size={24} /></div>
      <p className="app-recovery-kicker">404 / route unavailable</p>
      <h1>This workspace view does not exist.</h1>
      <p>Return to the QueryTrust AI overview to continue working with the synthetic educational dataset.</p>
      <a className="btn btn-primary" href="/">
        <ArrowLeft size={16} aria-hidden="true" /> Back to overview
      </a>
    </div>
  </main>
)
