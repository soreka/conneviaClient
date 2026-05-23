import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('smoke', () => {
  test('renders a Text component', () => {
    render(<Text>Hello tests</Text>);
    expect(screen.getByText('Hello tests')).toBeTruthy();
  });
});
