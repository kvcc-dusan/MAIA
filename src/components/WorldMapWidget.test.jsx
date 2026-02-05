// @vitest-environment jsdom
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import WorldMapWidget, { MapVisual } from './WorldMapWidget';

// Mock the dynamic import in WorldMapWidget
// Since it uses import(), we can't easily mock it without mocking the module system or using vi.mock on the dependency.
// But we already mocked 'world-atlas...' in the previous step.
vi.mock('world-atlas/land-110m.json?json', () => ({
  default: {
    type: 'Topology',
    objects: {
      land: {
        type: 'MultiPolygon',
        arcs: []
      }
    }
  }
}));

describe('WorldMapWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders clock and updates time without crashing', async () => {
    render(<WorldMapWidget weather={null} />);

    // Check if initial time renders
    const timeElement = screen.getByText(/:/);
    expect(timeElement).toBeTruthy();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Just ensuring it doesn't crash
    expect(screen.getByText(/:/)).toBeTruthy();
  });

  it('MapVisual renders with given coords', () => {
    const coords = { lat: 48, lon: 15 };
    const topology = {
        type: 'Topology',
        objects: {
          land: {
            type: 'MultiPolygon',
            arcs: []
          }
        }
    };

    const { container } = render(<MapVisual coords={coords} topology={topology} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // Check if dot is rendered
    expect(container.querySelector('.animate-ping')).toBeTruthy();
  });
});
