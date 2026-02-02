// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WorldMapWidget from './WorldMapWidget';

describe('WorldMapWidget', () => {
  it('renders the map path with a valid d attribute', async () => {
    const { container } = render(<WorldMapWidget />);

    // Find the map SVG (the one with viewBox="0 0 300 180")
    // Note: querySelectorAll returns a NodeList
    const svgs = document.querySelectorAll('svg');
    console.log(`Found ${svgs.length} SVGs`);

    let mapSvg = null;
    svgs.forEach(svg => {
        if (svg.getAttribute('viewBox') === '0 0 300 180') {
            mapSvg = svg;
        }
    });

    expect(mapSvg).toBeTruthy();

    const path = mapSvg.querySelector('path');
    console.log('Map SVG Path:', path);

    expect(path).toBeTruthy();

    // Check if d attribute is present and non-empty
    const d = path.getAttribute('d');
    console.log('Path d attribute length:', d ? d.length : 'null');

    expect(d).not.toBeNull();
    expect(d.length).toBeGreaterThan(0);
  });
});
