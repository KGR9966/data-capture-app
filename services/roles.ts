import type { CaptureItem } from "./items";
import type { Project, ProjectMember } from "./projects";

export type ProjectRole = "owner" | "admin" | "editor" | "viewer";

export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Ejer",
  admin: "Admin",
  editor: "Redaktør",
  viewer: "Se",
};

export function getProjectRole(
  project: Partial<Project> | null | undefined,
  userId: string | null | undefined,
  members: ProjectMember[],
  userEmail?: string | null
): ProjectRole | null {
  if (!project || !userId) return null;
  if (project.ownerId === userId) return "owner";

  const normalizedEmail = userEmail?.trim().toLowerCase() || null;

  // Match medlem-dokument på enten uid eller email.
  const member = members.find(
    (m) =>
      m.userId === userId ||
      (normalizedEmail && m.email?.trim().toLowerCase() === normalizedEmail)
  );
  if (member?.role) return member.role;

  const projectRole = project.roles?.[userId] as ProjectRole | undefined;
  if (projectRole) return projectRole;

  // Rolle kan også være gemt på email i roles-kortet.
  if (normalizedEmail) {
    const roleByEmail = project.roles?.[normalizedEmail] as ProjectRole | undefined;
    if (roleByEmail) return roleByEmail;

    // Email-inviterede medlemmer uden specifik rolle får editor.
    if (
      project.memberEmails?.some(
        (email) => email.trim().toLowerCase() === normalizedEmail
      )
    ) {
      return "editor";
    }
  }

  return null;
}

export function canManageProject(role: ProjectRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canInviteMembers(role: ProjectRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canAssignItems(role: ProjectRole | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canAssignOthers(role: ProjectRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canCreateItem(role: ProjectRole | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canComment(role: ProjectRole | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canEditItem(
  role: ProjectRole | null,
  item: CaptureItem,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  if (role === "owner" || role === "admin") return true;
  if (role === "editor") return item.createdBy === userId || item.assignedTo === userId;
  return false;
}

export function canDeleteItem(
  role: ProjectRole | null,
  item: CaptureItem,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  if (role === "owner" || role === "admin") return true;
  if (role === "editor") return item.createdBy === userId;
  return false;
}

export function canChangeMemberRole(
  role: ProjectRole | null,
  targetRole: ProjectRole
): boolean {
  if (role === "owner") return targetRole !== "owner";
  if (role === "admin") return targetRole === "editor" || targetRole === "viewer";
  return false;
}

export function canRemoveMember(
  role: ProjectRole | null,
  member: ProjectMember,
  project: Project,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  if (member.userId === project.ownerId) return false;
  if (role === "owner") return true;
  if (role === "admin" && member.role !== "owner" && member.role !== "admin") return true;
  return false;
}
