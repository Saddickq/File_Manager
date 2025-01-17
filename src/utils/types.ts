export interface User {
    email: string;
    password: string;
}

export interface File {
    userId: string
    name: string;
    type: 'folder' | 'file' | 'image'
    parentId?: string;
    isPublic?: boolean;
    data?: string
    localPath?: string
}