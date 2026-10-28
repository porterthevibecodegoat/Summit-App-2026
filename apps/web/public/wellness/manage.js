const token=new URLSearchParams(location.hash.slice(1)).get('token');
// A different private link can target this same document in an existing tab.
// Reload so the visible activities and cancellation capability always agree.
window.addEventListener('hashchange',()=>location.reload());
const status=document.querySelector('#manage-status'),error=document.querySelector('#manage-error'),activities=document.querySelector('#manage-activities');
const requests=new Map();
async function update(action,bookingId){
  error.hidden=true;status.textContent=action==='cancel'?'Updating your activity…':'Loading your activities…';
  for(const button of activities.querySelectorAll('button'))button.disabled=true;
  try{
    if(!token)throw Error('Please open your complete private management link.');
    let requestId;
    if(action==='cancel'){requestId=requests.get(bookingId)||crypto.randomUUID();requests.set(bookingId,requestId);}
    const response=await fetch('/api/wellness/manage',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:AbortSignal.timeout(20000),body:JSON.stringify({token,action,...(bookingId?{bookingId,requestId}:{})})});
    const data=await response.json().catch(()=>null);if(!response.ok||!Array.isArray(data?.bookings))throw Error(data?.error||'We couldn’t update your activities. Please try again.');
    render(data.bookings);status.textContent=action==='cancel'?'Your activity has been cancelled.':'Your current registration status is shown below.';
  }catch(cause){error.textContent=cause instanceof TypeError||cause.name==='TimeoutError'?'We couldn’t reach the event site. Please try again.':cause.message||'Please try again.';error.hidden=false;status.textContent='';}
  finally{for(const button of activities.querySelectorAll('button'))button.disabled=false;}
}
function render(bookings){
  activities.replaceChildren();
  for(const booking of bookings){
    const card=document.createElement('section');card.className='manage-card';
    const title=document.createElement('h2');title.textContent=booking.title;
    const when=document.createElement('p');when.textContent=`${booking.day} · ${booking.time}`;
    const state=document.createElement('p');state.className=`booking-state ${booking.status}`;state.textContent=booking.status==='registered'?'Registered':booking.status==='waitlisted'?`Waitlisted — position ${booking.waitlistPosition}`:booking.status==='cancelled'?'Cancelled':'Please contact the event team';
    card.append(title,when,state);
    if(booking.canCancel){
      const button=document.createElement('button');button.type='button';button.textContent='Cancel activity';
      const confirm=document.createElement('div');confirm.hidden=true;const prompt=document.createElement('p');prompt.textContent='Cancel this activity? Your place will be released.';
      const keep=document.createElement('button');keep.type='button';keep.textContent='Keep activity';
      const yes=document.createElement('button');yes.type='button';yes.textContent='Yes, cancel activity';yes.className='cancel-confirm';
      keep.addEventListener('click',()=>{confirm.hidden=true;button.hidden=false;button.focus();});
      yes.addEventListener('click',()=>update('cancel',booking.id));
      button.addEventListener('click',()=>{button.hidden=true;confirm.hidden=false;keep.focus();});
      confirm.append(prompt,keep,yes);card.append(button,confirm);
    }
    activities.append(card);
  }
}
update('view');
