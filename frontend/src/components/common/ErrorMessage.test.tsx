import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from '../../services/api.ts';
import { render, SIGNED_OUT, text } from '../../test/render.tsx';
import { ErrorMessage } from './ErrorMessage.tsx';

describe('ErrorMessage', () => {
  it('shows the message for the API code and the server field details', () => {
    const error = new ApiError(400, 'VALIDATION_FAILED', 'x', [{ field: 'items[0].quantity', message: 'must be at most 50' }]);
    const page = text(render(<ErrorMessage error={error} />));
    assert.match(page, /Some details in your order aren't valid\./);
    assert.match(page, /items\[0\]\.quantity must be at most 50/);
  });

  it('offers Login for 401 and Try again for other errors', () => {
    assert.match(text(render(<ErrorMessage error={new ApiError(401, null, null)} onRetry={() => {}} />, { auth: SIGNED_OUT })), /Login/);
    const retry = text(render(<ErrorMessage error={new ApiError(503, 'PRICING_UNAVAILABLE', null)} onRetry={() => {}} />));
    assert.match(retry, /No order was placed/);
    assert.match(retry, /Try again/);
  });

  it('never shows raw server text for unknown errors', () => {
    const page = text(render(<ErrorMessage error={new ApiError(500, 'SOMETHING_NEW', 'java.sql.SQLException: secret')} />));
    assert.doesNotMatch(page, /SQLException/);
    assert.match(page, /Something went wrong \(error 500\)/);
  });
});
