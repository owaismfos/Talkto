import { getContactDisplayName } from '../src/services/helper';

describe('getContactDisplayName', () => {
  it('prefers the saved nickname when available', () => {
    expect(getContactDisplayName({ nickname: 'Aisha', phoneNumber: '+1234567890' }, 'Unknown contact')).toBe('Aisha');
  });

  it('falls back to the phone number when there is no saved name', () => {
    expect(getContactDisplayName({ phoneNumber: '+1234567890' }, 'Unknown contact')).toBe('+1234567890');
  });
});
