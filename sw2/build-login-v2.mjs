// Reconstruct the reviewed Safety Walk login from the exact historical Git blob.
// This avoids uploading the 1.85 MB user-supplied file and prevents accidental downgrades.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareV2LoginSource } from './prepare-login-v2.mjs';
const baselineBlob = 'cd30fdc1a7e827cd35910952316126d97591242a';
const source = execFileSync('git',['cat-file','blob',baselineBlob],{encoding:'utf8',maxBuffer:5_000_000});
const hash = createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
if (hash !== baselineBlob) throw Error('Original login blob has changed');
const release = prepareV2LoginSource(source);
if (!release.includes("const ONSITE_APP_FILE='onsite-v2.0.html';") ||
    !release.includes("const KVI_APP_FILE='kvi-premises-v1.0.html';") ||
    !release.includes('approval.approved !== true') ||
    release.length < 1_800_000) throw Error('Generated 2.0 login failed release checks');
writeFileSync('safety-login.html',release);
console.log('Safety Walk 2.0 staged login generated from verified original ('+Buffer.byteLength(release)+' bytes)');
