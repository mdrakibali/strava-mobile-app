import { queryClient } from '../queryClient';
import { resetSessionOverlays } from '../sessionReset';

describe('resetSessionOverlays', () => {
  it('clears query cache so the next account starts clean', () => {
    queryClient.setQueryData(['test'], { foo: 'bar' });
    expect(queryClient.getQueryData(['test'])).toEqual({ foo: 'bar' });

    resetSessionOverlays();

    expect(queryClient.getQueryData(['test'])).toBeUndefined();
  });
});
