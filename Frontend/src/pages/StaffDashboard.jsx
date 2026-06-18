import React from 'react'
import UpComingNotifications from '../components/UpComingNotifications'
import { useAuth } from '../context/AuthContext'
import LibrarianDashboard from './LibrarianDashboard';
import SchoolDashboard from './SchoolDashboard';
function StaffDashboard() {
   const { user } = useAuth();
  return (
    <div> 
      {/* <UpComingNotifications /> */}
      {user?.staffRole === "librarian" && <LibrarianDashboard />}
      {user?.staffRole === "administrator" && <SchoolDashboard />}
            

    </div>
  )
}

export default StaffDashboard
