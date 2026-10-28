import { wellnessActivityCatalog, programId, type Activity } from './catalog';

// Rehearsals use their own isolated store and explicitly labelled activities.
// The live source cannot enable this setting or override a real activity.
export function testActivities(env: Partial<NodeJS.ProcessEnv>): ReadonlyMap<string, Activity> | undefined {
  if (!env.INTEGRATION_TEST_ACTIVITIES_JSON) return undefined;
  if (env.REMINDER_SOURCE_MODE !== 'test' || !/^nas-reminders-test-[a-z0-9-]+$/.test(env.INTEGRATION_TEST_STORE_PREFIX ?? '')) {
    throw new Error('Test activities require isolated test storage.');
  }
  const values: unknown = JSON.parse(env.INTEGRATION_TEST_ACTIVITIES_JSON);
  if (!Array.isArray(values) || !values.length || values.length > 4) throw new Error('Invalid test activities.');
  const result = new Map(wellnessActivityCatalog);
  for (const value of values) {
    if (!value || typeof value.activityId !== 'string' || !/^wellness-test-[a-z0-9-]+$/.test(value.activityId) || result.has(value.activityId) ||
        typeof value.title !== 'string' || !value.title.startsWith('TEST: ') || value.title.length > 100 ||
        typeof value.startsAt !== 'string' || !/Z$|[+-]\d\d:\d\d$/.test(value.startsAt) || !Number.isFinite(Date.parse(value.startsAt))) {
      throw new Error('Invalid test activity.');
    }
    result.set(value.activityId, { activityId:value.activityId, activityOccurrenceId:`${programId}:${value.activityId}`,
      title:value.title, startsAt:value.startsAt, endsAt:null, location:null, timingMode:'fixed-start' });
  }
  return result;
}
