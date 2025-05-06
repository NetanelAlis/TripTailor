import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import NavBar from '../../components/UI/nav-bar/NavBar';

export default function RootLayout() {
  const rawUserDetails = localStorage.getItem('userDetails');
  const [userDetails, setUserDetails] = useState(rawUserDetails);

  return (
    <div>
      <NavBar userDetails={userDetails} setUserDetails={setUserDetails} />
      <Outlet context={{ handleLogIn: () => setUserDetails(true) }} />
    </div>
  );
}
