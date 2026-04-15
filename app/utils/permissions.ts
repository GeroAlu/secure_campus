export const ROLE_PERMISSIONS: Record<string, string[]> = {
    "Estudiante": [],
    "Auxiliar docente": ["view:student_details"],
    "Docente": ["view:student_details", "deactivate:students"],
    "Administrador": ["manage:roles", "view:student_details", "deactivate:students", "*"]
};

export function getPermissionsForRole(role?: string | null): string[] {
    const validRole = role || "Estudiante";
    return ROLE_PERMISSIONS[validRole] || [];
}
