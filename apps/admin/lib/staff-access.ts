export type StaffAuthIdentity = {
  id: string;
  email?: string;
  invited_at?: string;
};

export function canProvisionAdmin(identity: StaffAuthIdentity, hasExistingProfile: boolean) {
  return hasExistingProfile || Boolean(identity.invited_at);
}

export function createAdminProfile(identity: StaffAuthIdentity) {
  return {
    user_id: identity.id,
    display_name: displayNameFromEmail(identity.email),
    role: "ADMIN" as const,
    emergency_broadcast_enabled: true,
    updated_at: new Date().toISOString()
  };
}

function displayNameFromEmail(email: string | undefined) {
  const localPart = email?.split("@")[0]?.trim();
  return localPart || "Staff administrator";
}
