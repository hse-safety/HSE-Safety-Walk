// Keep the inspection's existing state format, including embedded photo data URLs.
// The viewer supplies a storage bridge because sandboxed srcdoc has an opaque origin.
export function repairDesktopAutosave(source) {
 if(typeof source!=='string'||source.includes('data-sw2-autosave-repair'))return source;
 if(!source.includes('function captureAutosaveState()'))return source;
 const start=source.indexOf('    async function saveDraftNow() {');
 const end=source.indexOf('\n    function scheduleAutosave(',start);
 if(start<0||end<0)throw Error('Inspection autosave hooks unavailable');
 let html=source.slice(0,start)+`
    let autosaveRestoreFailed = false;
    let autosaveWriteQueue = Promise.resolve();
    let autosaveRevision = 0;
    let autosavePending = false;
    window.addEventListener('beforeunload', event => {
        if (autosavePending) { event.preventDefault(); event.returnValue = ''; }
    });
    function autosaveStatus(message, failed = false) {
        let el = document.getElementById('sw2AutosaveStatus');
        if (!el) {
            el = document.createElement('div');
            el.id = 'sw2AutosaveStatus';
            el.setAttribute('role', 'status');
            el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;max-width:90vw;padding:8px 12px;border-radius:6px;background:#e9f6ee;color:#173b24;font:13px system-ui;box-shadow:0 1px 6px #0002;pointer-events:none';
            document.body.append(el);
        }
        el.textContent = message;
        el.style.background = failed ? '#ffebe9' : '#e9f6ee';
        el.style.color = failed ? '#a01010' : '#173b24';
    }
    function saveDraftNow() {
        if (!autosaveReady || Date.now() < suppressAutosaveUntil) return autosaveWriteQueue;
        clearTimeout(autosaveTimer);
        // Capture now, before an asynchronous storage operation or page transition.
        let captured;
        try { captured = captureAutosaveState(); }
        catch (error) { autosaveStatus('NOT SAVED: ' + error.message, true); return Promise.resolve(); }
        const revision = ++autosaveRevision;
        autosavePending = true;
        autosaveStatus('Saving text and photos…');
        autosaveWriteQueue = autosaveWriteQueue.catch(() => {}).then(async () => {
            // A newer complete snapshot supersedes a queued one.
            if (revision !== autosaveRevision) return;
            if (window.__SW2_DRAFT_BRIDGE) {
                await window.__SW2_DRAFT_BRIDGE('write', captured);
            } else {
                const db = await openAutosaveDb();
                try {
                    const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
                    tx.objectStore(AUTOSAVE_STORE_NAME).put(captured, AUTOSAVE_KEY);
                    await new Promise((resolve, reject) => {
                        tx.oncomplete = resolve;
                        tx.onerror = () => reject(tx.error);
                        tx.onabort = () => reject(tx.error || new Error('Autosave transaction aborted'));
                    });
                } finally { db.close(); }
            }
            if (revision === autosaveRevision) { autosavePending = false; autosaveStatus('Text and photos saved locally · ' + new Date().toLocaleTimeString()); }
        }).catch(error => {
            autosaveStatus('NOT SAVED — ' + (error.message || error) + '. Keep this report open and use SEND to save a file.', true);
            console.warn('Safety Walk autosave failed', error);
        });
        return autosaveWriteQueue;
    }
    window.__SW2_FLUSH_DRAFT = async () => {
        await saveDraftNow();
        if (autosavePending || autosaveRestoreFailed) throw Error('Draft has not been saved. Keep this report open.');
    };
`+source.slice(end);
 html=html.replace("        try {\n            const db = await openAutosaveDb();\n            const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readonly');", "        try {\n            if (window.__SW2_DRAFT_BRIDGE) return await window.__SW2_DRAFT_BRIDGE('read');\n            const db = await openAutosaveDb();\n            const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readonly');");
 html=html.replace("        clearTimeout(autosaveTimer);\n        suppressAutosaveUntil = Date.now() + 5000;\n        // Clear only", "        clearTimeout(autosaveTimer);\n        suppressAutosaveUntil = Date.now() + 5000;\n        autosaveRevision++;\n        await autosaveWriteQueue;\n        if (window.__SW2_DRAFT_BRIDGE) { await window.__SW2_DRAFT_BRIDGE('clear'); return; }\n        // Clear only");
 html=html.replace('const observer = new MutationObserver(() => scheduleAutosave());', `const observer = new MutationObserver(changes => {
                if (changes.some(change => {
                    const el = change.target.nodeType === 1 ? change.target : change.target.parentElement;
                    return !!el?.closest?.('.photo-slot, #observationsList, #manualObservationsList, #bestPracticeList');
                })) scheduleAutosave();
            });`);
 html=html.replace("attributeFilter: ['class']", "attributeFilter: ['src']");
 html=html.replace('            if (src && questionSlots[index]) setSlotPhoto(questionSlots[index], src);', '            if (!questionSlots[index]) return;\n            if (src) setSlotPhoto(questionSlots[index], src);\n            else completelyClearPhotoSlot(questionSlots[index]);');
 html=html.replace("console.warn('Safety Walk restore failed', error);", "autosaveRestoreFailed = true; console.warn('Safety Walk restore failed', error);");
 html=html.replace('    purgeLegacySafetyWalkStorage()\n', "    const autosaveRestoreRoot = document.getElementById('hseDoc');\n    if (autosaveRestoreRoot) autosaveRestoreRoot.inert = true;\n    purgeLegacySafetyWalkStorage()\n");
 html=html.replace('            startPersistentAutosave();', `            if (autosaveRestoreRoot) autosaveRestoreRoot.inert = false;
            if (autosaveRestoreFailed) { autosaveStatus('NOT SAVED — saved draft could not be read. Keep this report open and save a file.', true); return; }
            startPersistentAutosave();
            saveDraftNow();
            navigator.storage?.persist?.().catch(() => {});`);
 html=html.replace("        clearTimeout(autosaveTimer);\n        autosaveTimer = setTimeout(saveDraftNow, delay);", "        autosaveRevision++;\n        autosavePending = true;\n        autosaveStatus('Unsaved changes — saving text and photos…');\n        clearTimeout(autosaveTimer);\n        autosaveTimer = setTimeout(saveDraftNow, delay);");
 // Print and exported reports must not carry a stale save confirmation.
 html=html.replace('        syncStandaloneSnapshotState(document.documentElement, clone);', "        syncStandaloneSnapshotState(document.documentElement, clone);\n        clone.querySelector('#sw2AutosaveStatus')?.remove();\n        clone.querySelector('[data-sw2-draft-bridge]')?.remove();");
 html=html.replace('</head>', '<style data-sw2-autosave-repair>@media print{#sw2AutosaveStatus{display:none!important}}</style></head>');
 return html;
}

