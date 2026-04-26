import { Navigate } from 'react-router';

export default function AdminOrganizationsRedirect() {
  return <Navigate to="organizations" replace />;
}
