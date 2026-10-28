import {describe,it,expect} from 'vitest';
import {testActivities} from './test-activities';
import {buildWellnessAgenda as buildAgenda} from './agenda';
import {memorySubmissionStore} from '../staff/store';
import {planReminders} from './planner';
const fixture={activityId:'wellness-test-rehearsal',title:'TEST: Wellness rehearsal',startsAt:'2026-10-25T10:00:00-07:00'};
const settings={REMINDER_SOURCE_MODE:'test',INTEGRATION_TEST_STORE_PREFIX:'nas-reminders-test-rehearsal',INTEGRATION_TEST_ACTIVITIES_JSON:JSON.stringify([fixture])};
describe('isolated timed rehearsal',()=>{
  it('cannot enable test activities in the live source or an unisolated store',()=>{
    expect(()=>testActivities({...settings,REMINDER_SOURCE_MODE:'live'})).toThrow();
    expect(()=>testActivities({...settings,INTEGRATION_TEST_STORE_PREFIX:'staff-portal'})).toThrow();
    expect(testActivities({})).toBeUndefined();
  });
  it('cannot remap a real activity or omit the TEST label',()=>{
    for(const invalid of [{...fixture,activityId:'wellness-nov3-pilates-1'},{...fixture,title:'Wellness rehearsal'}]) {
      expect(()=>testActivities({...settings,INTEGRATION_TEST_ACTIVITIES_JSON:JSON.stringify([invalid])})).toThrow();
    }
  });
  it('uses the real previous-evening and one-hour calculations for a fictional activity',async()=>{
    const agenda=await buildAgenda(memorySubmissionStore({workshop:[{id:'test',source:'form',submittedAt:'2026-10-24T20:00:00Z',
      name:'Alex Example',phone:'+17025550100',email:'alex@example.com',category:'wellness',sessionId:fixture.activityId,
      sessionTitle:fixture.title,sessionDay:'',sessionTime:'',textConsent:true}]}),{activities:testActivities(settings)});
    const jobs=planReminders(agenda);
    expect(jobs.map(job=>job.dueAt)).toEqual(['2026-10-25T02:00:00.000Z','2026-10-25T16:00:00.000Z']);
    expect(jobs.every(job=>job.body.includes('TEST: '))).toBe(true);
  });
});
