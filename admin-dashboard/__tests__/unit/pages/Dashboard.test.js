import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../../src/pages/Dashboard';

describe('Dashboard Page', () => {
  it('should render dashboard heading', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it('should display analytics when loaded', async () => {
    const mockAnalytics = {
      totalSales: 50000,
      totalArtists: 25,
      totalBuyers: 150,
      pendingApprovals: 10
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnalytics })
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Analytics display tests will be added when component is implemented
  });
});
