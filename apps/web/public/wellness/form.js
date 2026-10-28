// Wellness sign-up: choose a time first, keep selections across times/days, and prevent overlaps.
const form=document.querySelector('#rsvp'),error=document.querySelector('#error');let id,fingerprint;
const options=[...form.querySelectorAll('.class-option')];
const summary=document.querySelector('#selection-summary'),summaryList=document.querySelector('#selection-list');
const setSlot=(fieldset,slot)=>{
  fieldset.dataset.activeSlot=slot;
  for(const button of fieldset.querySelectorAll('.time-slot'))button.setAttribute('aria-pressed',String(button.dataset.slot===slot));
  for(const option of fieldset.querySelectorAll('.class-option'))option.hidden=!option.hasAttribute('data-dropin')&&option.dataset.slot!==slot;
};
for(const fieldset of form.querySelectorAll('.class-day')){
  for(const button of fieldset.querySelectorAll('.time-slot'))button.addEventListener('click',()=>setSlot(fieldset,button.dataset.slot));
  setSlot(fieldset,fieldset.dataset.activeSlot);
}
const refresh=()=>{
  for(const label of form.querySelectorAll('.activity,.transport-option'))label.classList.toggle('selected',label.querySelector('input').checked);
  const chosen=options.filter(option=>option.querySelector('input').checked&&!option.hasAttribute('data-dropin'));
  for(const option of options){
    const input=option.querySelector('input');
    if(option.hasAttribute('data-dropin')||input.checked){input.disabled=false;option.classList.remove('disabled');continue;}
    const clash=chosen.some(current=>current.dataset.day===option.dataset.day&&+current.dataset.start<+option.dataset.end&&+option.dataset.start<+current.dataset.end);
    input.disabled=clash;option.classList.toggle('disabled',clash);
  }
  const selected=options.filter(option=>option.querySelector('input').checked);
  summary.hidden=selected.length===0;
  summaryList.replaceChildren(...selected.map(option=>{
    const row=document.createElement('p');
    row.textContent=`${option.closest('fieldset').querySelector('legend').textContent} · ${option.querySelector('b').textContent} — ${option.querySelector('strong').textContent}`;
    return row;
  }));
};
form.addEventListener('change',refresh);
const post=async(body,requestId)=>{let last;for(let i=0;i<4;i++){try{const response=await fetch('/api/wellness',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestId},body,signal:AbortSignal.timeout(20000)});if(response.status<500)return response;last=response;}catch(cause){last=cause;}await new Promise(resolve=>setTimeout(resolve,600*(i+1)));}if(last instanceof Response)return last;throw last;};
form.addEventListener('submit',async event=>{
  event.preventDefault();const fields=new FormData(form);error.hidden=true;
  const sessions=fields.getAll('sessions');
  const data={name:fields.get('name').trim(),email:fields.get('email').trim(),phone:fields.get('phone').trim(),sessions,waiverAccepted:fields.has('waiverAccepted'),signature:(fields.get('signature')||'').trim(),waiverVersion:fields.get('waiverVersion')||'',website:fields.get('website')||'',textConsent:fields.has('textConsent')};
  if(!sessions.length){error.textContent='Please choose at least one activity.';error.hidden=false;return;}
  const button=form.querySelector('button.primary');button.disabled=true;button.textContent='Saving your sign-up…';
  try{
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data))))].map(value=>value.toString(16).padStart(2,'0')).join('');
    if(fingerprint!==digest){let previous;try{previous=JSON.parse(sessionStorage.getItem('nas-wellness-request')||'null');}catch{}id=previous?.fingerprint===digest&&/^[a-f0-9-]{36}$/i.test(previous.id)?previous.id:crypto.randomUUID();fingerprint=digest;try{sessionStorage.setItem('nas-wellness-request',JSON.stringify({id,fingerprint}));}catch{}}
    data.id=id;data.requestId=id;
    const response=await post(JSON.stringify(data),id);const result=await response.json().catch(()=>null);
    if(!response.ok||result?.ok!==true)throw Error(result?.error||'We couldn’t verify your sign-up. Please try again; your details are still here.');
    form.hidden=true;document.querySelector('#confirmation').hidden=false;const list=document.querySelector('#confirmed-activities');
    list.replaceChildren();
    if(Array.isArray(result.bookings)){
      document.querySelector('#confirmation h3').textContent='Your wellness activities';document.querySelector('#confirmation > p').textContent='Your registration status is shown below. Save your private link to view or cancel your activities.';
      for(const booking of result.bookings){const p=document.createElement('p');p.textContent=`${booking.day} · ${booking.time} — ${booking.title}: ${booking.status==='waitlisted'?`Waitlisted (position ${booking.waitlistPosition})`:booking.status==='cancelled'?'Cancelled':'Registered'}`;list.append(p);}
      if(typeof result.manageUrl==='string'&&result.manageUrl.startsWith('/wellness/manage.html#token=')){const link=document.createElement('a');link.href=result.manageUrl;link.className='primary manage-link';link.textContent='View or cancel my activities';link.rel='noreferrer';list.append(link);}
    }else for(const option of options.filter(item=>item.querySelector('input').checked)){const p=document.createElement('p');p.textContent=`${option.closest('fieldset').querySelector('legend').textContent} · ${option.querySelector('b').textContent} — ${option.querySelector('strong').textContent}`;list.append(p);}
  }catch(cause){error.textContent=cause.message||'We couldn’t save your sign-up. Please try again; your details are still here.';error.hidden=false;}
  finally{button.disabled=false;button.textContent='Sign up';}
});
refresh();
