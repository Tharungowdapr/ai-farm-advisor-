import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrainOverlay, SectionLabel } from './GrainOverlay';

describe('GrainOverlay', () => {
  it('renders without crashing', () => {
    const { container } = render(<GrainOverlay />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('SectionLabel', () => {
  it('renders text correctly', () => {
    render(<SectionLabel text="Test Label" />);
    expect(screen.getByText('Test Label')).toBeTruthy();
  });
});