export function installFrameDraftBridge(html) {
 const bootstrap = function () {
  const pending = new Map(); let serial = 0;
  window.__SW2_DRAFT_BRIDGE = (action, state) => new Promise((resolve, reject) => {
   const id = ++serial;
   const timer = setTimeout(() => { pending.delete(id); reject(Error('Autosave did not respond. Keep this report open.')); }, 15000);
   pending.set(id, {resolve, reject, timer});
   parent.postMessage({type:'sw2-draft-request', id, action, state}, '*');
  });
  window.addEventListener('message', event => {
   if(event.source !== parent) return;
   if(event.data?.type === 'sw2-draft-flush') {
    Promise.resolve().then(() => window.__SW2_FLUSH_DRAFT?.()).then(
     () => parent.postMessage({type:'sw2-draft-flushed',id:event.data.id}, '*'),
     error => parent.postMessage({type:'sw2-draft-flushed',id:event.data.id,error:error.message}, '*')
    );return;
   }
   if(event.data?.type !== 'sw2-draft-response') return;
   const request = pending.get(event.data.id); if(!request) return;
   clearTimeout(request.timer); pending.delete(event.data.id);
   if(event.data.error) request.reject(Error(event.data.error)); else request.resolve(event.data.state);
  });
 };
 const script='<script data-sw2-draft-bridge>('+bootstrap.toString()+')();</scr'+'ipt>';
 if(/<head[\s>]/i.test(html))return html.replace(/<head([^>]*)>/i,'<head$1>'+script);
 return html.replace(/<html([^>]*)>/i,'<html$1><head>'+script+'</head>');
}
