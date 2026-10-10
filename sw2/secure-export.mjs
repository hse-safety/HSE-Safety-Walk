// Never silently fall back to a cleartext HTML export.
import { encryptHtml, buildCarrierHtml } from './report-core.mjs';
import { approvalApi } from './auth.mjs';
import { REPORT_VIEWER_URL } from './config.mjs';
export async function protectSnapshot(clearHtml) {
  await approvalApi('status');
  const {package:encrypted,key}=await encryptHtml(clearHtml);
  await approvalApi('register',{report_id:encrypted.id,key_b64:key});
  return buildCarrierHtml(encrypted,REPORT_VIEWER_URL);
}
window.SW2ReportExport=Object.freeze({protectSnapshot});
