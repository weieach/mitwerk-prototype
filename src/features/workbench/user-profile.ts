/** Shared identity for the prototype, including newly created tasks and messages. */
export const userProfile = { firstName: 'User', lastName: 'Example' } as const;
export const userName = `${userProfile.firstName} ${userProfile.lastName}`;
export const userInitials = `${userProfile.firstName[0]}${userProfile.lastName[0]}`;
