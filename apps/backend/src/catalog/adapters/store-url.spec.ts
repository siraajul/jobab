import { approvedStoreUrl } from './store-url';
describe('Catalog connection destinations', () => {
  it.each([
    'http://shop.example',
    'https://127.0.0.1',
    'https://169.254.169.254',
    'https://redis',
    'https://user:password@shop.example',
    'https://shop.example:8443',
    'https://unapproved.example',
  ])('rejects unsafe or unapproved destination %s', (url) => {
    expect(() => approvedStoreUrl(url, ['shop.example'])).toThrow();
  });
  it('accepts an explicitly approved HTTPS store', () => {
    expect(approvedStoreUrl('https://shop.example', ['shop.example']).hostname).toBe(
      'shop.example',
    );
  });
});
