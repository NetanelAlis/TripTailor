import axios from 'axios';

function getUserId() {
    // Retrieve user details from local storage
    const userDetails = localStorage.getItem('userDetails');
    if (!userDetails) {
        console.log('nothing in local storage');
        throw new Error('User details not found in local storage');
    }

    // Parse the user details
    const parsedUserDetails = JSON.parse(userDetails);
    console.log('getUserId: User details parsed:', parsedUserDetails);
    console.log('getUserId: Returning user ID:', parsedUserDetails.sub);

    return parsedUserDetails.sub;
}

export async function updateUserDetails(updateData) {
    console.log('updateUserDetails: Starting with update data:', updateData);
    const userId = getUserId();
    console.log('updateUserDetails: User ID:', userId);

    const requestData = {
        user_id: userId,
        ...updateData,
    };
    console.log('updateUserDetails: Request data:', requestData);
    console.log(
        'updateUserDetails: Lambda URL:',
        import.meta.env.VITE_UPDATE_USER_DETAILS_LAMBDA_URL
    );

    try {
        const response = await axios.post(
            import.meta.env.VITE_UPDATE_USER_DETAILS_LAMBDA_URL,
            requestData
        );
        console.log('updateUserDetails: Full response:', response);
        console.log('updateUserDetails: Response data:', response.data);
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
    console.log('fetchUserDetails: Starting');
    const userId = getUserId();
    console.log('fetchUserDetails: User ID:', userId);

    const requestData = {
        user_id: userId,
    };
    console.log('fetchUserDetails: Request data:', requestData);
    console.log(
        'fetchUserDetails: Lambda URL:',
        import.meta.env.VITE_FETCH_USER_DETAILS_LAMBDA_URL
    );

    try {
        const response = await axios.post(
            import.meta.env.VITE_FETCH_USER_DETAILS_LAMBDA_URL,
            requestData
        );
        console.log('fetchUserDetails: Full response:', response);
        console.log('fetchUserDetails: Response data:', response.data);
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
