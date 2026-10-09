/* Safety Walk 2.0 – fail-closed online approval state machine.
 * Client gating is a defence-in-depth control, NOT copy-proof encryption.
 * Approved report decryption is separately enforced by the server key endpoint.
 */
export function createApprovalController({ check, onState }) {
  if (typeof check !== 'function' || typeof onState !== 'function') throw new TypeError('Missing check/onState');
  let epoch = 0;
  let stopped = false;
  let state = 'checking';
  onState(state);
  const change = next => {
    if (stopped) return;
    state = next;
    onState(next);
  };
  const lock = (reason = 'checking') => {
    ++epoch;
    change(reason);
  };
  const verify = async () => {
    if (stopped) return false;
    const ticket = ++epoch;
    change('checking');
    let permitted = false;
    try { permitted = (await check()) === true; } catch { permitted = false; }
    if (stopped || ticket !== epoch) return false;
    change(permitted ? 'approved' : 'denied');
    return permitted;
  };
  const stop = () => { stopped = true; ++epoch; state = 'denied'; onState('denied'); };
  return { verify, lock, stop, getState: () => state };
}
