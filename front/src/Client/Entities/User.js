export class User {
    static async me() {
        const userDetails = localStorage.getItem('userDetails');
        if (!userDetails) {
            throw new Error('User not authenticated');
        }

        try {
            const user = JSON.parse(userDetails);
            return user;
        } catch (error) {
            throw new Error('Invalid user data');
        }
    }

    static async login() {
        const userDetails = localStorage.getItem('userDetails');
        if (!userDetails) {
            window.location.href = '/';
            return;
        }

        return JSON.parse(userDetails);
    }

    static async logout() {
        localStorage.removeItem('userDetails');
        window.location.href = '/';
    }

    static isAuthenticated() {
        const userDetails = localStorage.getItem('userDetails');
        return !!userDetails;
    }
}
