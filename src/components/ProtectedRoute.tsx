import { getAuth } from 'firebase/auth';
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
        return <Outlet />
    } else {
        return <Navigate to={"/login"} />
    }
}

export default ProtectedRoute