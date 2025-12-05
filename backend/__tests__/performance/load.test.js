const Artillery = require('artillery');

/**
 * Performance/Load Testing Configuration
 * 
 * Run with: artillery run performance.test.yml
 * Or programmatically with this test file
 */

describe('Performance Tests', () => {
  const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

  describe('API Response Times', () => {
    it('should respond to health check within 100ms', async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL.replace('/api/v1', '')}/health`);
      const duration = Date.now() - start;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it('should respond to art pieces feed within 200ms', async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/art-pieces?page=1&limit=20`);
      const duration = Date.now() - start;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(200);
    });

    it('should respond to search within 300ms', async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/art-pieces/search?query=art`);
      const duration = Date.now() - start;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Database Query Performance', () => {
    const db = require('../../src/config/database');

    it('should execute simple queries within 50ms', async () => {
      const start = Date.now();
      await db.query('SELECT COUNT(*) FROM users');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should execute complex joins within 100ms', async () => {
      const query = `
        SELECT ap.*, u.first_name, u.last_name, ai.image_url
        FROM art_pieces ap
        JOIN artist_profiles art ON ap.artist_id = art.id
        JOIN users u ON art.user_id = u.id
        LEFT JOIN art_images ai ON ap.id = ai.art_piece_id AND ai.is_primary = true
        WHERE ap.status = 'approved'
        LIMIT 20
      `;

      const start = Date.now();
      await db.query(query);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 100 concurrent requests', async () => {
      const promises = Array(100).fill().map(() =>
        fetch(`${BASE_URL}/art-pieces?page=1&limit=10`)
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      const allSuccessful = responses.every(r => r.ok);
      expect(allSuccessful).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent searches without degradation', async () => {
      const queries = ['art', 'painting', 'sculpture', 'abstract', 'modern'];
      const promises = queries.flatMap(query =>
        Array(20).fill().map(() =>
          fetch(`${BASE_URL}/art-pieces/search?query=${query}`)
        )
      );

      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(r => r.ok);

      expect(allSuccessful).toBe(true);
      expect(responses.length).toBe(100);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory on repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make 1000 requests
      for (let i = 0; i < 1000; i++) {
        await fetch(`${BASE_URL}/art-pieces?page=1&limit=10`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Pagination Performance', () => {
    it('should maintain consistent performance across pages', async () => {
      const pages = [1, 10, 50, 100];
      const durations = [];

      for (const page of pages) {
        const start = Date.now();
        await fetch(`${BASE_URL}/art-pieces?page=${page}&limit=20`);
        durations.push(Date.now() - start);
      }

      // All pages should respond within similar timeframes
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      const variance = maxDuration - minDuration;

      // Variance should be less than 200ms
      expect(variance).toBeLessThan(200);
    });
  });
});
