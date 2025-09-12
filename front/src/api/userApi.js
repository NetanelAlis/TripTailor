import axios from 'axios';

function getUserId() {
    const userDetails = localStorage.getItem('userDetails');
    if (!userDetails) {
        throw new Error('User details not found in local storage');
    }

    const parsedUserDetails = JSON.parse(userDetails);
    return parsedUserDetails.sub;
}

export async function updateUserDetails(updateData) {
    const userId = getUserId();

    const requestData = {
        user_id: userId,
        ...updateData,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_UPDATE_USER_DETAILS_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('updateUserDetails: Error:', error);
        console.error(
            'updateUserDetails: Error response:',
            error.response?.data
        );
        throw error;
    }
}

export async function fetchUserDetails() {
    const userId = getUserId();

    const requestData = {
        user_id: userId,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_FETCH_USER_DETAILS_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('fetchUserDetails: Error:', error);
        console.error(
            'fetchUserDetails: Error response:',
            error.response?.data
        );
        throw error;
    }
}
