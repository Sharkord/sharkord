import { useSelector } from 'react-redux';
import { roleByIdSelector, rolesSelector } from './selectors';

export const useRoleById = (roleId: number) =>
  useSelector((state) => roleByIdSelector(state, roleId));

export const useRoles = () => useSelector(rolesSelector);
