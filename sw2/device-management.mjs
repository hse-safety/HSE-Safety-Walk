import {adminDevices} from './licensing.mjs';
export function attachDeviceManagement(container){
 if(!container||container.querySelector('[data-sw2-devices]'))return;
 const section=document.createElement('section');section.dataset.sw2Devices='';
 const title=document.createElement('h3');title.textContent='Safety Walk 2.0 · Device approval';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh devices';
 const message=document.createElement('p');message.setAttribute('role','status');
 const rows=document.createElement('div');section.append(title,refresh,message,rows);container.append(section);
 async function load(){refresh.disabled=true;message.textContent='Checking devices…';try{const {devices}=await adminDevices('devices-list');rows.replaceChildren();for(const device of devices){
  const row=document.createElement('div'),label=document.createElement('p');label.textContent=[device.label,device.user_name,device.status].join(' · ');row.append(label);
  for(const [action,text]of [['device-approve','Approve device'],['device-revoke','Revoke device']]){const button=document.createElement('button');button.type='button';button.textContent=text;button.disabled=(action==='device-approve'&&device.status==='approved')||(action==='device-revoke'&&device.status==='revoked');button.onclick=async()=>{button.disabled=true;try{await adminDevices(action,{device_id:device.device_id});await load()}catch(e){message.textContent=e.message;button.disabled=false}};row.append(button)}rows.append(row);
 }message.textContent=devices.length?'Only approved devices can use Safety Walk 2.0.':'No devices registered.';}catch(e){message.textContent=e.message}finally{refresh.disabled=false}}
 refresh.onclick=load;
 const observer=new MutationObserver(()=>{if(!container.hidden&&getComputedStyle(container).display!=='none')void load()});observer.observe(container,{attributes:true,attributeFilter:['class','style','hidden']});
}
