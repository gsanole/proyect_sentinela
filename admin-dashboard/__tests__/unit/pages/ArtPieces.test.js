import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ArtPieces from '../../../src/pages/ArtPieces';

describe('ArtPieces Page (Admin Approval)', () => {
  const mockPendingArt = [
    {
      id: '1',
      title: 'Test Art 1',
      artist: 'Test Artist',
      price: 100,
      status: 'pending'
    },
    {
      id: '2',
      title: 'Test Art 2',
      artist: 'Another Artist',
      price: 200,
      status: 'pending'
    }
  ];

  beforeEach(() => {
    fetch.mockClear();
  });

  it('should render pending art pieces', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPendingArt })
    });

    render(
      <BrowserRouter>
        <ArtPieces />
      </BrowserRouter>
    );

    expect(screen.getByText(/Art Pieces Approval/i)).toBeInTheDocument();
  });

  it('should handle art piece approval', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPendingArt })
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Art piece approved' })
    });

    render(
      <BrowserRouter>
        <ArtPieces />
      </BrowserRouter>
    );

    // Approval action tests will be added when component is implemented
  });

  it('should handle art piece rejection', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPendingArt })
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Art piece rejected' })
    });

    render(
      <BrowserRouter>
        <ArtPieces />
      </BrowserRouter>
    );

    // Rejection tests will be added when component is implemented
  });
});
