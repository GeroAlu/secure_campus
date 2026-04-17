import { clerkClient } from '@clerk/nextjs/server'

export class GetStudentsListHandler {

    async handle(command: GetStudentsListQuery): Promise<GetStudentsListResponse> {
        const client = await clerkClient();
        
        let students: Student[] = [];
        try {
            const usersReq = await client.users.getUserList({ limit: 500 });
            students = usersReq.data.filter(user => {
                const role = user.publicMetadata?.role as string | undefined;
                return !role || role === 'Estudiante' || role === 'Alumno';
            }).map(user => ({
                id: user.id || '',
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin Nombre',
                email: user.emailAddresses[0]?.emailAddress || '',
                active: true,
            }));
        } catch (e) {
            console.error("Error fetching users from clerk", e);
        }

        const page = command.page || 1;
        const limit = command.limit || 10;
        
        const totalItems = students.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / limit));
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const paginatedList = students.slice(startIndex, endIndex);

        return { 
            list: paginatedList, 
            totalPages, 
            currentPage: page,
            totalItems
        }
    }
}

export interface GetStudentsListQuery {
    page?: number;
    limit?: number;
}

export interface GetStudentsListResponse {
    list: Student[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
}

export interface Student {
    id: string
    name: string
    email: string
    active: boolean
}