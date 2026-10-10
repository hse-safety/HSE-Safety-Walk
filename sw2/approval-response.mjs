// Validate server responses before granting access or handling report keys.
export function validateApprovalResponse(action, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('Invalid approval response');
  if (action === 'status') {
    if (body.approved !== true) throw Error('Safety Walk access has not been approved.');
  } else if (action === 'open') {
    if (typeof body.key_b64 !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(body.key_b64)) {
      throw Error('Invalid protected report key response');
    }
  } else if (action === 'register') {
    if (body.registered !== true) throw Error('Protected report key was not confirmed by the server');
  } else {
    throw Error('Unsupported approval action');
  }
  return body;
}
