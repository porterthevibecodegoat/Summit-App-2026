const status=document.querySelector('#staff-status'),error=document.querySelector('#staff-error'),refresh=document.querySelector('#refresh');
async function load(operation){
  refresh.disabled=true;error.hidden=true;status.textContent=operation?'Updating booking records…':'Loading bookings…';
  try{
    const response=await fetch('/api/staff/wellness-bookings',{method:operation?'POST':'GET',headers:operation?{'Content-Type':'application/json'}:{},cache:'no-store',...(operation?{body:JSON.stringify(operation)}:{})});
    const data=await response.json().catch(()=>null);if(!response.ok||!Array.isArray(data?.bookings))throw Error(data?.error||'Booking data is unavailable.');
    status.textContent=data.sendApproval==='approved'?'SMS sending has been approved.':'All SMS sending is on hold pending approval of the complete process and build.';
    const pending=document.querySelector('#pending-intakes');pending.replaceChildren();
    if(!data.pendingIntakes.length)pending.textContent='No pending saves.';
    for(const intake of data.pendingIntakes){const card=document.createElement('div');card.className='manage-card';const text=document.createElement('p');text.textContent=`${intake.activities} activities · received ${new Date(intake.createdAt).toLocaleString()}`;const button=document.createElement('button');button.type='button';button.textContent='Recover saved signup';button.addEventListener('click',()=>{button.disabled=true;load({action:'recover',intakeId:intake.id});});card.append(text,button);pending.append(card);}
    const capacities=document.querySelector('#capacity-summary');capacities.replaceChildren();
    for(const session of data.sessions){const p=document.createElement('p');const limit=session.capacity?.mode==='limited'?session.capacity.maxPlaces:session.capacity?.mode==='unlimited'?'Unlimited':'Not set';p.textContent=`${session.dayLabel} · ${session.time} · ${session.title}: ${session.registered} registered / ${limit} places; ${session.waitlisted} waiting`;capacities.append(p);}
    const bookings=document.querySelector('#staff-bookings');bookings.replaceChildren();
    for(const booking of data.bookings){const card=document.createElement('section');card.className='manage-card';const heading=document.createElement('h3');heading.textContent=`${booking.name} · ${booking.status}`;const activity=document.createElement('p');activity.textContent=`${booking.day} · ${booking.time} · ${booking.title}`;const contact=document.createElement('p');contact.textContent=[booking.email,booking.phone].filter(Boolean).join(' · ');const sms=document.createElement('p');sms.textContent=booking.smsEligible?'Eligible for reminder previews':'Held from reminders (check consent, source status and staff decisions)';card.append(heading,activity,contact,sms);
      if(booking.canCancel){const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel booking';const confirm=document.createElement('button');confirm.type='button';confirm.className='cancel-confirm';confirm.textContent='Confirm cancellation and release place';confirm.hidden=true;const requestId=crypto.randomUUID();cancel.addEventListener('click',()=>{confirm.hidden=!confirm.hidden;});confirm.addEventListener('click',()=>{confirm.disabled=true;load({action:'cancel',bookingId:booking.id,requestId});});card.append(cancel,confirm);}
      bookings.append(card);}
  }catch(cause){status.textContent='';error.textContent=cause.message||'Please retry.';error.hidden=false;}
  finally{refresh.disabled=false;for(const button of document.querySelectorAll('#pending-intakes button,#staff-bookings button'))button.disabled=false;}
}
refresh.addEventListener('click',()=>load());load();
