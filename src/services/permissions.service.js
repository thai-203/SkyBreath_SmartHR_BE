export class PermissionsService {
    constructor(permissionsRepository) {
        this.permissionsRepository = permissionsRepository;
    }

    async findAll() {
        const permissions = await this.permissionsRepository.findAll();
        // Group permissions by module logic could go here if naming convention follows module:action
        // For now, return flat list. Ideally, we can parse 'USER:CREATE' -> Module: USER, Action: CREATE
        return permissions.map(p => {
            const parts = p.permissionCode.split(':');
            const module = parts.length > 1 ? parts[0] : 'GENERAL';
            return { ...p, module };
        });
    }
}
